
import React, { useState, useMemo, useEffect } from 'react';
import type { OptionChain, Option, PortfolioPosition, Config, StockData } from '../types';
import { OptionType } from '../types';
import type { FinancialService } from '../services/financialService';

interface OptionChainTableProps {
  optionChain: OptionChain;
  portfolio: PortfolioPosition[];
  setPortfolio: React.Dispatch<React.SetStateAction<PortfolioPosition[]>>;
  financialService: FinancialService;
  config: Config;
  stockData: StockData;
}

const DetailsModal: React.FC<{ isOpen: boolean; onClose: () => void; option: Option | null; stockPrice: number; config: Config}> = ({ isOpen, onClose, option, stockPrice, config }) => {
  if (!isOpen || !option) return null;
  
  const { strike, maturity, type, iv, d1, d2 } = option;
  const r = config.riskFreeRate / 100;
  const T = maturity / 252; // Using 252 trading days

  // Local helper functions for normCdf as it's not exposed from the service class
  const erf = (x: number): number => {
      const a1 =  0.254829592, a2 = -0.284496736, a3 =  1.421413741, a4 = -1.453152027, a5 =  1.061405429, p  =  0.3275911;
      const sign = (x >= 0) ? 1 : -1;
      x = Math.abs(x);
      const t = 1.0 / (1.0 + p * x);
      const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
      return sign * y;
  }
  const normCdf = (x: number): number => 0.5 * (1 + erf(x / Math.sqrt(2)));

  const N_d1 = normCdf(d1);
  const N_d2 = normCdf(d2);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl p-6 m-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-4">
          <h2 className="text-2xl font-bold text-cyan-400">BSM Calculation Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl font-light">&times;</button>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">{strike} {type} @ {maturity}d</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Stock Price (S)</span> <span className="font-mono">{stockPrice.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Strike Price (K)</span> <span className="font-mono">{strike.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Time to Maturity (T)</span> <span className="font-mono">{T.toFixed(4)} years</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Risk-Free Rate (r)</span> <span className="font-mono">{(r * 100).toFixed(2)}%</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Implied Volatility (σ)</span> <span className="font-mono">{(iv * 100).toFixed(2)}%</span></div>
            <div className="flex justify-between border-t border-gray-700 mt-2 pt-2 col-span-2"><span className="text-gray-400">d1</span> <span className="font-mono">{d1.toFixed(6)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">d2</span> <span className="font-mono">{d2.toFixed(6)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">N(d1)</span> <span className="font-mono">{N_d1.toFixed(6)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">N(d2)</span> <span className="font-mono">{N_d2.toFixed(6)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuantityControl: React.FC<{
    option: Option;
    quantity: number;
    onUpdateQuantity: (option: Option, change: number) => void;
}> = ({ option, quantity, onUpdateQuantity }) => (
    <div className="flex items-center justify-center space-x-2">
        <button onClick={() => onUpdateQuantity(option, -1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 text-lg font-bold transition-colors">-</button>
        <span className={`font-bold w-8 text-center text-lg ${quantity > 0 ? 'text-green-400' : quantity < 0 ? 'text-red-400' : 'text-gray-300'}`}>{quantity}</span>
        <button onClick={() => onUpdateQuantity(option, 1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/40 text-lg font-bold transition-colors">+</button>
    </div>
);


export const OptionChainTable: React.FC<OptionChainTableProps> = ({ optionChain, portfolio, setPortfolio, financialService, config, stockData }) => {
  const maturities = useMemo(() => Object.keys(optionChain).map(Number).sort((a, b) => a - b), [optionChain]);
  // FIX: Allow selectedMaturity to be undefined if maturities array is empty on initialization.
  const [selectedMaturity, setSelectedMaturity] = useState<number | undefined>(maturities[0]);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);

  useEffect(() => {
    // FIX: Handle undefined selectedMaturity and reset to the first maturity if the chain changes or on initial load.
    if(maturities.length > 0 && (selectedMaturity === undefined || maturities.indexOf(selectedMaturity) === -1)) {
        setSelectedMaturity(maturities[0]);
    }
  }, [maturities, selectedMaturity]);

  const tableData = useMemo(() => {
    if (!selectedMaturity || !optionChain[selectedMaturity]) return [];
    
    const optionsForMaturity = optionChain[selectedMaturity];
    // FIX: Explicitly type sort callback parameters to prevent type inference issues.
    const strikes = [...new Set(optionsForMaturity.map(o => o.strike))].sort((a: number, b: number) => a - b);
    
    return strikes.map(strike => ({
      strike,
      call: optionsForMaturity.find(o => o.strike === strike && o.type === OptionType.Call),
      put: optionsForMaturity.find(o => o.strike === strike && o.type === OptionType.Put)
    }));
  }, [selectedMaturity, optionChain]);

  const handleUpdateQuantity = (option: Option, change: number) => {
    setPortfolio(prevPortfolio => {
      const existingPosition = prevPortfolio.find(p => p.option.id === option.id);
      if (existingPosition) {
        const newQuantity = existingPosition.quantity + change;
        if (newQuantity === 0) {
          return prevPortfolio.filter(p => p.option.id !== option.id);
        } else {
          return prevPortfolio.map(p => 
            p.option.id === option.id ? { ...p, quantity: newQuantity } : p
          );
        }
      } else if (change !== 0) {
          return [...prevPortfolio, { option, quantity: change }];
      }
      return prevPortfolio;
    });
  };
  
  const getPositionQuantity = (option: Option | undefined) => {
    if (!option) return 0;
    const position = portfolio.find(p => p.option.id === option.id);
    return position ? position.quantity : 0;
  };


  return (
    <>
      <DetailsModal isOpen={!!selectedOption} onClose={() => setSelectedOption(null)} option={selectedOption} stockPrice={stockData.lastPrice} config={config} />
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold mb-3">Select Maturity</h2>
          <div className="flex space-x-2 border-b border-gray-700 pb-2 flex-wrap">
            {maturities.map(maturity => (
              <button 
                key={maturity} 
                onClick={() => setSelectedMaturity(maturity)}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${selectedMaturity === maturity ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
              >
                {maturity} Days
              </button>
            ))}
          </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-center">
                <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
                    <tr>
                        <th colSpan={6} className="px-4 py-2 text-left text-cyan-400 text-base">CALLS</th>
                        <th className="px-2 py-2">Strike</th>
                        <th colSpan={6} className="px-4 py-2 text-right text-cyan-400 text-base">PUTS</th>
                    </tr>
                    <tr>
                        <th className="px-4 py-2 text-center">Qty</th>
                        <th className="px-4 py-2 text-right">Price</th>
                        <th className="px-4 py-2 text-right">IV</th>
                        <th className="px-4 py-2 text-right">Delta</th>
                        <th className="px-4 py-2 text-right">Gamma</th>
                        <th className="px-4 py-2 text-right">Vega</th>
                        
                        <th className="px-2 py-2 bg-gray-900"></th>

                        <th className="px-4 py-2 text-right">Price</th>
                        <th className="px-4 py-2 text-right">IV</th>
                        <th className="px-4 py-2 text-right">Delta</th>
                        <th className="px-4 py-2 text-right">Gamma</th>
                        <th className="px-4 py-2 text-right">Vega</th>
                        <th className="px-4 py-2 text-center">Qty</th>
                    </tr>
                </thead>
                <tbody>
                    {tableData.map(({ strike, call, put }) => (
                         <tr key={strike} className="border-b border-gray-700 hover:bg-gray-700/30">
                            {call ? (
                                <>
                                    <td className="px-2 py-2"><QuantityControl option={call} quantity={getPositionQuantity(call)} onUpdateQuantity={handleUpdateQuantity} /></td>
                                    <td className="px-4 py-2 text-right font-mono">{call.bsmPrice.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right font-mono">{(call.iv * 100).toFixed(2)}%</td>
                                    <td className="px-4 py-2 text-right font-mono">{call.greeks.delta.toFixed(3)}</td>
                                    <td className="px-4 py-2 text-right font-mono">{call.greeks.gamma.toFixed(3)}</td>
                                    <td className="px-4 py-2 text-right font-mono">{call.greeks.vega.toFixed(3)}</td>
                                </>
                            ) : <td colSpan={6}></td>}

                            <td className="px-2 py-2 font-semibold bg-gray-900">
                                <button onClick={() => setSelectedOption(call || put || null)} className="text-cyan-400 hover:text-cyan-300 underline" title="Show Calculation Details">
                                  {strike}
                                </button>
                            </td>

                            {put ? (
                                <>
                                    <td className="px-4 py-2 text-right font-mono">{put.bsmPrice.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right font-mono">{(put.iv * 100).toFixed(2)}%</td>
                                    <td className="px-4 py-2 text-right font-mono">{put.greeks.delta.toFixed(3)}</td>
                                    <td className="px-4 py-2 text-right font-mono">{put.greeks.gamma.toFixed(3)}</td>
                                    <td className="px-4 py-2 text-right font-mono">{put.greeks.vega.toFixed(3)}</td>
                                    <td className="px-2 py-2"><QuantityControl option={put} quantity={getPositionQuantity(put)} onUpdateQuantity={handleUpdateQuantity} /></td>
                                </>
                            ) : <td colSpan={6}></td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </>
  );
};
