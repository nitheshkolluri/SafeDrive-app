import React from 'react';

interface StatCardProps {
    Icon: React.ElementType;
    title: string;
    value: string;
    unit: string;
}

const StatCard: React.FC<StatCardProps> = ({ Icon, title, value, unit }) => {
    return (
        <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl shadow-lg backdrop-blur-md border border-white/10 transition-all duration-300">
            <div className="flex items-center justify-center w-12 h-12 mb-3 text-accent-300 bg-accent-500/20 rounded-full">
                <Icon className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-gray-400">{title}</p>
            <div className="flex items-baseline mt-1">
                <p className="text-3xl font-bold text-white">{value}</p>
                <p className="ml-1 text-sm font-medium text-gray-400">{unit}</p>
            </div>
        </div>
    );
};

export default StatCard;