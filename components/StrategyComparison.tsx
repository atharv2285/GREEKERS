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

    // Simulation State
    const [simulatedDaysPassed, setSimulatedDaysPassed] = useState(0);
    const [simulatedIVChange, setSimulatedIVChange] = useState(0); // -0.1 to 0.1 (e.g. -10% to +10%)

    const strategies = Object.values(StrategyType);

    const strategy1 = useMemo(() => {
        return financialService.generateStrategy(selectedStrategy1, stockData.lastPrice, optionChain);
    }, [selectedStrategy1, stockData.lastPrice, optionChain, financialService]);

    const strategy2 = useMemo(() => {
        if (!selectedStrategy2) return null;
        return financialService.generateStrategy(selectedStrategy2, stockData.lastPrice, optionChain);
    }, [selectedStrategy2, stockData.lastPrice, optionChain, financialService]);

    // Generate Chart Data
    const chartData = useMemo(() => {
        if (!strategy1) return [];

        const data = [];
        const currentPrice = stockData.lastPrice;
        const range = 0.20; // +/- 20%
        const step = (currentPrice * range * 2) / 40; // 40 points

        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + simulatedDaysPassed);

        for (let price = currentPrice * (1 - range); price <= currentPrice * (1 + range); price += step) {
            const pnl1 = financialService.calculateStrategyPnL(strategy1, price, targetDate, simulatedIVChange, 7); // Assuming 7% risk free rate

            let point: any = {
                price: price.toFixed(2),
                [`${strategy1.name} (Sim)`]: pnl1,
            };

            if (isCompareMode && strategy2) {
                const pnl2 = financialService.calculateStrategyPnL(strategy2, price, targetDate, simulatedIVChange, 7);
                point[`${strategy2.name} (Sim)`] = pnl2;
            }

            data.push(point);
        }
        return data;
    }, [strategy1, strategy2, isCompareMode, stockData.lastPrice, simulatedDaysPassed, simulatedIVChange, financialService]);

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

            {/* Scenario Analysis Section */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg mt-8">
                <h3 className="text-xl font-bold text-white mb-6">Scenario Analysis: Payoff Diagram</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Simulated Days Passed: <span className="text-cyan-400">{simulatedDaysPassed} days</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="30"
                            step="1"
                            value={simulatedDaysPassed}
                            onChange={(e) => setSimulatedDaysPassed(Number(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Simulated IV Change: <span className="text-cyan-400">{(simulatedIVChange * 100).toFixed(0)}%</span>
                        </label>
                        <input
                            type="range"
                            min="-0.1"
                            max="0.1"
                            step="0.01"
                            value={simulatedIVChange}
                            onChange={(e) => setSimulatedIVChange(Number(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>
                </div>

                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis
                                dataKey="price"
                                stroke="#9CA3AF"
                                label={{ value: 'Stock Price', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
                            />
                            <YAxis
                                stroke="#9CA3AF"
                                label={{ value: 'PnL', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '0.5rem' }}
                                itemStyle={{ color: '#E5E7EB' }}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
                            <ReferenceLine x={stockData.lastPrice} stroke="#6B7280" strokeDasharray="3 3" label="Current" />

                            {strategy1 && (
                                <Line
                                    type="monotone"
                                    dataKey={`${strategy1.name} (Sim)`}
                                    stroke="#06B6D4"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            )}

                            {isCompareMode && strategy2 && (
                                <Line
                                    type="monotone"
                                    dataKey={`${strategy2.name} (Sim)`}
                                    stroke="#A855F7"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
