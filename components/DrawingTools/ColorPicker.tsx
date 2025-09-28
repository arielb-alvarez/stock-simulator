import React from 'react';

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  lineWidth: number;
  onLineWidthChange: (width: number) => void;
  theme: 'light' | 'dark';
  isMobile: boolean;
  show: boolean;
  onClose: () => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onColorSelect,
  lineWidth,
  onLineWidthChange,
  theme,
  isMobile,
  show,
  onClose,
}) => {
  if (!show) return null;

  const colors = [
    '#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF',
    '#5856D6', '#FF2D55', '#8E8E93', '#C7C7CC', '#EFEFF4', '#000000'
  ];

  return (
    <div 
      style={{
        position: 'absolute',
        top: isMobile ? 'auto' : '60px',
        bottom: isMobile ? '40px' : 'auto',
        left: isMobile ? '50%' : '45px',
        transform: isMobile ? 'translateX(-50%)' : 'none',
        zIndex: 21,
        background: theme === 'dark' ? 'rgba(42, 46, 57, 0.98)' : 'rgba(255, 255, 255, 0.98)',
        padding: isMobile ? '10px' : '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 15px rgba(0, 0, 0, 0.3)',
        border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
        backdropFilter: 'blur(10px)',
        minWidth: isMobile ? '250px' : '200px',
        maxWidth: isMobile ? '90vw' : '220px'
      }}
    >
      {/* Compact Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <span style={{
          fontSize: isMobile ? '14px' : '13px',
          fontWeight: '600',
          color: theme === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)'
        }}>
          Drawing Settings
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
            cursor: 'pointer',
            padding: '2px',
            borderRadius: '3px',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = theme === 'dark' 
              ? 'rgba(255,255,255,0.1)' 
              : 'rgba(0,0,0,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
          }}
        >
          ×
        </button>
      </div>

      {/* Compact Color Grid */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '5px'
        }}>
          {colors.map(color => (
            <button
              key={color}
              onClick={() => onColorSelect(color)}
              style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '4px',
                background: color,
                border: selectedColor === color 
                  ? `2px solid ${theme === 'dark' ? '#fff' : '#000'}` 
                  : `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                transform: selectedColor === color ? 'scale(1.05)' : 'scale(1)'
              }}
            />
          ))}
        </div>
      </div>

      {/* Compact Line Width Slider */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{
            fontSize: isMobile ? '13px' : '12px',
            color: theme === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
            fontWeight: '500'
          }}>
            Line Width
          </span>
          <span style={{
            fontSize: isMobile ? '13px' : '12px',
            color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
            fontWeight: '600'
          }}>
            {lineWidth}px
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={lineWidth}
          onChange={(e) => onLineWidthChange(Number(e.target.value))}
          style={{
            width: '100%',
            height: '4px',
            borderRadius: '2px',
            background: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
            outline: 'none',
            cursor: 'pointer'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
          <span style={{ fontSize: '10px', color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}>1</span>
          <span style={{ fontSize: '10px', color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}>10</span>
        </div>
      </div>

      {/* Compact Preview */}
      <div style={{
        padding: '8px',
        background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        borderRadius: '5px',
        border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px'
        }}>
          <span style={{
            fontSize: '11px',
            color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'
          }}>
            Preview:
          </span>
          <span style={{
            fontSize: '10px',
            color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'
          }}>
            {selectedColor}
          </span>
        </div>
        <div style={{
          height: '3px',
          background: selectedColor,
          borderRadius: '2px',
          width: '100%'
        }} />
      </div>
    </div>
  );
};

export default ColorPicker;