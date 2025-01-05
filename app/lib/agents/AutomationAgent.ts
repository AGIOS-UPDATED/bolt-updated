import { CryptoAgent, TaskResult } from './CryptoAgent';

interface AutomationRule {
  condition: string;
  action: string;
  params: any;
  interval?: number;
}

export class AutomationAgent {
  private cryptoAgent: CryptoAgent;
  private rules: AutomationRule[] = [];
  private activeMonitors: Map<number, NodeJS.Timeout> = new Map();

  constructor(providerUrl: string, marketApiKey: string) {
    this.cryptoAgent = new CryptoAgent(providerUrl, marketApiKey);
  }

  addRule(rule: AutomationRule): number {
    const ruleId = this.rules.length;
    this.rules.push(rule);
    
    if (rule.interval) {
      this.startMonitoring(ruleId);
    }
    
    return ruleId;
  }

  removeRule(ruleId: number): boolean {
    if (ruleId >= 0 && ruleId < this.rules.length) {
      this.rules[ruleId] = null;
      this.stopMonitoring(ruleId);
      return true;
    }
    return false;
  }

  private startMonitoring(ruleId: number): void {
    const rule = this.rules[ruleId];
    if (!rule || !rule.interval) return;

    const monitor = setInterval(async () => {
      await this.evaluateRule(rule);
    }, rule.interval);

    this.activeMonitors.set(ruleId, monitor);
  }

  private stopMonitoring(ruleId: number): void {
    const monitor = this.activeMonitors.get(ruleId);
    if (monitor) {
      clearInterval(monitor);
      this.activeMonitors.delete(ruleId);
    }
  }

  private async evaluateRule(rule: AutomationRule): Promise<void> {
    try {
      const conditionMet = await this.evaluateCondition(rule.condition);
      if (conditionMet) {
        await this.executeAction(rule.action, rule.params);
      }
    } catch (error) {
      console.error('Error evaluating rule:', error);
    }
  }

  private async evaluateCondition(condition: string): Promise<boolean> {
    // Add your condition evaluation logic here
    // Example: "price_below_threshold" or "wallet_balance_above"
    const [type, ...params] = condition.split(':');

    switch (type) {
      case 'price_below_threshold':
        const [symbol, threshold] = params;
        const priceData = await this.cryptoAgent.executeTask('check_price', { symbol });
        return priceData.success && priceData.data.price < parseFloat(threshold);

      case 'wallet_balance_above':
        const [address, minBalance] = params;
        const walletData = await this.cryptoAgent.executeTask('monitor_wallet', { address });
        return walletData.success && parseFloat(walletData.data.balance) > parseFloat(minBalance);

      default:
        return false;
    }
  }

  private async executeAction(action: string, params: any): Promise<TaskResult> {
    return await this.cryptoAgent.executeTask(action, params);
  }

  // Example automation setups
  setupPriceAlert(symbol: string, threshold: number, interval: number = 60000): number {
    return this.addRule({
      condition: `price_below_threshold:${symbol}:${threshold}`,
      action: 'execute_trade',
      params: {
        type: 'buy',
        amount: '0.1',
        token: symbol,
        priceThreshold: threshold
      },
      interval
    });
  }

  setupWalletMonitor(address: string, minBalance: string, interval: number = 300000): number {
    return this.addRule({
      condition: `wallet_balance_above:${address}:${minBalance}`,
      action: 'monitor_wallet',
      params: { address },
      interval
    });
  }

  setupMarketAnalysis(interval: number = 3600000): number {
    return this.addRule({
      condition: 'market_analysis',
      action: 'analyze_market',
      params: {},
      interval
    });
  }

  // Get active rules status
  getActiveRules(): { ruleId: number; rule: AutomationRule }[] {
    return this.rules
      .map((rule, index) => ({ ruleId: index, rule }))
      .filter(({ rule }) => rule !== null);
  }

  // Stop all monitoring
  stopAllMonitoring(): void {
    this.activeMonitors.forEach((monitor, ruleId) => {
      this.stopMonitoring(ruleId);
    });
  }
}
