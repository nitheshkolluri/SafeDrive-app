
import React from 'react';

interface SpiderGraphProps {
    data: { label: string; value: number }[];
    size?: number;
    className?: string;
}

const SpiderGraph: React.FC<SpiderGraphProps> = ({ data, size = 260, className }) => {
    const center = size / 2;
    const radius = (size / 2) - 40; // padding for labels
    const angleSlice = (Math.PI * 2) / data.length;

    // Helper to get coordinates
    const getCoords = (value: number, index: number) => {
        const angle = index * angleSlice - (Math.PI / 2); // Start at top ( -90deg )
        const r = (value / 100) * radius;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle)
        };
    };

    const points = data.map((d, i) => {
        const { x, y } = getCoords(d.value, i);
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            <svg width={size} height={size} className="overflow-visible" style={{ filter: 'drop-shadow(0px 0px 8px rgba(0, 240, 255, 0.3))' }}>
                <defs>
                    <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="rgba(0, 240, 255, 0.4)" />
                        <stop offset="100%" stopColor="rgba(112, 0, 255, 0.4)" />
                    </linearGradient>
                    <radialGradient id="gridGradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
                        <stop offset="100%" stopColor="rgba(255, 255, 255, 0.1)" />
                    </radialGradient>
                </defs>

                {/* Concentric Polygons (Grid) */}
                {[0.25, 0.5, 0.75, 1].map((scale, idx) => (
                    <polygon
                        key={idx}
                        points={data.map((_, i) => {
                            const { x, y } = getCoords(100 * scale, i);
                            return `${x},${y}`;
                        }).join(' ')}
                        fill={idx === 3 ? "url(#gridGradient)" : "none"}
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="1"
                        strokeDasharray={idx < 3 ? "4 4" : "0"}
                    />
                ))}

                {/* Axes Lines */}
                {data.map((_, i) => {
                    const { x, y } = getCoords(100, i);
                    return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />;
                })}

                {/* Data Polygon */}
                <polygon 
                    points={points} 
                    fill="url(#radarGradient)" 
                    stroke="#00F0FF" 
                    strokeWidth="2" 
                    strokeLinejoin="round"
                    className="transition-all duration-1000 ease-out"
                />

                {/* Data Points */}
                {data.map((d, i) => {
                    const { x, y } = getCoords(d.value, i);
                    return (
                        <circle 
                            key={i} 
                            cx={x} 
                            cy={y} 
                            r="3" 
                            fill="#fff" 
                            className="shadow-neon-cyan" 
                        />
                    );
                })}

                {/* Labels */}
                {data.map((d, i) => {
                    const { x, y } = getCoords(125, i); // Push labels further out
                    return (
                        <text
                            key={i}
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="font-display font-bold fill-slate-400 dark:fill-slate-300 uppercase tracking-widest"
                            style={{ fontSize: '10px' }}
                        >
                            {d.label}
                        </text>
                    );
                })}
            </svg>
            
            {/* Center Decoration */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-brand-cyan shadow-neon-cyan animate-pulse"></div>
            </div>
        </div>
    );
};

export default SpiderGraph;
