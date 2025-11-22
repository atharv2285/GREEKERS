import React, { useState, useMemo } from 'react';
import { Strategy, StrategyType, OptionChain, StockData } from '../types';
import { FinancialService } from '../services/financialService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface StrategyComparisonProps {
    stockData: StockData;
    optionChain: OptionChain;
    financialService: FinancialService;
}

export const StrategyComparison: React.FC<StrategyComparisonProps> = ({ stockData, optionChain, financialService }) => {
    const [selectedStrategy1, setSelectedStrategy1] = useState<StrategyType>(StrategyType.Straddle);
    const [selectedStrategy2, setSelectedStrategy2] = useState<StrategyType | null>(null);
    const [isCompareMode, setIsCompareMode] = useState(false);

    const strategies = Object.values(StrategyType);

    const strategy1 = useMemo(() => {
        return financialService.generateStrategy(selectedStrategy1, stockData.lastPrice, optionChain);
    }, [selectedStrategy1, stockData.lastPrice, optionChain, financialService]);

    const strategy2 = useMemo(() => {
        if (!selectedStrategy2) return null;
        return financialService.generateStrategy(selectedStrategy2, stockData.lastPrice, optionChain);
    }, [selectedStrategy2, stockData.lastPrice, optionChain, financialService]);

    const renderStrategyCard = (strategy: Strategy | null, title: string) => {
        if (!strategy) return <div className="text-gray-500 italic">Strategy not available for current data</div>;

        return (
            <div className="bg-gray-700 p-6 rounded-xl shadow-lg border border-gray-600">
                <h3 className="text-xl font-bold text-cyan-400 mb-2">{title}: {strategy.name}</h3>
                <p className="text-sm text-gray-300 mb-4">{strategy.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-800 p-3 rounded-lg">
                        <span className="block text-xs text-gray-400">Net Cost/Credit</span>
                        <span className={`text-lg font-semibold ${strategy.cost > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {strategy.cost > 0 ? `Debit $${strategy.cost.toFixed(2)}` : `Credit $${Math.abs(strategy.cost).toFixed(2)}`}
                        </span>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg">
                        <span className="block text-xs text-gray-400">Max Profit</span>
                        <span className="text-lg font-semibold text-green-400">{strategy.maxProfit}</span>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg">
                        <span className="block text-xs text-gray-400">Max Loss</span>
                        <span className="text-lg font-semibold text-red-400">{strategy.maxLoss}</span>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg">
                        <span className="block text-xs text-gray-400">Breakeven</span>
                        <span className="text-lg font-semibold text-yellow-400">{strategy.breakeven.map(b => b.toFixed(2)).join(', ')}</span>
                    </div>
                </div>

                <h4 className="font-semibold text-gray-300 mb-2">Net Greeks</h4>
                <div className="grid grid-cols-5 gap-2 text-center text-sm">
                    <div className="bg-gray-800 p-2 rounded">
                        <div className="text-gray-500 text-xs">Delta</div>
                        <div className={strategy.netGreeks.delta >= 0 ? 'text-green-400' : 'text-red-400'}>{strategy.netGreeks.delta.toFixed(2)}</div>
                    </div>
                    <div className="bg-gray-800 p-2 rounded">
                        <div className="text-gray-500 text-xs">Gamma</div>
                        <div className={strategy.netGreeks.gamma >= 0 ? 'text-green-400' : 'text-red-400'}>{strategy.netGreeks.gamma.toFixed(4)}</div>
                    </div>
                    <div className="bg-gray-800 p-2 rounded">
                        <div className="text-gray-500 text-xs">Vega</div>
                        <div className={strategy.netGreeks.vega >= 0 ? 'text-green-400' : 'text-red-400'}>{strategy.netGreeks.vega.toFixed(2)}</div>
                    </div>
                    <div className="bg-gray-800 p-2 rounded">
                        <div className="text-gray-500 text-xs">Theta</div>
                        <div className={strategy.netGreeks.theta >= 0 ? 'text-green-400' : 'text-red-400'}>{strategy.netGreeks.theta.toFixed(2)}</div>
                    </div>
                    <div className="bg-gray-800 p-2 rounded">
                        <div className="text-gray-500 text-xs">Rho</div>
                        <div className={strategy.netGreeks.rho >= 0 ? 'text-green-400' : 'text-red-400'}>{strategy.netGreeks.rho.toFixed(2)}</div>
                    </div>
                </div>

                <h4 className="font-semibold text-gray-300 mt-6 mb-2">Legs</h4>
                <ul className="space-y-2 text-sm">
                    {strategy.legs.map((leg, idx) => (
                        <li key={idx} className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                            <span className={leg.quantity > 0 ? 'text-green-400' : 'text-red-400'}>
                                {leg.quantity > 0 ? 'Buy' : 'Sell'} {Math.abs(leg.quantity)}
                            </span>
                            <span className="text-gray-300">{leg.option.strike} {leg.option.type}</span>
                            <span className="text-gray-400">@ {leg.option.bsmPrice.toFixed(2)}</span>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Strategy Comparison</h2>
                <button
                    onClick={() => {
                        setIsCompareMode(!isCompareMode);
                        if (!isCompareMode && !selectedStrategy2) {
                            // Default second strategy if none selected
                            setSelectedStrategy2(strategies.find(s => s !== selectedStrategy1) || strategies[0]);
                        }
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${isCompareMode
                            ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                >
                    {isCompareMode ? 'Exit Comparison' : 'Compare Strategies'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strategy 1 Selection */}
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-400">Select Strategy 1</label>
                    <div className="flex flex-wrap gap-2">
                        {strategies.map(s => (
                            <button
                                key={s}
                                onClick={() => setSelectedStrategy1(s)}
                                className={`px-3 py-1 text-sm rounded-full border transition-colors ${selectedStrategy1 === s
                                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    {renderStrategyCard(strategy1, "Strategy 1")}
                </div>

                {/* Strategy 2 Selection (Only in Compare Mode) */}
                {isCompareMode && (
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-400">Select Strategy 2</label>
                        <div className="flex flex-wrap gap-2">
                            {strategies.map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSelectedStrategy2(s)}
                                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${selectedStrategy2 === s
                                            ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                        {renderStrategyCard(strategy2, "Strategy 2")}
                    </div>
                )}
            </div>
        </div>
    );
};
