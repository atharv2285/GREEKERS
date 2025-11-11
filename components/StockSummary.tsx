import React from 'react';
import type { StockData, LiveStockData, SummaryStats, HistoricalDataPoint } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StockSummaryProps {
    stockData: StockData;
    liveStockData: LiveStockData;
    summaryStats: SummaryStats;
}

const StatCard: React.FC<{ label: string; value: string | number; unit?: string; valueClass?: string }> = ({ label, value, unit, valueClass = "text-white" }) => (
    <div className="bg-gray-700/50 p-3 rounded-lg flex justify-between items-baseline">
        <p className="text-sm text-gray-400">{label}</p>
        <p className={`text-lg font-semibold font-mono ${valueClass}`}>
            {typeof value === 'number' ? value.toLocaleString('en-IN', {maximumFractionDigits: 2}) : value}
            {unit && <span className="text-sm text-gray-300 ml-1">{unit}</span>}
        </p>
    </div>
);

const HistoricalPriceChart: React.FC<{ data: HistoricalDataPoint[] }> = ({ data }) => (
    <div className="space-y-3">
        <h3 className="text-xl font-bold">Historical Price (90 Days)</h3>
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis dataKey="date" tick={{ fill: '#A0AEC0' }} tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} />
                    <YAxis tick={{ fill: '#A0AEC0' }} domain={['dataMin - 10', 'dataMax + 10']} tickFormatter={(val) => `₹${Number(val).toFixed(0)}`}/>
                    <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} labelStyle={{ color: '#E2E8F0' }} formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Price']} />
                    <Area type="monotone" dataKey="price" stroke="#22d3ee" fillOpacity={1} fill="url(#colorPrice)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </div>
);


export const StockSummary: React.FC<StockSummaryProps> = ({ stockData, liveStockData, summaryStats }) => {
    const priceChange = liveStockData.close - liveStockData.previousClose;
    const priceChangePercent = (priceChange / liveStockData.previousClose) * 100;
    const changeColor = priceChange >= 0 ? 'text-green-400' : 'text-red-400';

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Live Price */}
                <div className="md:col-span-1 space-y-4">
                    <p className="text-4xl font-bold text-white">
                        ₹{liveStockData.close.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </p>
                    <p className={`text-xl font-semibold ${changeColor}`}>
                        {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
                    </p>
                    <div className="space-y-2">
                        <StatCard label="Prev. Close" value={liveStockData.previousClose} />
                        <StatCard label="Open" value={liveStockData.open} />
                        <StatCard label="Day's Range" value={`${liveStockData.low.toFixed(2)} - ${liveStockData.high.toFixed(2)}`} />
                        <StatCard label="Volume" value={liveStockData.volume} />
                    </div>
                </div>

                {/* Right Column: Key Stats */}
                <div className="md:col-span-2 space-y-4">
                     <h3 className="text-xl font-bold">Key Statistics</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <StatCard label="Annualized Volatility" value={summaryStats.annualizedVolatility * 100} unit="%" />
                        <StatCard label="Skewness" value={summaryStats.skewness.toFixed(4)} />
                        <StatCard label="Kurtosis" value={summaryStats.kurtosis.toFixed(4)} />
                        <StatCard label="Data Points (Days)" value={stockData.historicalData.length} />
                     </div>
                </div>
            </div>
            
            <HistoricalPriceChart data={stockData.historicalData} />
        </div>
    )
}