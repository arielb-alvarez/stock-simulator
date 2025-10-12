// components/MovingAverageControls.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { MovingAverageConfig } from '../../types';
import MovingAverageConfigDialog from './MovingAverageConfigDialog';

interface MovingAverageControlsProps {
    configs: MovingAverageConfig[];
    onConfigsUpdate: (configs: MovingAverageConfig[]) => void;
    onToggleVisibility: (index: number) => void;
    onAddMovingAverage: (config: MovingAverageConfig) => void;
    onUpdateMovingAverage: (index: number, config: MovingAverageConfig) => void;
    onRemoveMovingAverage: (index: number) => void;
    theme: 'light' | 'dark';
    isMobile: boolean;
}

const MovingAverageControls: React.FC<MovingAverageControlsProps> = ({
    configs,
    onToggleVisibility,
    onAddMovingAverage,
    onUpdateMovingAverage,
    onRemoveMovingAverage,
    theme,
    isMobile
}) => {
    const [showConfigDialog, setShowConfigDialog] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [isClient, setIsClient] = useState(false);

    // Ensure this only runs on client
    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleAddMovingAverage = useCallback((config: MovingAverageConfig) => {
        onAddMovingAverage(config);
        setShowConfigDialog(false);
    }, [onAddMovingAverage]);

    const handleUpdateMovingAverage = useCallback((config: MovingAverageConfig) => {
        if (editingIndex !== null) {
            onUpdateMovingAverage(editingIndex, config);
            setEditingIndex(null);
        }
    }, [editingIndex, onUpdateMovingAverage]);

    const handleEditClick = useCallback((index: number) => {
        setEditingIndex(index);
    }, []);

    const handleCloseEditDialog = useCallback(() => {
        setEditingIndex(null);
    }, []);

    // Don't render anything on server to avoid hydration mismatch
    if (!isClient) {
        return null;
    }

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
                background: theme === 'dark' ? "rgb(30 41 59 / 80%)" : "rgb(255 255 255 / 80%)",
                borderRadius: "5px",
                backdropFilter: 'blur(4px)',
                border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                padding: '4px',
                minWidth: '200px'
            }}>
                {/* Add new MA button */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    marginBottom: '4px'
                }}>
                    <span style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: theme === 'dark' ? '#fff' : '#000'
                    }}>
                        Moving Averages
                    </span>
                    <button
                        onClick={() => setShowConfigDialog(true)}
                        style={{
                            background: '#3B82F6',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '12px',
                            padding: '4px 8px',
                            borderRadius: '3px'
                        }}
                        title="Add new moving average"
                    >
                        +
                    </button>
                </div>

                {configs.length > 0 ? (
                    configs.map((config, index) => (
                        <MovingAverageItem
                            key={index}
                            config={config}
                            index={index}
                            onToggleVisibility={onToggleVisibility}
                            onEdit={handleEditClick}
                            onRemove={onRemoveMovingAverage}
                            theme={theme}
                            isMobile={isMobile}
                        />
                    ))
                ) : (
                    <div style={{
                        padding: '8px',
                        textAlign: 'center',
                        color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                        fontSize: '11px'
                    }}>
                        No moving averages
                    </div>
                )}
            </div>

            {/* Add new MA dialog */}
            {showConfigDialog && (
                <MovingAverageConfigDialog
                    onSave={handleAddMovingAverage}
                    onClose={() => setShowConfigDialog(false)}
                    theme={theme}
                    isMobile={isMobile}
                />
            )}

            {/* Edit existing MA dialog */}
            {editingIndex !== null && (
                <MovingAverageConfigDialog
                    config={configs[editingIndex]}
                    onSave={handleUpdateMovingAverage}
                    onClose={handleCloseEditDialog}
                    theme={theme}
                    isMobile={isMobile}
                    isEditing={true}
                />
            )}
        </>
    );
};

const MovingAverageItem: React.FC<{
    config: MovingAverageConfig;
    index: number;
    onToggleVisibility: (index: number) => void;
    onEdit: (index: number) => void;
    onRemove: (index: number) => void;
    theme: 'light' | 'dark';
    isMobile: boolean;
}> = ({ config, index, onToggleVisibility, onEdit, onRemove, theme, isMobile }) => {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px',
            borderRadius: '3px',
            background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            marginBottom: '2px'
        }}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                flex: 1,
                minWidth: 0 // Allow text truncation
            }}>
                {/* Visibility Toggle Circle */}
                <div
                    style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: config.visible ? config.color : 'transparent',
                        border: `2px solid ${config.color}`,
                        cursor: 'pointer',
                        flexShrink: 0
                    }}
                    onClick={() => onToggleVisibility(index)}
                    title={config.visible ? 'Hide' : 'Show'}
                />

                {/* MA Label */}
                <span style={{
                    fontSize: '11px',
                    color: theme === 'dark' ? 
                        (config.visible ? '#fff' : 'rgba(255,255,255,0.4)') : 
                        (config.visible ? '#000' : 'rgba(0,0,0,0.4)'),
                    textDecoration: config.visible ? 'none' : 'line-through',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1
                }}>
                    {config.type.toUpperCase()}({config.period})
                </span>

                {/* Edit Button (Gear Icon) */}
                <button
                    onClick={() => onEdit(index)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '3px',
                        width: '20px',
                        height: '20px',
                        flexShrink: 0
                    }}
                    title="Edit configuration"
                >
                    <svg 
                        width="12" 
                        height="12" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                    >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                </button>
            </div>
            
            {/* Remove Button */}
            <button
                onClick={() => onRemove(index)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '0 4px',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '3px',
                    flexShrink: 0
                }}
                title="Remove"
            >
                ×
            </button>
        </div>
    );
};

export default MovingAverageControls;