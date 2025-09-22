import { useState, useEffect } from 'react';
import { Drawing, ChartConfig } from '../types';

const useCookies = () => {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: 'line',
    theme: 'dark',
    showLegend: true
  });

  useEffect(() => {
    // Load drawings from cookies
    const drawingsCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('drawings='));
    
    if (drawingsCookie) {
      try {
        const drawingsData = JSON.parse(decodeURIComponent(drawingsCookie.split('=')[1]));
        setDrawings(drawingsData);
      } catch (e) {
        console.error('Error parsing drawings cookie:', e);
      }
    }

    // Load chart config from cookies
    const configCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('chartConfig='));
    
    if (configCookie) {
      try {
        const configData = JSON.parse(decodeURIComponent(configCookie.split('=')[1]));
        setChartConfig(configData);
      } catch (e) {
        console.error('Error parsing config cookie:', e);
      }
    }
  }, []);

  const saveDrawings = (newDrawings: Drawing[]) => {
    setDrawings(newDrawings);
    const serialized = JSON.stringify(newDrawings);
    document.cookie = `drawings=${encodeURIComponent(serialized)}; max-age=${60 * 60 * 24 * 7}`; // 1 week
  };

  const saveChartConfig = (newConfig: ChartConfig) => {
    setChartConfig(newConfig);
    const serialized = JSON.stringify(newConfig);
    document.cookie = `chartConfig=${encodeURIComponent(serialized)}; max-age=${60 * 60 * 24 * 7}`; // 1 week
  };

  return {
    drawings,
    chartConfig,
    saveDrawings,
    saveChartConfig
  };
};

export default useCookies;