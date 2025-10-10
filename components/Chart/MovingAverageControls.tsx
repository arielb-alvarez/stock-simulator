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
                top: '10px',
                right: '10px',
                zIndex: 20,
                background: theme === 'dark' ? 'rgba(42, 46, 57, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                padding: '8px 12px',
                borderRadius: '8px',
                border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                minWidth: isMobile ? '140px' : '200px'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px',
                    paddingBottom: '4px',
                    borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                }}>
                    <span style={{
                        fontSize: isMobile ? '12px' : '14px',
                        fontWeight: 'bold',
                        color: theme === 'dark' ? '#fff' : '#000'
                    }}>
                        Moving Averages
                    </span>
                    <button
                        onClick={() => setShowConfigDialog(true)}
                        style={{
                            background: theme === 'dark' ? '#3B82F6' : '#2563EB',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        +
                    </button>
                </div>

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
                        fontSize: '12px',
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
            padding: '4px 0',
            borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                <span style={{
                    fontSize: isMobile ? '11px' : '12px',
                    color: theme === 'dark' ? 
                        (config.visible ? '#fff' : 'rgba(255,255,255,0.4)') : 
                        (config.visible ? '#000' : 'rgba(0,0,0,0.4)'),
                    textDecoration: config.visible ? 'none' : 'line-through'
                }}>
                    {config.type.toUpperCase()}({config.period})
                </span>
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