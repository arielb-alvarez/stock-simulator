// services/movingAverageService.ts
import { CandleStickData } from '../types';
import { UTCTimestamp } from 'lightweight-charts';

export interface MovingAverageConfig {
    period: number;
    color: string;
    lineWidth: 1 | 2 | 3 | 4;
    type: 'sma' | 'ema' | 'wma' | 'vwma';
    priceSource: 'close' | 'open' | 'high' | 'low' | 'hl2' | 'hlc3' | 'ohlc4';
    visible?: boolean;
}

export interface MovingAverageData {
    time: UTCTimestamp;
    value: number;
}

export interface MovingAverageResult {
    data: MovingAverageData[];
    config: MovingAverageConfig;
}

// Helper function to safely access localStorage
const getLocalStorage = (): Storage | null => {
    if (typeof window === 'undefined') {
        return null; // Server-side
    }
    return window.localStorage;
};

// Helper function to safely use localStorage
const safeLocalStorage = {
    getItem: (key: string): string | null => {
        const storage = getLocalStorage();
        return storage ? storage.getItem(key) : null;
    },
    setItem: (key: string, value: string): void => {
        const storage = getLocalStorage();
        if (storage) {
        storage.setItem(key, value);
        }
    }
};

// Global configuration storage
class MovingAverageConfigManager {
    private static configs: MovingAverageConfig[] = [];
    private static listeners: ((configs: MovingAverageConfig[]) => void)[] = [];
    private static isInitialized = false;

    static initialize() {
        if (this.isInitialized) return;
        
        // Load from localStorage or use defaults
        const saved = safeLocalStorage.getItem('movingAverageConfigs');
        if (saved) {
            try {
                this.configs = JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to parse saved moving average configs, using defaults', e);
                this.configs = this.getDefaultConfigs();
            }
        } else {
            this.configs = this.getDefaultConfigs();
        }
        
        this.isInitialized = true;
    }

    static getConfigs(): MovingAverageConfig[] {
        if (!this.isInitialized) {
        this.initialize();
        }
        return [...this.configs];
    }

    static setConfigs(configs: MovingAverageConfig[]): void {
        this.configs = configs;
        safeLocalStorage.setItem('movingAverageConfigs', JSON.stringify(configs));
        this.notifyListeners();
    }

    static addConfig(config: MovingAverageConfig): void {
        this.configs.push(config);
        safeLocalStorage.setItem('movingAverageConfigs', JSON.stringify(this.configs));
        this.notifyListeners();
    }

    static updateConfig(index: number, config: MovingAverageConfig): void {
        this.configs[index] = config;
        safeLocalStorage.setItem('movingAverageConfigs', JSON.stringify(this.configs));
        this.notifyListeners();
    }

    static removeConfig(index: number): void {
        this.configs.splice(index, 1);
        safeLocalStorage.setItem('movingAverageConfigs', JSON.stringify(this.configs));
        this.notifyListeners();
    }

    static subscribe(listener: (configs: MovingAverageConfig[]) => void): () => void {
        this.listeners.push(listener);
        return () => {
        this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private static notifyListeners(): void {
        this.listeners.forEach(listener => listener([...this.configs]));
    }

    private static getDefaultConfigs(): MovingAverageConfig[] {
        return [];
    }
}

// Initialize the manager (this will be safe on server now)
MovingAverageConfigManager.initialize();

export class MovingAverageService {
    /**
     * Get the global moving average configurations
     */
    static getConfigs(): MovingAverageConfig[] {
        return MovingAverageConfigManager.getConfigs();
    }

    /**
     * Set the global moving average configurations
     */
    static setConfigs(configs: MovingAverageConfig[]): void {
        MovingAverageConfigManager.setConfigs(configs);
    }

    /**
     * Add a new moving average configuration globally
     */
    static addConfig(config: MovingAverageConfig): void {
        MovingAverageConfigManager.addConfig(config);
    }

    /**
     * Update a moving average configuration globally
     */
    static updateConfig(index: number, config: MovingAverageConfig): void {
        MovingAverageConfigManager.updateConfig(index, config);
    }

    /**
     * Remove a moving average configuration globally
     */
    static removeConfig(index: number): void {
        MovingAverageConfigManager.removeConfig(index);
    }

    /**
     * Subscribe to configuration changes
     */
    static subscribeToConfigChanges(listener: (configs: MovingAverageConfig[]) => void): () => void {
        return MovingAverageConfigManager.subscribe(listener);
    }


    static calculateSMA(
        data: CandleStickData[], 
        period: number, 
        priceSource: MovingAverageConfig['priceSource'] = 'close'
    ): MovingAverageData[] {
        if (data.length < period) return [];

        const result: MovingAverageData[] = [];
        const prices = this.getPriceSeries(data, priceSource);

        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += prices[i - j];
            }
            const average = sum / period;
            
            result.push({
                time: this.normalizeTime(data[i].time),
                value: average
            });
        }

        return result;
    }

