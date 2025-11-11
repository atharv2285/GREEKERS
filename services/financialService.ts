import type { StockData, SummaryStats, OptionChain, Option, PortfolioPosition, PortfolioGreeks, VaRResult, HistoricalDataPoint, LiveStockData, Config, PnLScenario, Greeks, GammaHedgeSuggestion } from '../types';
import { OptionType } from '../types';

export class FinancialService {

  // --- Core Mathematical Utilities ---

  // Mulberry32: A simple, deterministic pseudo-random number generator.
  private mulberry32(a: number) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  }
  
  // Box-Muller transform: Generates a standard normal random number from uniform random numbers.
  private getNormal(rand1: () => number, rand2: () => number): number {
    let u = 0, v = 0;
    while(u === 0) u = rand1();
    while(v === 0) v = rand2();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
  }

  // Standard Normal Cumulative Distribution Function (CDF)
  public normCdf(x: number): number {
      return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  // Standard Normal Probability Density Function (PDF)
  public normPdf(x: number): number {
      return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
  }

  // Error function approximation
  private erf(x: number): number {
      const a1 =  0.254829592;
      const a2 = -0.284496736;
      const a3 =  1.421413741;
      const a4 = -1.453152027;
      const a5 =  1.061405429;
      const p  =  0.3275911;

      const sign = (x >= 0) ? 1 : -1;
      x = Math.abs(x);
      const t = 1.0 / (1.0 + p * x);
      const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
      return sign * y;
  }

  // --- Black-Scholes-Merton and Greeks (aligned with Python script) ---
  public bsm(
    S: number, K: number, T: number, sigma: number, r: number, optionType: OptionType
  ): { price: number; greeks: Greeks, d1: number, d2: number } {
    if (T <= 0 || sigma <= 0) {
        const fallbackPrice = optionType === OptionType.Call ? Math.max(0, S-K) : Math.max(0, K-S);
        const fallbackGreeks = {delta: (optionType === OptionType.Call ? (S>K ? 1 : 0) : (S<K ? -1 : 0)), gamma: 0, vega: 0, theta: 0, rho: 0};
        return {price: fallbackPrice, greeks: fallbackGreeks, d1: Infinity, d2: Infinity};
    }
    
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);

    const N_d1 = this.normCdf(d1);
    const N_d2 = this.normCdf(d2);
    const N_minus_d1 = this.normCdf(-d1);
    const N_minus_d2 = this.normCdf(-d2);
    const N_prime_d1 = this.normPdf(d1);

    let price: number, delta: number, theta: number, rho: number;

    if (optionType === OptionType.Call) {
      price = S * N_d1 - K * Math.exp(-r * T) * N_d2;
      delta = N_d1;
      theta = -(S * N_prime_d1 * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * N_d2;
      rho = K * T * Math.exp(-r * T) * N_d2;
    } else { // Put
      price = K * Math.exp(-r * T) * N_minus_d2 - S * N_minus_d1;
      delta = N_d1 - 1.0;
      theta = -(S * N_prime_d1 * sigma) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * N_minus_d2;
      rho = -K * T * Math.exp(-r * T) * N_minus_d2;
    }
    
    const gamma = N_prime_d1 / (S * sigma * Math.sqrt(T));
    const vega = S * N_prime_d1 * Math.sqrt(T);

    return { price, greeks: { delta, gamma, vega, theta, rho }, d1, d2 };
  }

  // --- Data Generation (Fallback Simulation) ---

  public simulateStockDataUsingGBM(ticker: string, startDateStr: string, endDateStr: string): StockData {
    const seed = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + new Date(startDateStr).getTime();
    const rand1 = this.mulberry32(seed);
    const rand2 = this.mulberry32(seed + 1);

    const basePrice = 200 + (seed % 300);
    const mu = 0.15 + (seed % 10) / 100;      // Annual drift
    const sigma = 0.20 + (seed % 20) / 100;   // Annual volatility
    const dt = 1 / 252; // Time step (1 trading day)

    const historicalData: HistoricalDataPoint[] = [];
    let currentPrice = basePrice;
    
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    let currentDate = new Date(startDate);

    while(currentDate <= endDate) {
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) { // Skip weekends
           historicalData.push({ date: currentDate.toISOString().split('T')[0], price: currentPrice });
           const Z = this.getNormal(rand1, rand2);
           currentPrice *= Math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * Z);
           currentPrice = Math.max(10, currentPrice);
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (historicalData.length === 0) { // Handle case where date range is only weekends
        historicalData.push({ date: endDateStr, price: basePrice });
    }

    return {
        ticker: `(Simulated) ${ticker}`,
        lastPrice: historicalData[historicalData.length - 1].price,
        historicalData
    };
  }

  // --- Live Data Fetching ---
  public async getStockData(ticker: string, startDateStr: string, endDateStr: string): Promise<StockData> {
      const safeTicker = encodeURIComponent(ticker.endsWith('.NS') ? ticker : `${ticker}.NS`);
      
      const url = `/api/yahoo?ticker=${safeTicker}&startDate=${startDateStr}&endDate=${endDateStr}`;
      
      try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API request failed with status: ${response.status}`);
        }
        const data = await response.json();
        
        const result = data?.chart?.result?.[0];
        if (!result || !result.timestamp || !result.indicators.quote[0].close) {
            throw new Error('Invalid data structure from Yahoo Finance API');
        }

        const historicalData: HistoricalDataPoint[] = [];
        for (let i = 0; i < result.timestamp.length; i++) {
            const price = result.indicators.quote[0].close[i];
            // Only include data points with a valid price
            if (price !== null && price > 0) {
                 historicalData.push({
                    date: new Date(result.timestamp[i] * 1000).toISOString().split('T')[0],
                    price: price
                });
            }
        }

        if (historicalData.length === 0) {
            throw new Error('No valid historical data points returned from API.');
        }

        return {
            ticker: ticker,
            lastPrice: historicalData[historicalData.length - 1].price,
            historicalData: historicalData,
        };

      } catch (error) {
          console.error(`API fetch failed for ${ticker}:`, error);
          // Fallback to simulation if the API call fails
          return this.simulateStockDataUsingGBM(ticker, startDateStr, endDateStr);
      }
  }


  public generateLiveStockData(ticker: string, lastPrice: number): LiveStockData {
     let seed = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + new Date().getDate();
     const random = this.mulberry32(seed);
     const volatility = 0.025;
     const change = lastPrice * volatility * (random() - 0.5);
     const open = lastPrice - change + (random() - 0.5) * lastPrice * 0.01;
     const high = Math.max(open, lastPrice) + random() * lastPrice * 0.015;
     const low = Math.min(open, lastPrice) - random() * lastPrice * 0.015;
     const previousClose = lastPrice / (1 + change / lastPrice);
     const volume = Math.floor(100000 + random() * 5000000);

     return { open, high, low, close: lastPrice, previousClose, volume: `${(volume/1_000_000).toFixed(2)}M` };
  }

  // --- Financial Calculations ---

  public calculateSummaryStatistics(prices: number[]): SummaryStats {
    const returns = prices.slice(1).map((p, i) => Math.log(p / prices[i]));
    const n = returns.length;
    if (n < 2) return { dailyLogReturns: [], annualizedVolatility: 0, skewness: 0, kurtosis: 0 };
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / n;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (n - 1));
    const annualizedVolatility = stdDev * Math.sqrt(252);

    const m3 = returns.reduce((sum, r) => sum + Math.pow(r - mean, 3), 0) / n;
    const skewness = m3 / Math.pow(stdDev, 3);
    
    const m4 = returns.reduce((sum, r) => sum + Math.pow(r - mean, 4), 0) / n;
    const kurtosis = m4 / Math.pow(stdDev, 4) - 3; // Excess kurtosis

    return { dailyLogReturns: returns, annualizedVolatility, skewness, kurtosis };
  }
  
  public generateOptionChain(currentPrice: number, histVolatility: number, riskFreeRate: number, existingStrikes: number[] = []): OptionChain {
    const chain: OptionChain = {};
    const maturities = [30, 60, 90];
    const strikeMultipliers = [0.95, 0.98, 1, 1.02, 1.05];
    
    const generatedStrikes = strikeMultipliers.map(m => Math.round(currentPrice * m));
    // Combine generated strikes with existing portfolio strikes, ensuring uniqueness and order
    const strikes = [...new Set([...generatedStrikes, ...existingStrikes])].sort((a,b) => a - b);
    
    const r = riskFreeRate / 100;

    maturities.forEach(maturity => {
        chain[maturity] = [];
        strikes.forEach(strike => {
            const moneyness = Math.log(strike / currentPrice);
            // Simulate a volatility smile/skew
            const iv = histVolatility * (1 + 0.2 * Math.pow(moneyness, 2) - 0.1 * moneyness);

            [OptionType.Call, OptionType.Put].forEach(type => {
                const T = maturity / 252;
                // Calculations using Implied Volatility (IV)
                const { price, greeks, d1, d2 } = this.bsm(currentPrice, strike, T, iv, r, type);
                // Calculations using Historical Volatility (HistVol)
                const { price: priceHistVol, greeks: greeksHistVol } = this.bsm(currentPrice, strike, T, histVolatility, r, type);
                
                chain[maturity].push({
                    id: `${strike}-${maturity}-${type}`, strike, maturity, type, 
                    bsmPrice: price, iv, greeks, d1, d2,
                    bsmPriceHistVol: priceHistVol,
                    greeksHistVol: greeksHistVol,
                });
            });
        });
    });
    return chain;
  }
  
  public calculatePortfolioGreeks(portfolio: PortfolioPosition[]): PortfolioGreeks {
    return portfolio.reduce((acc, pos) => {
        acc.delta += pos.quantity * pos.option.greeks.delta;
        acc.gamma += pos.quantity * pos.option.greeks.gamma;
        acc.vega += pos.quantity * pos.option.greeks.vega;
        acc.theta += pos.quantity * pos.option.greeks.theta;
        acc.rho += pos.quantity * pos.option.greeks.rho;
        return acc;
    }, { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 });
  }
  
  public calculatePortfolioValue(portfolio: PortfolioPosition[], lotSize: number): number {
    return portfolio.reduce((totalValue, position) => {
        return totalValue + position.quantity * position.option.bsmPrice * lotSize;
    }, 0);
  }

  public calculatePortfolioVaR(portfolio: PortfolioPosition[], stockPrices: number[], config: Config): VaRResult {
    if (portfolio.length === 0 || stockPrices.length < 2) {
      return { parametric95: 0, parametric99: 0, historical95: 0, historical99: 0 };
    }
    
    // Re-price portfolio for each historical day to get PV series
    const pvSeries = stockPrices.map(S_t => {
       return portfolio.reduce((totalValue, pos) => {
           const { strike, maturity, type, iv } = pos.option;
           const T = maturity / 252.0;
           const r = config.riskFreeRate / 100;
           const { price } = this.bsm(S_t, strike, T, iv, r, type);
           return totalValue + pos.quantity * price * config.lotSize;
       }, 0);
    });

    const pvReturns = pvSeries.slice(1).map((p, i) => (p - pvSeries[i]) / pvSeries[i]).filter(r => isFinite(r));
    if (pvReturns.length < 2) return { parametric95: 0, parametric99: 0, historical95: 0, historical99: 0 };

    const lastPortfolioValue = pvSeries[pvSeries.length-1];
    
    const returnsMean = pvReturns.reduce((s, r) => s + r, 0) / pvReturns.length;
    const returnsStd = Math.sqrt(pvReturns.reduce((s, r) => s + Math.pow(r - returnsMean, 2), 0) / (pvReturns.length - 1));

    const parametric95 = - (returnsMean + this.normCdf(0.05) * returnsStd) * lastPortfolioValue;
    const parametric99 = - (returnsMean + this.normCdf(0.01) * returnsStd) * lastPortfolioValue;

    pvReturns.sort((a, b) => a - b);
    const historical95 = - pvReturns[Math.floor(0.05 * pvReturns.length)] * lastPortfolioValue;
    const historical99 = - pvReturns[Math.floor(0.01 * pvReturns.length)] * lastPortfolioValue;

    return { parametric95, parametric99, historical95, historical99 };
  }

  public hedgePortfolio(portfolio: PortfolioPosition[], lotSize: number): { deltaHedgeShares: number } {
      const greeks = this.calculatePortfolioGreeks(portfolio);
      const sharesToHedge = -greeks.delta * lotSize;
      return { deltaHedgeShares: sharesToHedge };
  }

  public calculateGammaHedge(portfolio: PortfolioPosition[], optionChain: OptionChain): GammaHedgeSuggestion | null {
    if (portfolio.length === 0) return null;

    const portfolioGreeks = this.calculatePortfolioGreeks(portfolio);
    if (Math.abs(portfolioGreeks.gamma) < 1e-6) return null; // Already gamma neutral

    // Find a good hedging instrument: preferably a short-dated, ATM option for high gamma
    const allOptions = Object.values(optionChain).flat();
    const atmOption = allOptions
        .filter(o => o.maturity === 30) // Shortest maturity
        .sort((a, b) => Math.abs(a.greeks.gamma) - Math.abs(b.greeks.gamma))
        .pop();

    if (!atmOption) return null;

    const quantity = -portfolioGreeks.gamma / atmOption.greeks.gamma;
    const action = quantity > 0 ? 'Buy' : 'Sell';

    return {
        action,
        quantity: Math.abs(Math.round(quantity)),
        option: atmOption,
        message: `${action} ${Math.abs(Math.round(quantity))} lots of the ${atmOption.strike} ${atmOption.type} @ ${atmOption.maturity}d`
    };
  }

  public calculatePnLScenarios(portfolio: PortfolioPosition[], lastPrice: number, config: Config): PnLScenario[] {
    const scenarios = [-0.02, -0.01, 0.0, 0.01, 0.02];
    const r = config.riskFreeRate / 100;

    const currentValue = portfolio.reduce((sum, pos) => {
        return sum + pos.quantity * pos.option.bsmPrice;
    }, 0);

    const { deltaHedgeShares } = this.hedgePortfolio(portfolio, 1); // Per lot
    
    return scenarios.map(change => {
        const newPrice = lastPrice * (1 + change);
        const newValue = portfolio.reduce((sum, pos) => {
            const { strike, maturity, type, iv } = pos.option;
            const T = maturity / 252.0;
            const { price } = this.bsm(newPrice, strike, T, iv, r, type);
            return sum + pos.quantity * price;
        }, 0);
        
        const pnlUnhedged = (newValue - currentValue) * config.lotSize;
        const hedgePnL = deltaHedgeShares * (newPrice - lastPrice);
        const pnlDeltaHedged = pnlUnhedged + hedgePnL;

        return {
            scenario: `${(change * 100).toFixed(0)}%`,
            pnlUnhedged,
            pnlDeltaHedged
        };
    });
  }

  public exportDataToCSV(stockData: StockData, summaryStats: SummaryStats, optionChain: OptionChain, portfolio: PortfolioPosition[], config: Config): string {
      let csvContent = "";
      const addSection = (title: string, data: (string|number)[][]) => {
          csvContent += title + "\n";
          data.forEach(row => {
              csvContent += row.map(cell => `"${String(cell)}"`).join(",") + "\n";
          });
          csvContent += "\n";
      };

      addSection("Summary Statistics", [
        ["Metric", "Value"],
        ["Stock Ticker", stockData.ticker],
        ["Start Date", config.startDate],
        ["End Date", config.endDate],
        ["Last Price", stockData.lastPrice.toFixed(4)],
        ["Annualized Volatility", (summaryStats.annualizedVolatility).toFixed(6)],
        ["Skewness", summaryStats.skewness.toFixed(6)],
        ["Excess Kurtosis", summaryStats.kurtosis.toFixed(6)],
      ]);
      
      const pricesRows: (string|number)[][] = [["Date", "Close"]];
      stockData.historicalData.forEach(d => pricesRows.push([d.date, d.price.toFixed(4)]));
      addSection("Prices", pricesRows);
      
      const optionChainRows: (string|number)[][] = [["Strike", "Maturity_days", "Option", "BSM_Price_IV", "BSM_Price_histVol"]];
      Object.values(optionChain).flat().forEach(opt => optionChainRows.push([opt.strike, opt.maturity, opt.type, opt.bsmPrice.toFixed(6), opt.bsmPriceHistVol.toFixed(6)]));
      addSection("OptionPricing_BSM", optionChainRows);

      const greeksIVRows: (string|number)[][] = [["Strike", "Maturity_days", "Option", "Delta_IV", "Gamma_IV", "Vega_IV", "Theta_IV", "Rho_IV"]];
      Object.values(optionChain).flat().forEach(opt => greeksIVRows.push([opt.strike, opt.maturity, opt.type, opt.greeks.delta.toFixed(6), opt.greeks.gamma.toFixed(6), opt.greeks.vega.toFixed(6), opt.greeks.theta.toFixed(6), opt.greeks.rho.toFixed(6)]));
      addSection("Greeks_IV", greeksIVRows);
      
      const greeksHistRows: (string|number)[][] = [["Strike", "Maturity_days", "Option", "Delta_hist", "Gamma_hist", "Vega_hist", "Theta_hist", "Rho_hist"]];
      Object.values(optionChain).flat().forEach(opt => greeksHistRows.push([opt.strike, opt.maturity, opt.type, opt.greeksHistVol.delta.toFixed(6), opt.greeksHistVol.gamma.toFixed(6), opt.greeksHistVol.vega.toFixed(6), opt.greeksHistVol.theta.toFixed(6), opt.greeksHistVol.rho.toFixed(6)]));
      addSection("Greeks_HistVol", greeksHistRows);

      if (portfolio.length > 0) {
          const { deltaHedgeShares } = this.hedgePortfolio(portfolio, config.lotSize);
          const pnlScenarios = this.calculatePnLScenarios(portfolio, stockData.lastPrice, config);
          const stockPrices = stockData.historicalData.map(d => d.price);

          const unhedgedVaR = this.calculatePortfolioVaR(portfolio, stockPrices, config);
          const hedgePosition: PortfolioPosition = { quantity: deltaHedgeShares, option: { id: 'STOCK_HEDGE', strike: 0, maturity: 0, type: OptionType.Call, bsmPrice: stockData.lastPrice, iv: 0, d1:0, d2:0, greeks: { delta: 1, gamma: 0, vega: 0, theta: 0, rho: 0 }, bsmPriceHistVol: 0, greeksHistVol: {delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0}}};
          const hedgedVaR = this.calculatePortfolioVaR([...portfolio, hedgePosition], stockPrices, { ...config, lotSize: 1 });
          
          const portfolioRows: (string|number)[][] = [["Type", "Strike", "Qty", "DaysToExp", "Price", "ImpliedVol", "Delta", "Gamma", "Vega"]];
          portfolio.forEach(p => portfolioRows.push([p.option.type, p.option.strike.toString(), p.quantity.toString(), p.option.maturity.toString(), p.option.bsmPrice.toFixed(6), p.option.iv.toFixed(6), p.option.greeks.delta.toFixed(6), p.option.greeks.gamma.toFixed(6), p.option.greeks.vega.toFixed(6)]));
          addSection("Portfolio", portfolioRows);

          const pnlRows: (string|number)[][] = [["Scenario", "PnL_unhedged", "PnL_delta_hedged"]];
          pnlScenarios.forEach(s => pnlRows.push([s.scenario, s.pnlUnhedged.toFixed(4), s.pnlDeltaHedged.toFixed(4)]));
          addSection("PnL_Scenarios", pnlRows);

          addSection("VaR_Unhedged", [["Level", "ParametricVaR", "HistoricalVaR"], [95, unhedgedVaR.parametric95.toFixed(4), unhedgedVaR.historical95.toFixed(4)], [99, unhedgedVaR.parametric99.toFixed(4), unhedgedVaR.historical99.toFixed(4)]]);
          addSection("VaR_Hedged", [["Level", "ParametricVaR_hedged", "HistoricalVaR_hedged"], [95, hedgedVaR.parametric95.toFixed(4), hedgedVaR.historical95.toFixed(4)], [99, hedgedVaR.parametric99.toFixed(4), hedgedVaR.historical99.toFixed(4)]]);
      }
      return csvContent;
  }
}