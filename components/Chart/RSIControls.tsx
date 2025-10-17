import React, { useState, useCallback, useEffect } from 'react';
import { RSIConfig } from '../../types';
import RSIConfigDialog from './RSIConfigDialog';
import RSIService from '../../services/RSIService';

interface RSIControlsProps {
  configs: RSIConfig[];
  onConfigsUpdate: (configs: RSIConfig[]) => void;
  onToggleVisibility: (id: string) => void;
  onUpdateRSI: (id: string, config: RSIConfig) => void;
  onRemoveRSI: (id: string) => void;
  theme: 'light' | 'dark';
  isMobile: boolean;
}

const RSIControls: React.FC<RSIControlsProps> = ({
  configs,
  onToggleVisibility,
  onUpdateRSI,
  onRemoveRSI,
  theme,
  isMobile
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleUpdateRSI = useCallback((config: Omit<RSIConfig, 'id'>) => {
    if (editingId) {
      onUpdateRSI(editingId, { ...config, id: editingId });
      setEditingId(null);
    }
  }, [editingId, onUpdateRSI]);

  const handleEditClick = useCallback((id: string) => {
    setEditingId(id);
  }, []);

  const handleCloseEditDialog = useCallback(() => {
    setEditingId(null);
  }, []);

  const editingConfig = editingId ? configs.find(c => c.id === editingId) : undefined;

  if (!isClient || configs.length === 0) {
    return null;
  }

  return (
    <>
      <div style={{
        position: 'absolute',
        bottom: '25px', // Position above time scale
        left: '10px',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        {configs.map((config) => (
          <RSIItem
            key={config.id}
            config={config}
            onToggleVisibility={onToggleVisibility}
            onEdit={handleEditClick}
            onRemove={onRemoveRSI}
            theme={theme}
            isMobile={isMobile}
          />
        ))}
      </div>

      {editingId && editingConfig && (
        <RSIConfigDialog
          config={editingConfig}
          onSave={handleUpdateRSI}
          onClose={handleCloseEditDialog}
          theme={theme}
          isMobile={isMobile}
          isEditing={true}
        />
      )}
    </>
  );
};

const RSIItem: React.FC<{
  config: RSIConfig;
  onToggleVisibility: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  theme: 'light' | 'dark';
  isMobile: boolean;
}> = ({ config, onToggleVisibility, onEdit, onRemove, theme, isMobile }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '4px 8px',
      borderRadius: '3px',
      background: theme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(42, 46, 57, 0.9)',
      marginBottom: '2px',
      color: theme === 'light' ? '#2a2e39' : '#e0e0e0',
      border: `1px solid ${theme === 'light' ? '#dee2e6' : '#40444f'}`,
      fontSize: '11px',
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        minWidth: 0
      }}>
        {/* RSI Label */}
        <span style={{
          textDecoration: config.visible ? 'none' : 'line-through',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1
        }}>
          RSI({config.period})
        </span>

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
          onClick={() => onToggleVisibility(config.id)}
          title={config.visible ? 'Hide' : 'Show'}
        />

        {/* Edit Button */}
        <button
          onClick={() => onEdit(config.id)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
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
        onClick={() => onRemove(config.id)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: '16px',
          padding: '0 4px',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '3px',
          flexShrink: 0,
          opacity: 0.7
        }}
        title="Remove"
      >
        ×
      </button>
    </div>
  );
};

export default RSIControls;