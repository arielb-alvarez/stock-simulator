export interface RSIConfig {
  id: string;
  period: number;
  visible: boolean;
  color: string;
  lineWidth: number;
  overbought: number;
  oversold: number;
}

const RSI_CONFIG_KEY = 'rsi-configs';

export class RSIService {
  private static instance: RSIService;
  private configs: RSIConfig[] = [];
  private listeners: ((configs: RSIConfig[]) => void)[] = [];

  private constructor() {
    this.loadConfigs();
  }

  static getInstance(): RSIService {
    if (!RSIService.instance) {
      RSIService.instance = new RSIService();
    }
    return RSIService.instance;
  }

  private loadConfigs(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(RSI_CONFIG_KEY);
      if (stored) {
        this.configs = JSON.parse(stored);
      } else {
        this.configs = [];
        this.saveConfigs();
      }
    } catch (error) {
      console.error('Failed to load RSI configs:', error);
      this.configs = [];
    }
  }

  private saveConfigs(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(RSI_CONFIG_KEY, JSON.stringify(this.configs));
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.configs]));
  }

  subscribeToConfigChanges(listener: (configs: RSIConfig[]) => void): () => void {
    this.listeners.push(listener);
    listener([...this.configs]); // Initial call
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getConfigs(): RSIConfig[] {
    return [...this.configs];
  }

  setConfigs(configs: RSIConfig[]): void {
    this.configs = configs.map(config => ({
      ...config,
      id: config.id || `rsi-${Date.now()}`
    }));
    this.saveConfigs();
  }

  addConfig(config: Omit<RSIConfig, 'id'>): void {
    const newConfig: RSIConfig = {
      ...config,
      id: `rsi-${Date.now()}`
    };
    this.configs.push(newConfig);
    this.saveConfigs();
  }

  updateConfig(id: string, config: Partial<RSIConfig>): void {
    const index = this.configs.findIndex(c => c.id === id);
    if (index !== -1) {
      this.configs[index] = { ...this.configs[index], ...config };
      this.saveConfigs();
    }
  }

  removeConfig(id: string): void {
    this.configs = this.configs.filter(c => c.id !== id);
    this.saveConfigs();
  }

  toggleVisibility(id: string): void {
    const config = this.configs.find(c => c.id === id);
    if (config) {
      config.visible = !config.visible;
      this.saveConfigs();
    }
  }

  // RSI calculation method
  calculateRSI(data: { close: number; time: number }[], period: number): { time: number; value: number }[] {
    if (!data || data.length < period + 1) return [];

    // Ensure we have valid data
    const validData = data.filter(item => 
        item && 
        typeof item.close === 'number' && 
        !isNaN(item.close) &&
        typeof item.time === 'number'
    );
    
    if (validData.length < period + 1) return [];

    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate gains and losses
    for (let i = 1; i < validData.length; i++) {
        const change = validData[i].close - validData[i - 1].close;
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate initial averages
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

    const rsiValues: { time: number; value: number }[] = [];

    // Calculate RSI values
    for (let i = period; i < validData.length; i++) {
        // Avoid division by zero
        const rs = avgLoss !== 0 ? avgGain / avgLoss : 100;
        const rsi = avgLoss !== 0 ? 100 - (100 / (1 + rs)) : 100;

        // Ensure RSI is within valid range
        const clampedRsi = Math.min(Math.max(rsi, 0), 100);

        rsiValues.push({
            time: validData[i].time,
            value: clampedRsi
        });

        // Update averages for next iteration
        if (i < validData.length - 1) {
            avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
            avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
        }
    }

    return rsiValues;
}
}

export default RSIService.getInstance();