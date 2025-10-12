// components/MovingAverageConfigDialog.tsx
import React, { useState, useCallback, useEffect } from 'react'; // NEW: Added useEffect
import { MovingAverageConfig } from '../../types';
import { MovingAverageService } from '../../services/MovingAverageService';

interface MovingAverageConfigDialogProps {
    onSave: (config: MovingAverageConfig) => void;
    onClose: () => void;
    theme: 'light' | 'dark';
    isMobile: boolean;
    config?: MovingAverageConfig; // NEW: Optional existing config for editing
    isEditing?: boolean; // NEW: Flag to indicate edit mode
}

const MovingAverageConfigDialog: React.FC<MovingAverageConfigDialogProps> = ({
    onSave,
    onClose,
    theme,
    isMobile,
    config, // NEW: Existing config for editing
    isEditing = false // NEW: Default to false for backward compatibility
}) => {
    // NEW: Initialize with existing config or defaults
    const [currentConfig, setCurrentConfig] = useState<MovingAverageConfig>(
        config || {
            period: 20,
            color: '#3B82F6',
            lineWidth: 1,
            type: 'sma',
            priceSource: 'close'
        }
    );

    const [errors, setErrors] = useState<string[]>([]);

    // NEW: Update config when prop changes (for editing)
    useEffect(() => {
        if (config) {
            setCurrentConfig(config);
        }
    }, [config]);

    const handleSave = useCallback(() => {
        const validation = MovingAverageService.validateConfig(currentConfig);
        if (validation.isValid) {
            onSave(currentConfig);
        } else {
            setErrors(validation.errors);
        }
    }, [currentConfig, onSave]);

    const handleChange = useCallback((field: keyof MovingAverageConfig, value: any) => {
        setCurrentConfig(prev => ({ ...prev, [field]: value }));
        setErrors([]);
    }, []);

    const presetColors = [
        '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
        '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];

    const validLineWidths = [1, 2, 3, 4] as const;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }} onClick={onClose}>
            <div style={{
                background: theme === 'dark' ? '#1E293B' : '#FFFFFF',
                padding: '20px',
                borderRadius: '12px',
                minWidth: isMobile ? '300px' : '400px',
                maxWidth: '90vw',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
            }} onClick={e => e.stopPropagation()}>
                {/* NEW: Dynamic title based on mode */}
                <h3 style={{
                    margin: '0 0 20px 0',
                    color: theme === 'dark' ? '#fff' : '#000'
                }}>
                    {isEditing ? 'Edit Moving Average' : 'Add Moving Average'}
                </h3>

                {errors.length > 0 && (
                    <div style={{
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        color: '#DC2626',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        marginBottom: '16px',
                        fontSize: '14px'
                    }}>
                        {errors.map((error, index) => (
                            <div key={index}>• {error}</div>
                        ))}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Type */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '4px',
                            color: theme === 'dark' ? '#fff' : '#000',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}>
                            Type
                        </label>
                        <select
                            value={currentConfig.type}
                            onChange={(e) => handleChange('type', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '4px',
                                border: `1px solid ${theme === 'dark' ? '#374151' : '#D1D5DB'}`,
                                background: theme === 'dark' ? '#374151' : '#FFFFFF',
                                color: theme === 'dark' ? '#fff' : '#000'
                            }}
                        >
                            <option value="sma">Simple Moving Average (SMA)</option>
                            <option value="ema">Exponential Moving Average (EMA)</option>
                            <option value="wma">Weighted Moving Average (WMA)</option>
                            <option value="vwma">Volume Weighted MA (VWMA)</option>
                        </select>
                    </div>

                    {/* Period */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '4px',
                            color: theme === 'dark' ? '#fff' : '#000',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}>
                            Period
                        </label>
                        <input
                            type="number"
                            min="2"
                            max="500"
                            value={currentConfig.period}
                            onChange={(e) => handleChange('period', parseInt(e.target.value) || 2)}
                            style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '4px',
                                border: `1px solid ${theme === 'dark' ? '#374151' : '#D1D5DB'}`,
                                background: theme === 'dark' ? '#374151' : '#FFFFFF',
                                color: theme === 'dark' ? '#fff' : '#000'
                            }}
                        />
                    </div>

                    {/* Price Source */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '4px',
                            color: theme === 'dark' ? '#fff' : '#000',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}>
                            Price Source
                        </label>
                        <select
                            value={currentConfig.priceSource}
                            onChange={(e) => handleChange('priceSource', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '4px',
                                border: `1px solid ${theme === 'dark' ? '#374151' : '#D1D5DB'}`,
                                background: theme === 'dark' ? '#374151' : '#FFFFFF',
                                color: theme === 'dark' ? '#fff' : '#000'
                            }}
                        >
                            <option value="close">Close</option>
                            <option value="open">Open</option>
                            <option value="high">High</option>
                            <option value="low">Low</option>
                            <option value="hl2">(High + Low)/2</option>
                            <option value="hlc3">(High + Low + Close)/3</option>
                            <option value="ohlc4">(Open + High + Low + Close)/4</option>
                        </select>
                    </div>

                    {/* Color */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: theme === 'dark' ? '#fff' : '#000',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}>
                            Color
                        </label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {presetColors.map(color => (
                                <div
                                    key={color}
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: color,
                                        cursor: 'pointer',
                                        border: currentConfig.color === color ? 
                                            `2px solid ${theme === 'dark' ? '#fff' : '#000'}` : 
                                            '2px solid transparent'
                                    }}
                                    onClick={() => handleChange('color', color)}
                                />
                            ))}
                        </div>
                        <input
                            type="color"
                            value={currentConfig.color}
                            onChange={(e) => handleChange('color', e.target.value)}
                            style={{
                                marginTop: '8px',
                                width: '100%',
                                height: '40px',
                                borderRadius: '4px',
                                border: `1px solid ${theme === 'dark' ? '#374151' : '#D1D5DB'}`
                            }}
                        />
                    </div>

                    {/* Line Width */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '4px',
                            color: theme === 'dark' ? '#fff' : '#000',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}>
                            Line Width
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {validLineWidths.map(width => (
                                <button
                                    key={width}
                                    type="button"
                                    onClick={() => handleChange('lineWidth', width)}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        border: `1px solid ${
                                            currentConfig.lineWidth === width 
                                                ? '#3B82F6' 
                                                : (theme === 'dark' ? '#374151' : '#D1D5DB')
                                        }`,
                                        background: currentConfig.lineWidth === width 
                                            ? '#3B82F6' 
                                            : (theme === 'dark' ? '#374151' : '#FFFFFF'),
                                        color: currentConfig.lineWidth === width ? 'white' : (theme === 'dark' ? '#fff' : '#000'),
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {width}px
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end',
                    marginTop: '20px'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            border: `1px solid ${theme === 'dark' ? '#374151' : '#D1D5DB'}`,
                            background: 'transparent',
                            color: theme === 'dark' ? '#fff' : '#000',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    {/* NEW: Dynamic button text based on mode */}
                    <button
                        onClick={handleSave}
                        style={{
                            padding: '8px 16px',
                            border: 'none',
                            background: '#3B82F6',
                            color: 'white',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        {isEditing ? 'Update Moving Average' : 'Add Moving Average'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MovingAverageConfigDialog;