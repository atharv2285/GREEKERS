export interface HistoricalDataPoint {
  date: string;
  price: number;
}

export interface StockData {
  ticker: string;
  lastPrice: number;
  historicalData: HistoricalDataPoint[];
}

export interface LiveStockData {
  open: number;
  high: number;
  low: number;
  close: number;
  previousClose: number;
  volume: string;
}

export interface Config {
  riskFreeRate: number; // as a percentage, e.g., 7 for 7%
  lotSize: number;
  startDate: string;
  endDate: string;
}

export interface SummaryStats {
  dailyLogReturns: number[];
  annualizedVolatility: number;
  skewness: number;
  kurtosis: number;
}

export interface Greeks {
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
}

export enum OptionType {
  Call = 'Call',
  Put = 'Put',
}

export interface Option {
  id: string;
  strike: number;
  maturity: number; // in days
  type: OptionType;
  bsmPrice: number; // Based on IV
  iv: number;
  greeks: Greeks; // Based on IV
  // For detailed calculation view
  d1: number;
  d2: number;
  // For comparison
  bsmPriceHistVol: number;
  greeksHistVol: Greeks;
}

export interface OptionChain {
  [maturity: number]: Option[];
}

export interface PortfolioPosition {
  option: Option;
  quantity: number; // positive for long, negative for short
}

export interface PortfolioGreeks {
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
}

export interface VaRResult {
  parametric95: number;
  parametric99: number;
  historical95: number;
  historical99: number;
}

export interface PnLScenario {
    scenario: string;
    pnlUnhedged: number;
    pnlDeltaHedged: number;
}

export interface GammaHedgeSuggestion {
  action: 'Buy' | 'Sell';
  quantity: number;
  option: Option;
  message: string;
}