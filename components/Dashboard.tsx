import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { StockData, SummaryStats, OptionChain, PortfolioPosition, Config, LiveStockData, GammaHedgeSuggestion, Option } from '../types';
import { FinancialService } from '../services/financialService';

import { StockSummary } from './StockSummary';
import { OptionChainTable } from './OptionChain';
import { PortfolioAnalysis } from './PortfolioAnalysis';
import { VolatilitySurface } from './VolatilitySurface';
import { ConfigPanel } from './ConfigPanel';
import { PnLScenarios } from './PnLScenarios';
import { GreeksAnalysis } from './GreeksAnalysis';

interface DashboardProps {
  stockTicker: string;
}

type Section = 'summary' | 'chain' | 'portfolio' | 'greeks' | 'pnl' | 'volatility';

const SectionButton: React.FC<{ label: string; section: Section; activeSection: Section; onClick: (section: Section) => void; }> = ({ label, section, activeSection, onClick }) => (
  <button
    onClick={() => onClick(section)}
    className={`px-4 py-2 text-sm sm:text-base font-semibold rounded-t-lg transition-colors duration-200 focus:outline-none ${activeSection === section
        ? 'bg-gray-800 border-b-2 border-cyan-400 text-cyan-400'
        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
      }`}
  >
    {label}
  </button>
);

