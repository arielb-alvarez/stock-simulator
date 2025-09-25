// hooks/useCookies.ts
import { useState, useEffect } from 'react';
import { Drawing, ChartConfig } from '../types';

const useCookies = () => {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    theme: 'dark',
    type: 'candlestick'
  });

  // Load drawings and config from localStorage on component mount
  useEffect(() => {
    const loadDrawings = () => {
      try {
        const savedDrawings = localStorage.getItem('chart-drawings');
        if (savedDrawings) {
          const parsedDrawings = JSON.parse(savedDrawings);
          // Validate the parsed drawings structure
          if (Array.isArray(parsedDrawings)) {
            setDrawings(parsedDrawings);
          }
        }
      } catch (error) {
        console.error('Error loading drawings from localStorage:', error);
      }
    };

    const loadChartConfig = () => {
      try {
        const savedConfig = localStorage.getItem('chart-config');
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          setChartConfig(prev => ({ ...prev, ...parsedConfig }));
        }
      } catch (error) {
        console.error('Error loading chart config from localStorage:', error);
      }
    };

    loadDrawings();
    loadChartConfig();
  }, []);

  const saveDrawings = (newDrawings: Drawing[]) => {
    try {
      // Validate drawings before saving
      const validDrawings = newDrawings.filter(drawing => 
        drawing && 
        drawing.id && 
        drawing.type && 
        drawing.points && 
        Array.isArray(drawing.points) &&
        drawing.points.length > 0
      );
      
      localStorage.setItem('chart-drawings', JSON.stringify(validDrawings));
      setDrawings(validDrawings);
    } catch (error) {
      console.error('Error saving drawings to localStorage:', error);
    }
  };

  const saveChartConfig = (newConfig: ChartConfig) => {
    try {
      localStorage.setItem('chart-config', JSON.stringify(newConfig));
      setChartConfig(newConfig);
    } catch (error) {
      console.error('Error saving chart config to localStorage:', error);
    }
  };

  const clearDrawings = () => {
    try {
      localStorage.removeItem('chart-drawings');
      setDrawings([]);
    } catch (error) {
      console.error('Error clearing drawings:', error);
    }
  };

  return {
    drawings,
    chartConfig,
    saveDrawings,
    saveChartConfig,
    clearDrawings
  };
};

export default useCookies;