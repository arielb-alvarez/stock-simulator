import React, { useState, useEffect } from 'react';
import { RSIConfig } from '../../types';

interface RSIConfigDialogProps {
  config?: RSIConfig;
  onSave: (config: Omit<RSIConfig, 'id'>) => void;
  onClose: () => void;
  theme: 'light' | 'dark';
  isMobile: boolean;
  isEditing?: boolean;
}

const RSIConfigDialog: React.FC<RSIConfigDialogProps> = ({
  config,
  onSave,
  onClose,
  theme,
  isMobile,
  isEditing = false
}) => {
  const [period, setPeriod] = useState(config?.period || 14);
  const [color, setColor] = useState(config?.color || '#7E57C2');
  const [lineWidth, setLineWidth] = useState(config?.lineWidth || 2);
  const [overbought, setOverbought] = useState(config?.overbought || 70);
  const [oversold, setOversold] = useState(config?.oversold || 30);

  useEffect(() => {
    if (config) {
      setPeriod(config.period);
      setColor(config.color);
      setLineWidth(config.lineWidth);
      setOverbought(config.overbought);
      setOversold(config.oversold);
    }
  }, [config]);

  const handleSave = () => {
    onSave({
      period,
      color,
      lineWidth,
      overbought,
      oversold,
      visible: true
    });
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleBackgroundClick}
    >
      <div
        style={{
          backgroundColor: theme === 'dark' ? '#2a2e39' : '#ffffff',
          padding: isMobile ? '16px' : '24px',
          borderRadius: '8px',
          minWidth: isMobile ? '90vw' : '400px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          color: theme === 'dark' ? '#e0e0e0' : '#2a2e39',
        }}
      >
        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem' }}>
          {isEditing ? 'Edit RSI' : 'Add RSI'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Period */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>
              Period
            </label>
            <input
              type="number"
              min="2"
              max="50"
              value={period}
              onChange={(e) => setPeriod(parseInt(e.target.value) || 14)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '4px',
                border: `1px solid ${theme === 'dark' ? '#40444f' : '#dee2e6'}`,
                backgroundColor: theme === 'dark' ? '#1e222d' : '#ffffff',
                color: theme === 'dark' ? '#e0e0e0' : '#2a2e39',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Color */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>
              Color
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{
                  width: '50px',
                  height: '40px',
                  border: `1px solid ${theme === 'dark' ? '#40444f' : '#dee2e6'}`,
                  borderRadius: '4px',
                  backgroundColor: theme === 'dark' ? '#1e222d' : '#ffffff',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '14px' }}>{color}</span>
            </div>
          </div>

          {/* Line Width */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>
              Line Width
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={lineWidth}
              onChange={(e) => setLineWidth(parseInt(e.target.value))}
              style={{
                width: '100%',
              }}
            />
            <div style={{ textAlign: 'center', fontSize: '12px', marginTop: '4px' }}>
              {lineWidth}px
            </div>
          </div>

          {/* Overbought Level */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>
              Overbought Level
            </label>
            <input
              type="number"
              min="50"
              max="90"
              value={overbought}
              onChange={(e) => setOverbought(parseInt(e.target.value) || 70)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '4px',
                border: `1px solid ${theme === 'dark' ? '#40444f' : '#dee2e6'}`,
                backgroundColor: theme === 'dark' ? '#1e222d' : '#ffffff',
                color: theme === 'dark' ? '#e0e0e0' : '#2a2e39',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Oversold Level */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>
              Oversold Level
            </label>
            <input
              type="number"
              min="10"
              max="50"
              value={oversold}
              onChange={(e) => setOversold(parseInt(e.target.value) || 30)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '4px',
                border: `1px solid ${theme === 'dark' ? '#40444f' : '#dee2e6'}`,
                backgroundColor: theme === 'dark' ? '#1e222d' : '#ffffff',
                color: theme === 'dark' ? '#e0e0e0' : '#2a2e39',
                fontSize: '14px',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: `1px solid ${theme === 'dark' ? '#40444f' : '#dee2e6'}`,
              borderRadius: '4px',
              backgroundColor: 'transparent',
              color: theme === 'dark' ? '#e0e0e0' : '#2a2e39',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#7E57C2',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {isEditing ? 'Update' : 'Add'} RSI
          </button>
        </div>
      </div>
    </div>
  );
};

export default RSIConfigDialog;