import React, { useMemo } from 'react';
import type { PortfolioPosition, StockData, Config, PnLScenario } from '../types';
import type { FinancialService } from '../services/financialService';

interface PnLScenariosProps {
  portfolio: PortfolioPosition[];
  stockData: StockData;
  financialService: FinancialService;
  config: Config;
}

const PnLRow: React.FC<{ scenario: PnLScenario }> = ({ scenario }) => {
  const unhedgedColor = scenario.pnlUnhedged >= 0 ? 'text-green-400' : 'text-red-400';
  const hedgedColor = scenario.pnlDeltaHedged >= 0 ? 'text-green-400' : 'text-red-400';
  
  return (
    <tr className="border-b border-gray-700">
      <td className="px-4 py-3 font-semibold text-gray-300">{scenario.scenario}</td>
      <td className={`px-4 py-3 text-right font-mono ${unhedgedColor}`}>
        ₹{scenario.pnlUnhedged.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className={`px-4 py-3 text-right font-mono ${hedgedColor}`}>
        ₹{scenario.pnlDeltaHedged.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
    </tr>
  );
};


export const PnLScenarios: React.FC<PnLScenariosProps> = ({ portfolio, stockData, financialService, config }) => {
  const pnlData = useMemo(() => {
    if (portfolio.length === 0) return null;
    return financialService.calculatePnLScenarios(portfolio, stockData.lastPrice, config);
  }, [portfolio, stockData, financialService, config]);
  
  if (portfolio.length === 0) {
      return <p className="text-gray-500 italic text-center py-4">Add options from the chain to build a portfolio for P&L analysis.</p>;
  }
  
  if (!pnlData) return null;
  
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Profit & Loss Scenarios</h3>
      <p className="text-sm text-gray-400">
        Simulates the portfolio's P&L based on percentage changes in the underlying stock price. The delta-hedged scenario includes the P&L from the required stock hedge.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-300 uppercase bg-gray-700">
            <tr>
              <th className="px-4 py-2">Stock Price Change</th>
              <th className="px-4 py-2 text-right">PnL Unhedged</th>
              <th className="px-4 py-2 text-right">PnL Delta Hedged</th>
            </tr>
          </thead>
          <tbody>
            {pnlData.map(scenario => <PnLRow key={scenario.scenario} scenario={scenario} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
};