export const Dashboard: React.FC<DashboardProps> = ({ stockTicker }) => {
  const getInitialEndDate = () => new Date().toISOString().split('T')[0];
  const getInitialStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 90);
    return date.toISOString().split('T')[0];
  };

  const [stockData, setStockData] = useState<StockData | null>(null);
  const [liveStockData, setLiveStockData] = useState<LiveStockData | null>(null);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [optionChain, setOptionChain] = useState<OptionChain | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>([]);
  const [gammaHedge, setGammaHedge] = useState<GammaHedgeSuggestion | null>(null);
  const [config, setConfig] = useState<Config>({
    riskFreeRate: 7,
    lotSize: 1,
    startDate: getInitialStartDate(),
    endDate: getInitialEndDate(),
  });

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('summary');

  const financialService = useMemo(() => new FinancialService(), []);

  const fetchData = useCallback(async (currentConfig: Config, existingPortfolio: PortfolioPosition[] = []) => {
    setLoading(true);
    setApiError(null);
    // Brief delay to give user feedback that something is happening
    await new Promise(resolve => setTimeout(resolve, 300));

    const existingStrikes = existingPortfolio.map(p => p.option.strike);

    try {
      const data = await financialService.getStockData(stockTicker, currentConfig.startDate, currentConfig.endDate);

      // Check if the returned data is from simulation (a simple heuristic)
      if (data.ticker !== stockTicker) { // The simulation service prepends "(Simulated)"
        setApiError(`Could not fetch live data for ${stockTicker}. Using a deterministic simulation as a fallback.`);
      }

      const liveData = financialService.generateLiveStockData(stockTicker, data.lastPrice);
      const stats = financialService.calculateSummaryStatistics(data.historicalData.map(d => d.price));

      // Use live option chain fetching with fallback to simulation
      let chain: OptionChain;
      try {
        chain = await financialService.getOptionChain(stockTicker, data.lastPrice, stats.annualizedVolatility, currentConfig.riskFreeRate);
      } catch (e) {
        console.warn("Failed to fetch live option chain, falling back to simulation", e);
        chain = financialService.simulateOptionChain(data.lastPrice, stats.annualizedVolatility, currentConfig.riskFreeRate, existingStrikes);
      }

      setStockData(data);
      setLiveStockData(liveData);
      setSummaryStats(stats);
      setOptionChain(chain);

      // Re-price portfolio if it exists
      if (existingPortfolio.length > 0 && chain) {
        const newPortfolio: PortfolioPosition[] = [];
        // FIX: `Object.values(chain)` is inferred as `unknown[]` because of the numeric indexer on `OptionChain`.
        // Cast to `Option[][]` to ensure correct type after flattening.
        const allNewOptions: Option[] = (Object.values(chain) as Option[][]).flat();
        existingPortfolio.forEach((pos: PortfolioPosition) => {
          const newOption = allNewOptions.find((opt: Option) => opt.id === pos.option.id);
          if (newOption) {
            newPortfolio.push({ option: newOption, quantity: pos.quantity });
          }
        });
        setPortfolio(newPortfolio);
      } else {
        setPortfolio([]);
      }
    } catch (error) {
      console.error("Critical error during data fetch:", error);
      setApiError("A critical error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [stockTicker, financialService]);

  // Initial fetch and refetch on ticker change ONLY.
  useEffect(() => {
    const newConfig = {
      riskFreeRate: 7,
      lotSize: 1,
      startDate: getInitialStartDate(),
      endDate: getInitialEndDate(),
    };
    setConfig(newConfig);
    fetchData(newConfig, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockTicker]); // `fetchData` is memoized and stable

  // Handles re-runs with new configs.
  const handleApplyConfig = useCallback(async (newConfig: Config) => {
    setConfig(newConfig);
    await fetchData(newConfig, portfolio);
  }, [fetchData, portfolio]);

  // Effect to calculate gamma hedge whenever the portfolio or chain changes.
  useEffect(() => {
    if (portfolio.length > 0 && optionChain) {
      const hedge = financialService.calculateGammaHedge(portfolio, optionChain);
      setGammaHedge(hedge);
    } else {
      setGammaHedge(null);
    }
  }, [portfolio, optionChain, financialService]);

  const handleDownload = () => {
    if (!stockData || !summaryStats || !optionChain) return;
    const csvContent = financialService.exportDataToCSV(stockData, summaryStats, optionChain, portfolio, config);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${stockTicker}_Options_Analysis_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-cyan-500"></div>
        <span className="ml-4 text-xl">Fetching data for {stockTicker}...</span>
      </div>
    );
  }

  if (!stockData || !summaryStats || !optionChain || !liveStockData) {
    return <div className="text-center text-red-400">Failed to load stock data. Please try again.</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-4 rounded-xl shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Analysis for <span className="text-cyan-400">{stockData.ticker}</span>
          </h2>
          <p className="text-sm text-gray-400">
            {apiError ? `Data from ${config.startDate} to ${config.endDate} (simulation)` : `Data from ${config.startDate} to ${config.endDate} (live)`}
          </p>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button onClick={handleDownload} className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75">
            Download
          </button>
        </div>
      </div>

      {apiError && (
        <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 text-sm rounded-lg p-3 text-center">
          {apiError}
        </div>
      )}

      <ConfigPanel config={config} onApplyChanges={handleApplyConfig} />

      <div className="border-b border-gray-700 flex space-x-1 sm:space-x-2 flex-wrap">
        <SectionButton label="Stock Summary" section="summary" activeSection={activeSection} onClick={setActiveSection} />
        <SectionButton label="Option Chain" section="chain" activeSection={activeSection} onClick={setActiveSection} />
        <SectionButton label="Portfolio Analysis" section="portfolio" activeSection={activeSection} onClick={setActiveSection} />
        <SectionButton label="Greeks & IV" section="greeks" activeSection={activeSection} onClick={setActiveSection} />
        <SectionButton label="PnL Scenarios" section="pnl" activeSection={activeSection} onClick={setActiveSection} />
        <SectionButton label="Volatility Surface" section="volatility" activeSection={activeSection} onClick={setActiveSection} />
      </div>

      <div className="bg-gray-800 p-4 sm:p-6 rounded-b-xl rounded-r-xl shadow-lg">
        {activeSection === 'summary' && <StockSummary stockData={stockData} liveStockData={liveStockData} summaryStats={summaryStats} />}
        {activeSection === 'chain' && <OptionChainTable optionChain={optionChain} portfolio={portfolio} setPortfolio={setPortfolio} financialService={financialService} config={config} stockData={stockData} />}
        {activeSection === 'portfolio' && <PortfolioAnalysis portfolio={portfolio} setPortfolio={setPortfolio} stockData={stockData} financialService={financialService} config={config} gammaHedge={gammaHedge} />}
        {activeSection === 'greeks' && <GreeksAnalysis optionChain={optionChain} portfolio={portfolio} gammaHedge={gammaHedge} />}
        {activeSection === 'pnl' && <PnLScenarios portfolio={portfolio} stockData={stockData} financialService={financialService} config={config} />}
        {activeSection === 'volatility' && <VolatilitySurface optionChain={optionChain} />}
      </div>
    </div>
  );
};