import React from 'react';
import ErrorBoundary from './ErrorBoundary';

interface ChartContainerProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

const ChartContainer: React.FC<ChartContainerProps> = ({ children, onClick }) => {
  return (
    <div className="chart-container" onClick={onClick}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </div>
  );
};

export default ChartContainer;