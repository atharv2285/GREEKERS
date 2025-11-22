import React from 'react';
import type { OptionChain, Option } from '../types';
import { OptionType } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface VolatilitySurfaceProps {
  optionChain: OptionChain;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-700 p-3 border border-gray-600 rounded-md shadow-lg">
        <p className="label font-bold text-cyan-400">{`Strike: ${label}`}</p>
        {payload.map((pld: any) => (
          <p key={pld.name} style={{ color: pld.color }}>{`${pld.name}: ${(pld.value * 100).toFixed(2)}%`}</p>
        ))}
      </div>
    );
  }
  return null;
};

export const VolatilitySurface: React.FC<VolatilitySurfaceProps> = ({ optionChain }) => {
  const data = React.useMemo(() => {
    const strikes = [...new Set(Object.values(optionChain).flat().map((o: Option) => o.strike))].sort((a, b) => a - b);

    return strikes.map(strike => {
      const point: { strike: number, [key: string]: number } = { strike };
      for (const maturity in optionChain) {
        const option = optionChain[maturity].find(o => o.strike === strike && o.type === OptionType.Call);
        if (option) {
          point[`${maturity}D IV`] = option.iv;
        }
      }
      return point;
    });
  }, [optionChain]);

  const maturities = Object.keys(optionChain);
  const colors = ['#22d3ee', '#67e8f9', '#a5f3fc'];

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Implied Volatility Surface</h3>
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
            <XAxis dataKey="strike" tick={{ fill: '#A0AEC0' }} label={{ value: 'Strike Price', position: 'insideBottom', offset: -15, fill: '#CBD5E0' }} />
            <YAxis domain={['auto', 'auto']} tickFormatter={(tick) => `${(tick * 100).toFixed(0)}%`} tick={{ fill: '#A0AEC0' }} label={{ value: 'Implied Volatility', angle: -90, position: 'insideLeft', fill: '#CBD5E0', dy: 80 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#E2E8F0', paddingTop: '20px' }} />
            {maturities.map((maturity, index) => (
              <Line
                key={maturity}
                type="monotone"
                dataKey={`${maturity}D IV`}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: colors[index % colors.length] }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};