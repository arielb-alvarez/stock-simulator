// components/MovingAverageControls.tsx
import React, { useState, useCallback } from 'react';
import { MovingAverageConfig } from '../../types';
import MovingAverageConfigDialog from './MovingAverageConfigDialog';

interface MovingAverageControlsProps {
    configs: MovingAverageConfig[];
    onConfigsUpdate: (configs: MovingAverageConfig[]) => void;
    onToggleVisibility: (index: number) => void;
    onAddMovingAverage: (config: MovingAverageConfig) => void;
    onRemoveMovingAverage: (index: number) => void;
    theme: 'light' | 'dark';
    isMobile: boolean;
}

const MovingAverageControls: React.FC<MovingAverageControlsProps> = ({
    configs,
    onToggleVisibility,
    onAddMovingAverage,
    onRemoveMovingAverage,
    theme,
    isMobile
}) => {
    const [showConfigDialog, setShowConfigDialog] = useState(false);

    const handleAddMovingAverage = useCallback((config: MovingAverageConfig) => {
        onAddMovingAverage(config);
        setShowConfigDialog(false);
    }, [onAddMovingAverage]);

    return (
        <>
            <div style={{
                position: 'absolute',
                top: '5px',
                left: '45px',
                zIndex: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                background: "rgb(229 229 229 / 50%)",
                borderRadius: "5px",
            }}>
                {configs.map((config, index) => (
                    <MovingAverageItem
                        key={index}
                        config={config}
                        index={index}
                        onToggleVisibility={onToggleVisibility}
                        onRemove={onRemoveMovingAverage}
                        theme={theme}
                        isMobile={isMobile}
                    />
                ))}

                {configs.length === 0 && (
                    <div style={{
                        fontSize: '11px',
                        color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                        textAlign: 'center',
                        padding: '8px 0'
                    }}>
                        No moving averages
                    </div>
                )}
            </div>

            {showConfigDialog && (
                <MovingAverageConfigDialog
                    onSave={handleAddMovingAverage}
                    onClose={() => setShowConfigDialog(false)}
                    theme={theme}
                    isMobile={isMobile}
                />
            )}
        </>
    );
};

const MovingAverageItem: React.FC<{
    config: MovingAverageConfig;
    index: number;
    onToggleVisibility: (index: number) => void;
    onRemove: (index: number) => void;
    theme: 'light' | 'dark';
    isMobile: boolean;
}> = ({ config, index, onToggleVisibility, onRemove, theme, isMobile }) => {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                    fontSize: '11px',
                    color: theme === 'dark' ? 
                        (config.visible ? '#fff' : 'rgba(255,255,255,0.4)') : 
                        (config.visible ? '#000' : 'rgba(0,0,0,0.4)'),
                    textDecoration: config.visible ? 'none' : 'line-through'
                }}>
                    {config.type.toUpperCase()}({config.period})
                </span>

                <div
                    style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: config.visible ? config.color : 'transparent',
                        border: `2px solid ${config.color}`,
                        cursor: 'pointer'
                    }}
                    onClick={() => onToggleVisibility(index)}
                    title={config.visible ? 'Hide' : 'Show'}
                />
            </div>
            <button
                onClick={() => onRemove(index)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '2px 6px'
                }}
                title="Remove"
            >
                ×
            </button>
        </div>
    );
};

export default MovingAverageControls;