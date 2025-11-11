import React from 'react';
import type { OptionChain, PortfolioPosition, GammaHedgeSuggestion, Option } from '../types';

interface GreeksAnalysisProps {
  optionChain: OptionChain;
  portfolio: PortfolioPosition[];
  gammaHedge: GammaHedgeSuggestion | null;
}

const GreeksTable: React.FC<{ options: Option[], title: string, useHistVol: boolean }> = ({ options, title, useHistVol }) => (
    <div>
        <h4 className="text-lg font-semibold mb-2">{title}</h4>
        <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-300 uppercase bg-gray-700 sticky top-0">
                    <tr>
                        <th className="px-4 py-2">Option</th>
                        <th className="px-4 py-2 text-right">Price</th>
                        {!useHistVol && <th className="px-4 py-2 text-right">IV</th>}
                        <th className="px-4 py-2 text-right">Delta</th>
                        <th className="px-4 py-2 text-right">Gamma</th>
                        <th className="px-4 py-2 text-right">Vega</th>
                        <th className="px-4 py-2 text-right">Theta</th>
                        <th className="px-4 py-2 text-right">Rho</th>
                    </tr>
                </thead>
                <tbody className="bg-gray-800">
                    {options.map(opt => {
                        const price = useHistVol ? opt.bsmPriceHistVol : opt.bsmPrice;
                        const greeks = useHistVol ? opt.greeksHistVol : opt.greeks;
                        return (
                            <tr key={opt.id} className="border-b border-gray-700">
                                <td className="px-4 py-2 whitespace-nowrap">{`${opt.strike} ${opt.type} @ ${opt.maturity}d`}</td>
                                <td className="px-4 py-2 text-right font-mono">{price.toFixed(3)}</td>
                                {!useHistVol && <td className="px-4 py-2 text-right font-mono">{(opt.iv * 100).toFixed(2)}%</td>}
                                <td className="px-4 py-2 text-right font-mono">{greeks.delta.toFixed(3)}</td>
                                <td className="px-4 py-2 text-right font-mono">{greeks.gamma.toFixed(4)}</td>
                                <td className="px-4 py-2 text-right font-mono">{greeks.vega.toFixed(3)}</td>
                                <td className="px-4 py-2 text-right font-mono">{greeks.theta.toFixed(3)}</td>
                                <td className="px-4 py-2 text-right font-mono">{greeks.rho.toFixed(3)}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    </div>
);

export const GreeksAnalysis: React.FC<GreeksAnalysisProps> = ({ optionChain, portfolio, gammaHedge }) => {
  // Fix: Explicitly type 'a' and 'b' as 'Option' to resolve type inference issue where they were being treated as 'unknown'.
  const allOptions = React.useMemo(() => Object.values(optionChain).flat().sort((a: Option, b: Option) => a.maturity - b.maturity || a.strike - b.strike), [optionChain]);
  
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">Greeks & Volatility Analysis</h3>
      
      {portfolio.length > 0 && gammaHedge && (
        <div>
            <h4 className="text-lg font-semibold mb-2">Gamma Hedging</h4>
            <div className="bg-gray-700 p-4 rounded-lg text-sm">
                <p className="text-gray-300">To neutralize your portfolio's gamma exposure, the following trade is suggested:</p>
                <p className="text-cyan-400 font-bold text-base mt-2">{gammaHedge.message}</p>
                <div className="text-xs text-gray-400 mt-2 grid grid-cols-2 gap-x-4">
                    <span>This trade is based on an option with high gamma to be capital efficient.</span>
                    <span>Gamma hedging protects against large price moves, complementing a delta hedge.</span>
                </div>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GreeksTable options={allOptions} title="Greeks using Historical Volatility" useHistVol={true} />
        <GreeksTable options={allOptions} title="Greeks using Implied Volatility (IV)" useHistVol={false} />
      </div>

    </div>
  );
};
