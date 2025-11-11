import React, { useState, useEffect } from 'react';
import type { Config } from '../types';

interface ConfigPanelProps {
    config: Config;
    onApplyChanges: (newConfig: Config) => void;
}

// A local type for the draft state to allow for empty strings in number fields during editing
type DraftConfig = Omit<Config, 'riskFreeRate' | 'lotSize'> & {
    riskFreeRate: number | string;
    lotSize: number | string;
};

const ConfigInput: React.FC<{label: string; id: keyof DraftConfig; value: string | number; onChange: (id: keyof DraftConfig, value: string) => void; type?: string; step?: number; addon?: string}> = ({label, id, value, onChange, type="number", step=1, addon}) => {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-300">
                {label}
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
                <input
                    type={type}
                    id={id}
                    name={id}
                    value={value}
                    onChange={(e) => onChange(id, e.target.value)}
                    step={step}
                    className="w-full pl-3 pr-12 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    aria-describedby={`${id}-addon`}
                />
                {addon && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-400 sm:text-sm" id={`${id}-addon`}>
                            {addon}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

const ConfigDateInput: React.FC<{label: string; id: keyof Config; value: string; onChange: (id: keyof Config, value: string) => void;}> = ({label, id, value, onChange}) => {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-300">
                {label}
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
                <input
                    type="date"
                    id={id}
                    name={id}
                    value={value}
                    onChange={(e) => onChange(id, e.target.value)}
                    className="w-full pl-3 pr-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
            </div>
        </div>
    );
};

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onApplyChanges }) => {
    const [draftConfig, setDraftConfig] = useState<DraftConfig>(config);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        setDraftConfig(config);
    }, [config]);

    useEffect(() => {
        // Compare stringified versions to check for changes
        const originalConfigStr = JSON.stringify({
            ...config,
            riskFreeRate: parseFloat(String(config.riskFreeRate)),
            lotSize: parseInt(String(config.lotSize), 10),
        });
        const draftConfigStr = JSON.stringify({
            ...draftConfig,
            riskFreeRate: parseFloat(String(draftConfig.riskFreeRate)),
            lotSize: parseInt(String(draftConfig.lotSize), 10),
        });
        setHasChanges(originalConfigStr !== draftConfigStr);
    }, [config, draftConfig]);

    const handleInputChange = (id: keyof DraftConfig, value: string) => {
        setDraftConfig(prev => ({...prev, [id]: value}));
    };
    
    const handleApply = () => {
        const parsedConfig: Config = {
            ...draftConfig,
            riskFreeRate: parseFloat(String(draftConfig.riskFreeRate)) || 0,
            lotSize: parseInt(String(draftConfig.lotSize), 10) || 0,
            startDate: draftConfig.startDate,
            endDate: draftConfig.endDate,
        };
        onApplyChanges(parsedConfig);
    };

    return (
        <div className="bg-gray-800 p-4 rounded-xl shadow-lg">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
                <div className="col-span-2 md:col-span-1">
                    <h3 className="text-lg font-semibold text-white">Configuration</h3>
                </div>
                <ConfigInput
                    label="Risk-Free Rate"
                    id="riskFreeRate"
                    value={draftConfig.riskFreeRate}
                    onChange={handleInputChange}
                    step={0.1}
                    addon="%"
                />
                <ConfigInput
                    label="Lot Size"
                    id="lotSize"
                    value={draftConfig.lotSize}
                    onChange={handleInputChange}
                    addon="Shares"
                />
                <ConfigDateInput label="Start Date" id="startDate" value={draftConfig.startDate} onChange={handleInputChange as any} />
                <ConfigDateInput label="End Date" id="endDate" value={draftConfig.endDate} onChange={handleInputChange as any} />
                <div className="col-span-2 md:col-span-1">
                     <button
                        onClick={handleApply}
                        disabled={!hasChanges}
                        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors duration-200 bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-800 disabled:bg-gray-600 disabled:cursor-not-allowed"
                     >
                        RUN
                    </button>
                </div>
            </div>
        </div>
    );
};