    static calculateEMA(
        data: CandleStickData[], 
        period: number, 
        priceSource: MovingAverageConfig['priceSource'] = 'close'
    ): MovingAverageData[] {
        if (data.length < period) return [];

        const result: MovingAverageData[] = [];
        const prices = this.getPriceSeries(data, priceSource);
        const multiplier = 2 / (period + 1);

        // Start with SMA for the first value
        let ema = this.calculateSMA(data.slice(0, period), period, priceSource)[0]?.value || prices[0];

        // Add first EMA point
        result.push({
            time: this.normalizeTime(data[period - 1].time),
            value: ema
        });

        // Calculate subsequent EMA values
        for (let i = period; i < data.length; i++) {
            ema = (prices[i] - ema) * multiplier + ema;
            
            result.push({
                time: this.normalizeTime(data[i].time),
                value: ema
            });
        }

        return result;
    }

    static calculateWMA(
        data: CandleStickData[], 
        period: number, 
        priceSource: MovingAverageConfig['priceSource'] = 'close'
    ): MovingAverageData[] {
        if (data.length < period) return [];

        const result: MovingAverageData[] = [];
        const prices = this.getPriceSeries(data, priceSource);
        const weightSum = period * (period + 1) / 2;

        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += prices[i - j] * (period - j);
            }
            const wma = sum / weightSum;
            
