import React, { useMemo, useState } from 'react';
import type { PortfolioPosition, StockData, VaRResult, Config, GammaHedgeSuggestion } from '../types';
import { OptionType } from '../types';
import type { FinancialService } from '../services/financialService';

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const DetailsModal: React.FC<DetailsModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-4xl p-6 m-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-4">
          <h2 className="text-2xl font-bold text-cyan-400">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl font-light" aria-label="Close modal">&times;</button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const GreekPill: React.FC<{ name: string; value: number }> = ({ name, value }) => (
    <div className="flex justify-between items-center text-sm bg-gray-700 px-3 py-1 rounded-full">
        <span className="font-semibold text-gray-300">{name}</span>
        <span className={`font-bold ml-2 ${value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-gray-300'}`}>
            {value.toFixed(3)}
        </span>
    </div>
);

const VaRTable: React.FC<{ title: string; varData: VaRResult | null }> = ({ title, varData }) => (
  <div>
    <h4 className="text-md font-bold mb-2 text-cyan-400">{title}</h4>
    {varData ? (
      <table className="w-full text-sm">
        <tbody>
          <tr className="border-b border-gray-700">
            <td className="py-1 text-gray-300">Parametric 95%</td>
            <td className="py-1 text-right font-mono text-red-400">₹{varData.parametric95.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
          </tr>
          <tr className="border-b border-gray-700">
            <td className="py-1 text-gray-300">Parametric 99%</td>
            <td className="py-1 text-right font-mono text-red-400">₹{varData.parametric99.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
          </tr>
          <tr className="border-b border-gray-700">
            <td className="py-1 text-gray-300">Historical 95%</td>
            <td className="py-1 text-right font-mono text-red-400">₹{varData.historical95.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td className="py-1 text-gray-300">Historical 99%</td>
            <td className="py-1 text-right font-mono text-red-400">₹{varData.historical99.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
    ) : (
       <p className="text-gray-500 text-sm">N/A for empty portfolio.</p>
    )}
  </div>
);

const HedgingStrategyCard: React.FC<{deltaHedgeShares: number; gammaHedge: GammaHedgeSuggestion | null; stockTicker: string;}> = ({deltaHedgeShares, gammaHedge, stockTicker}) => {
    return (
        <div className="space-y-3">
            <div className="flex items-center space-x-2 border-b border-gray-700 pb-2">
                <h4 className="text-lg font-semibold">Hedging Strategy</h4>
                <div className="group relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="absolute bottom-full mb-2 w-72 bg-gray-900 text-gray-300 text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg border border-gray-600 z-10 pointer-events-none">
                        <p className="font-bold mb-1 text-white">Why Hedge?</p>
                        <p><strong className="text-cyan-400">Delta Hedging:</strong> Aims to make a portfolio's value insensitive to small changes in the underlying stock price by holding an offsetting position in the stock itself.</p>
                        <p className="mt-2"><strong className="text-cyan-400">Gamma Hedging:</strong> Aims to make the portfolio's delta insensitive to changes in the stock price, protecting against larger price moves.</p>
                    </div>
                </div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg space-y-4">
                {/* Delta Hedge */}
                <div>
                    <h5 className="font-semibold text-gray-300 mb-1">Delta Hedging</h5>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Action</span>
                        <span className={`font-bold ${deltaHedgeShares >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {deltaHedgeShares >= 0 ? "Buy" : "Sell"}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-gray-400">Quantity</span>
                        <span className="font-mono text-white">{Math.abs(deltaHedgeShares).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-gray-400">Instrument</span>
                        <span className="font-mono text-white">{stockTicker} Shares</span>
                    </div>
                </div>

                {/* Gamma Hedge */}
                {gammaHedge && (
                    <div className="border-t border-gray-600 pt-3">
                         <h5 className="font-semibold text-gray-300 mb-1">Gamma Hedging</h5>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400">Action</span>
                            <span className={`font-bold ${gammaHedge.action === 'Buy' ? 'text-green-400' : 'text-red-400'}`}>
                                {gammaHedge.action}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                            <span className="text-gray-400">Quantity</span>
                            <span className="font-mono text-white">{gammaHedge.quantity} lots</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                            <span className="text-gray-400">Instrument</span>
                            <span className="font-mono text-white">{`${gammaHedge.option.strike} ${gammaHedge.option.type} @ ${gammaHedge.option.maturity}d`}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface PortfolioAnalysisProps {
  portfolio: PortfolioPosition[];
  setPortfolio: React.Dispatch<React.SetStateAction<PortfolioPosition[]>>;
  stockData: StockData;
  financialService: FinancialService;
  config: Config;
  gammaHedge: GammaHedgeSuggestion | null;
}

export const PortfolioAnalysis: React.FC<PortfolioAnalysisProps> = ({ portfolio, setPortfolio, stockData, financialService, config, gammaHedge }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { portfolioGreeks, unhedgedVaR, hedgedVaR, deltaHedgeShares, portfolioValue } = useMemo(() => {
    if (portfolio.length === 0) {
      return { portfolioGreeks: null, unhedgedVaR: null, hedgedVaR: null, deltaHedgeShares: 0, portfolioValue: 0 };
    }
    const greeks = financialService.calculatePortfolioGreeks(portfolio);
    const value = financialService.calculatePortfolioValue(portfolio, config.lotSize);
    const stockPrices = stockData.historicalData.map(d => d.price);
    
    const uVaR = financialService.calculatePortfolioVaR(portfolio, stockPrices, config);
    
    const { deltaHedgeShares } = financialService.hedgePortfolio(portfolio, config.lotSize);
    
    const hedgePosition: PortfolioPosition = {
        quantity: deltaHedgeShares,
        option: {
            id: 'STOCK_HEDGE', strike: 0, maturity: 0, type: OptionType.Call, 
            bsmPrice: stockData.lastPrice, iv: 0, d1:0, d2:0,
            greeks: { delta: 1, gamma: 0, vega: 0, theta: 0, rho: 0 },
            bsmPriceHistVol: stockData.lastPrice,
            greeksHistVol: { delta: 1, gamma: 0, vega: 0, theta: 0, rho: 0 },
        }
    };
    
    const hedgedVaRConfig = { ...config, lotSize: 1 };
    const hVaR = financialService.calculatePortfolioVaR([...portfolio, hedgePosition], stockPrices, hedgedVaRConfig);

    return { portfolioGreeks: greeks, unhedgedVaR: uVaR, hedgedVaR: hVaR, deltaHedgeShares, portfolioValue: value };
  }, [portfolio, financialService, stockData, config]);
  
  const handleRemovePosition = (optionId: string) => {
    setPortfolio(prev => prev.filter(p => p.option.id !== optionId));
  };

  return (
    <>
      <DetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Portfolio Greeks Calculation">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-300 uppercase bg-gray-700">
            <tr>
              <th className="px-4 py-2">Position</th>
              <th className="px-4 py-2 text-right">Qty (Lots)</th>
              <th className="px-4 py-2 text-right">Total Delta</th>
              <th className="px-4 py-2 text-right">Total Gamma</th>
              <th className="px-4 py-2 text-right">Total Vega</th>
              <th className="px-4 py-2 text-right">Total Theta</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.map(({ option, quantity }) => (
              <tr key={option.id} className="border-b border-gray-700">
                <td className="px-4 py-2">{`${option.strike} ${option.type} @ ${option.maturity}d`}</td>
                <td className={`px-4 py-2 text-right font-bold ${quantity > 0 ? 'text-green-400' : 'text-red-400'}`}>{quantity}</td>
                <td className="px-4 py-2 text-right font-mono">{(option.greeks.delta * quantity).toFixed(3)}</td>
                <td className="px-4 py-2 text-right font-mono">{(option.greeks.gamma * quantity).toFixed(3)}</td>
                <td className="px-4 py-2 text-right font-mono">{(option.greeks.vega * quantity).toFixed(3)}</td>
                <td className="px-4 py-2 text-right font-mono">{(option.greeks.theta * quantity).toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
           {portfolioGreeks && (
            <tfoot className="text-white font-bold bg-gray-700">
                <tr>
                    <td className="px-4 py-2">Total (per lot)</td>
                    <td className="px-4 py-2 text-right"></td>
                    <td className="px-4 py-2 text-right font-mono">{portfolioGreeks.delta.toFixed(3)}</td>
                    <td className="px-4 py-2 text-right font-mono">{portfolioGreeks.gamma.toFixed(3)}</td>
                    <td className="px-4 py-2 text-right font-mono">{portfolioGreeks.vega.toFixed(3)}</td>
                    <td className="px-4 py-2 text-right font-mono">{portfolioGreeks.theta.toFixed(3)}</td>
                </tr>
            </tfoot>
           )}
        </table>
      </DetailsModal>

      <div className="space-y-6">
        <div className="space-y-3">
          <h4 className="text-lg font-semibold border-b border-gray-700 pb-2">Composition</h4>
          {portfolio.length === 0 ? (
            <p className="text-gray-500 italic text-center py-4">Add options from the chain to build your portfolio.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {portfolio.map(({ option, quantity }) => (
                <div key={option.id} className="flex items-center justify-between bg-gray-700 p-2 rounded-md">
                  <div>
                    <span className={`font-bold ${quantity > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {quantity > 0 ? `Long ${quantity}` : `Short ${-quantity}`}
                    </span>
                    <span className="ml-2 text-gray-300">{`${option.strike} ${option.type} @ ${option.maturity}d`}</span>
                  </div>
                  <button onClick={() => handleRemovePosition(option.id)} className="text-gray-500 hover:text-red-400" aria-label={`Remove ${option.id} from portfolio`}>
                    &#x2715;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {portfolio.length > 0 && portfolioValue !== null && (
             <div className="bg-gray-700 p-4 rounded-lg text-center">
                 <p className="text-md text-gray-300">Total Portfolio Value</p>
                 <p className={`text-3xl font-bold ${portfolioValue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ₹{portfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 </p>
             </div>
        )}

        {portfolioGreeks && (
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-gray-700 pb-2">
               <h4 className="text-lg font-semibold">Portfolio Greeks (per lot)</h4>
               <button onClick={() => setIsModalOpen(true)} className="text-sm text-cyan-400 hover:text-cyan-300">Show Calculations</button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              <GreekPill name="Δ Delta" value={portfolioGreeks.delta} />
              <GreekPill name="Γ Gamma" value={portfolioGreeks.gamma} />
              <GreekPill name="V Vega" value={portfolioGreeks.vega} />
              <GreekPill name="Θ Theta" value={portfolioGreeks.theta} />
              <GreekPill name="ρ Rho" value={portfolioGreeks.rho} />
            </div>
          </div>
        )}

        {portfolio.length > 0 && (
          <HedgingStrategyCard 
            deltaHedgeShares={deltaHedgeShares}
            gammaHedge={gammaHedge}
            stockTicker={stockData.ticker}
          />
        )}
        
        <div className="space-y-4">
          <h4 className="text-lg font-semibold border-b border-gray-700 pb-2">Value-at-Risk (VaR) - 1 Day</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <VaRTable title="Unhedged Portfolio" varData={unhedgedVaR} />
            <VaRTable title="Delta-Hedged Portfolio" varData={hedgedVaR} />
          </div>
        </div>
      </div>
    </>
  );
};