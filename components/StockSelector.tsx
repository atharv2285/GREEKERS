
import React, { useState } from 'react';

interface StockSelectorProps {
  onStockSelect: (stock: string) => void;
}

// Expanded list of stocks for better search experience
const NIFTY_500_STOCKS = [
  "RELIANCE", "HDFCBANK", "ICICIBANK", "INFY", "TCS", "HINDUNILVR",
  "ITC", "KOTAKBANK", "SBIN", "BHARTIARTL", "BAJFINANCE", "LT",
  "AXISBANK", "ASIANPAINT", "MARUTI", "HCLTECH", "SUNPHARMA",
  "TITAN", "WIPRO", "ADANIENT", "ULTRACEMCO", "NESTLEIND",
  "GRASIM", "BAJAJFINSV", "ONGC", "NTPC", "JSWSTEEL", "POWERGRID",
  "M&M", "INDUSINDBK", "HDFCLIFE", "SBILIFE", "TATASTEEL", "TECHM",
  "TATAMOTORS", "DRREDDY", "HINDALCO", "CIPLA", "BRITANNIA", "EICHERMOT",
  "HEROMOTOCO", "COALINDIA", "UPL", "DIVISLAB", "SHREECEM", "BPCL",
  "IOC", "TATACONSUM", "BAJAJ-AUTO", "APOLLOHOSP", "ADANIPORTS", "WIPRO", "ETERNAL"
];


export const StockSelector: React.FC<StockSelectorProps> = ({ onStockSelect }) => {
  const [ticker, setTicker] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticker) {
      onStockSelect(ticker.toUpperCase());
    }
  };

  return (
    <div className="w-full max-w-lg p-8 space-y-8 bg-gray-800 rounded-xl shadow-2xl">
      <div className="text-center">
        <h2 className="text-4xl font-extrabold text-white">Select a Stock</h2>
        <p className="mt-2 text-lg text-gray-400">Search for a stock to begin analysis.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="stock-input" className="block text-sm font-medium text-gray-300 mb-2">
            Stock Ticker
          </label>
          <input
            id="stock-input"
            type="text"
            list="stock-list"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="e.g., RELIANCE"
            className="w-full px-3 py-3 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <datalist id="stock-list">
            {NIFTY_500_STOCKS.map((stock) => (
              <option key={stock} value={stock} />
            ))}
          </datalist>
        </div>
        <div>
          <button
            type="submit"
            disabled={!ticker}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-800 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-600 disabled:scale-100 disabled:cursor-not-allowed"
          >
            Analyze Portfolio
          </button>
        </div>
      </form>
    </div>
  );
};
