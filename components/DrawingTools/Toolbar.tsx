import React from 'react';
import { LineIcon, RectangleIcon, CircleIcon, PenIcon, EraserIcon } from './Icons';

interface ToolbarProps {
  activeTool: string | null;
  onToolSelect: (tool: string | null) => void;
  selectedColor: string;
  lineWidth: number;
  onColorPickerToggle: () => void;
  showColorPicker: boolean;
  theme: 'light' | 'dark';
  isMobile: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolSelect,
  selectedColor,
  lineWidth,
  onColorPickerToggle,
  showColorPicker,
  theme,
  isMobile
}) => {
  const tools = [
    { id: 'line', icon: LineIcon, title: 'Line Tool' },
    { id: 'rectangle', icon: RectangleIcon, title: 'Rectangle Tool' },
    { id: 'circle', icon: CircleIcon, title: 'Circle Tool' },
    { id: 'freehand', icon: PenIcon, title: 'Freehand Tool' },
    { id: 'eraser', icon: EraserIcon, title: 'Eraser Tool' },
  ];

  return (
    <div 
      style={{ 
        background: theme === 'dark' ? 'rgba(42, 46, 57, 0.98)' : 'rgba(255, 255, 255, 0.98)',
        padding: isMobile ? '6px 8px' : '6px 4px',
        borderRadius: '8px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: isMobile ? 'row' : 'column',
        alignItems: 'center',
        gap: isMobile ? '6px' : '4px',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
        maxWidth: isMobile ? 'calc(100vw - 20px)' : 'none',
        overflow: 'visible',
      }}
    >
      {tools.map(({ id, icon: Icon, title }) => (
        <ToolButton
          key={id}
          active={activeTool === id}
          icon={Icon}
          title={title}
          onClick={() => onToolSelect(activeTool === id ? null : id)}
          theme={theme}
          isMobile={isMobile}
        />
      ))}
      
      {/* Separator */}
      <div style={{ 
        width: isMobile ? '1px' : '100%', 
        height: isMobile ? '24px' : '1px', 
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
        margin: isMobile ? '0 4px' : '4px 0'
      }} />
      
      {/* Color Picker Button */}
      <ColorPickerButton
        color={selectedColor}
        active={showColorPicker}
        onToggle={onColorPickerToggle}
        theme={theme}
        isMobile={isMobile}
      />
      
      {/* Line Width Display */}
      <LineWidthDisplay width={lineWidth} theme={theme} isMobile={isMobile} />
    </div>
  );
};

// Compact ToolButton
const ToolButton: React.FC<{
  active: boolean;
  icon: React.ComponentType<{ color?: string; size?: number }>;
  title: string;
  onClick: () => void;
  theme: 'light' | 'dark';
  isMobile: boolean;
}> = ({ active, icon: Icon, title, onClick, theme, isMobile }) => (
  <button 
    onClick={onClick}
    title={title}
    style={{
      width: isMobile ? '32px' : '28px',
      height: isMobile ? '32px' : '28px',
      padding: '3px',
      border: `1px solid ${active 
        ? (theme === 'dark' ? '#3B82F6' : '#2563EB') 
        : (theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')}`,
      background: active 
        ? (theme === 'dark' ? '#3B82F6' : '#2563EB') 
        : (theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
      borderRadius: '5px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.15s ease',
      transform: active ? 'scale(0.95)' : 'scale(1)'
    }}
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.background = theme === 'dark' 
          ? 'rgba(255,255,255,0.1)' 
          : 'rgba(0,0,0,0.08)';
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.background = theme === 'dark' 
          ? 'rgba(255,255,255,0.05)' 
          : 'rgba(0,0,0,0.05)';
      }
    }}
  >
    <Icon 
      size={isMobile ? 16 : 14} 
      color={active 
        ? '#fff' 
        : (theme === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)')} 
    />
  </button>
);

// Compact ColorPickerButton
const ColorPickerButton: React.FC<{
  color: string;
  active: boolean;
  onToggle: () => void;
  theme: 'light' | 'dark';
  isMobile: boolean;
}> = ({ color, active, onToggle, theme, isMobile }) => (
  <button 
    onClick={onToggle}
    title={`Current Color: ${color}`}
    style={{
      width: isMobile ? '32px' : '28px',
      height: isMobile ? '32px' : '28px',
      border: `2px solid ${active ? (theme === 'dark' ? '#3B82F6' : '#2563EB') : 'transparent'}`,
      background: color,
      borderRadius: '5px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: `0 0 0 1px ${theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
      transition: 'all 0.15s ease',
      transform: active ? 'scale(0.95)' : 'scale(1)'
    }}
  />
);

// Compact LineWidthDisplay
const LineWidthDisplay: React.FC<{ width: number; theme: 'light' | 'dark'; isMobile: boolean }> = ({
  width,
  theme,
  isMobile
}) => (
  <div style={{ 
    display: 'flex', 
    flexDirection: isMobile ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: isMobile ? '11px' : '10px',
    fontWeight: '600',
    color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
    minWidth: isMobile ? '24px' : 'auto',
    height: isMobile ? '32px' : 'auto',
    padding: isMobile ? '0 3px' : '2px 0'
  }}>
    <span>W:{width}</span>
  </div>
);

export default Toolbar;