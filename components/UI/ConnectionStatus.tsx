import React from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
  theme: 'light' | 'dark';
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected, theme }) => {
  return (
    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
      <ConnectionDotIcon connected={isConnected} />
      {isConnected ? 'Live' : 'Offline'}
    </div>
  );
};

const ConnectionDotIcon = ({ connected = true, size = 6 }) => (
  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
    <circle 
      cx={size/2} 
      cy={size/2} 
      r={size/2} 
      fill={connected ? '#10B981' : '#EF4444'}
    />
  </svg>
);

export default ConnectionStatus;