            result.push({
                time: this.normalizeTime(data[i].time),
                value: wma
            });
        }

        return result;
    }

    static calculateVWMA(
        data: CandleStickData[], 
        period: number, 
        priceSource: MovingAverageConfig['priceSource'] = 'close'
    ): MovingAverageData[] {
        if (data.length < period) return [];

        const result: MovingAverageData[] = [];
        const prices = this.getPriceSeries(data, priceSource);

        for (let i = period - 1; i < data.length; i++) {
            let volumeSum = 0;
            let priceVolumeSum = 0;

            for (let j = 0; j < period; j++) {
                const index = i - j;
                const volume = data[index].volume || 1;
                volumeSum += volume;
                priceVolumeSum += prices[index] * volume;
            }

            const vwma = priceVolumeSum / volumeSum;
            
            result.push({
                time: this.normalizeTime(data[i].time),
                value: vwma
            });
        }

        return result;
    }

    static calculateMovingAverage(
        data: CandleStickData[], 
        config: MovingAverageConfig
    ): MovingAverageResult {
        let maData: MovingAverageData[] = [];

        switch (config.type) {
        case 'sma':
            maData = this.calculateSMA(data, config.period, config.priceSource);
            break;
        case 'ema':
            maData = this.calculateEMA(data, config.period, config.priceSource);
            break;
        case 'wma':
            maData = this.calculateWMA(data, config.period, config.priceSource);
            break;
        case 'vwma':
            maData = this.calculateVWMA(data, config.period, config.priceSource);
            break;
        default:
            maData = this.calculateSMA(data, config.period, config.priceSource);
        }

        return {
            data: maData,
            config
        };
    }

    static calculateMultipleMovingAverages(
        data: CandleStickData[],
        configs: MovingAverageConfig[]
    ): MovingAverageResult[] {
        return configs.map(config => 
        this.calculateMovingAverage(data, config)
        );
    }

    private static getPriceSeries(
        data: CandleStickData[], 
        priceSource: MovingAverageConfig['priceSource']
    ): number[] {
        return data.map(candle => {
            switch (priceSource) {
                case 'open':
                return candle.open;
                case 'high':
                return candle.high;
                case 'low':
                return candle.low;
                case 'hl2':
                return (candle.high + candle.low) / 2;
                case 'hlc3':
                return (candle.high + candle.low + candle.close) / 3;
                case 'ohlc4':
                return (candle.open + candle.high + candle.low + candle.close) / 4;
                case 'close':
                default:
                return candle.close;
            }
        });
    }

    private static normalizeTime(time: any): UTCTimestamp {
        if (typeof time === 'number') {
            return time > 10000000000 ? Math.floor(time / 1000) as UTCTimestamp : time as UTCTimestamp;
        }
        if (typeof time === 'string') {
            return Math.floor(new Date(time).getTime() / 1000) as UTCTimestamp;
        }
        return Math.floor(Date.now() / 1000) as UTCTimestamp;
    }

    static validateConfig(config: MovingAverageConfig): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (config.period < 2 || config.period > 500) {
            errors.push('Period must be between 2 and 500');
        }

        if (!['sma', 'ema', 'wma', 'vwma'].includes(config.type)) {
            errors.push('Invalid moving average type');
        }

        if (!['close', 'open', 'high', 'low', 'hl2', 'hlc3', 'ohlc4'].includes(config.priceSource)) {
            errors.push('Invalid price source');
        }

        if (!this.isValidColor(config.color)) {
            errors.push('Invalid color format');
        }

        if (![1, 2, 3, 4].includes(config.lineWidth)) {
            errors.push('Line width must be 1, 2, 3, or 4');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    private static isValidColor(color: string): boolean {
        const s = new Option().style;
        s.color = color;
        return s.color !== '';
    }

    static getMinDataPointsRequired(configs: MovingAverageConfig[]): number {
        return Math.max(...configs.map(config => config.period), 0);
    }

    static hasEnoughData(data: CandleStickData[], configs: MovingAverageConfig[]): boolean {
        const minPoints = this.getMinDataPointsRequired(configs);
        return data.length >= minPoints;
    }

    static calculateRealTimeMA(
        historicalData: CandleStickData[],
        newPoint: CandleStickData,
        config: MovingAverageConfig
    ): MovingAverageData | null {
        if (historicalData.length < config.period - 1) return null;

        // Combine historical data with new point
        const combinedData = [...historicalData.slice(-config.period + 1), newPoint];
        
        if (combinedData.length < config.period) return null;

        switch (config.type) {
            case 'sma':
                return this.calculateSMA(combinedData, config.period, config.priceSource)[0] || null;
            case 'ema':
                return this.calculateEMA(combinedData, config.period, config.priceSource)[0] || null;
            case 'wma':
                return this.calculateWMA(combinedData, config.period, config.priceSource)[0] || null;
            case 'vwma':
                return this.calculateVWMA(combinedData, config.period, config.priceSource)[0] || null;
            default:
                return null;
        }
    }

    /**
     * Calculate EMA incrementally (for better real-time performance)
     */
    static calculateEMAIncremental(
        previousEMA: number,
        newPrice: number,
        period: number
    ): number {
        const multiplier = 2 / (period + 1);
        return (newPrice - previousEMA) * multiplier + previousEMA;
    }

    /**
     * Get the minimum data required for real-time MA calculation
     */
    static getRequiredDataForRealTime(
        historicalData: CandleStickData[],
        period: number
    ): CandleStickData[] {
        return historicalData.slice(-period + 1);
    }
}

export default MovingAverageService;