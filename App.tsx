
import React, { useState, useCallback } from 'react';
import { StockSelector } from './components/StockSelector';
import { Dashboard } from './components/Dashboard';

const App: React.FC = () => {
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const handleStockSelect = useCallback((stock: string) => {
    setSelectedStock(stock);
  }, []);
  
  const handleReset = useCallback(() => {
    setSelectedStock(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="bg-gray-800 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold tracking-wider text-white">
                Greeker
              </h1>
            </div>
            {selectedStock && (
               <button onClick={handleReset} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75">
                 Select New Stock
               </button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {!selectedStock ? (
          <div className="flex items-center justify-center" style={{minHeight: 'calc(100vh - 10rem)'}}>
            <StockSelector onStockSelect={handleStockSelect} />
          </div>
        ) : (
          <Dashboard stockTicker={selectedStock} />
        )}
      </main>
      
      <footer className="bg-gray-800 mt-8 py-4">
        <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
          <p>@FRAM, Made by Atharv, Financial Risk Analytics & Management Assignment Demo.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;