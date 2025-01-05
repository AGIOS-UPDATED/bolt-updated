import { CryptoWallet } from '../blockchain/wallet';
import { TransactionManager } from '../blockchain/transactions';
import { CryptoMarket } from '../blockchain/market';
import { SmartContractManager } from '../blockchain/contracts';

export interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class CryptoAgent {
  private wallet: CryptoWallet;
  private transactionManager: TransactionManager;
  private market: CryptoMarket;
  private contractManager: SmartContractManager;
  private tasks: Map<string, Function>;

  constructor(
    providerUrl: string = 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
    marketApiKey: string
  ) {
    this.wallet = new CryptoWallet(providerUrl);
    this.transactionManager = new TransactionManager(providerUrl);
    this.market = new CryptoMarket(marketApiKey);
    this.contractManager = new SmartContractManager(providerUrl);
    this.initializeTasks();
  }

  private initializeTasks() {
    this.tasks = new Map([
      ['check_price', this.checkPrice.bind(this)],
      ['monitor_wallet', this.monitorWallet.bind(this)],
      ['execute_trade', this.executeTrade.bind(this)],
      ['analyze_market', this.analyzeMarket.bind(this)],
      ['track_transaction', this.trackTransaction.bind(this)],
      ['smart_contract_interaction', this.interactWithContract.bind(this)]
    ]);
  }

  async executeTask(taskName: string, params: any): Promise<TaskResult> {
    const task = this.tasks.get(taskName);
    if (!task) {
      return {
        success: false,
        error: `Task '${taskName}' not found`
      };
    }

    try {
      const result = await task(params);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async checkPrice({ symbol }: { symbol: string }): Promise<any> {
    const priceData = await this.market.getPrice(symbol);
    return {
      price: priceData.price,
      change24h: priceData.change24h,
      recommendation: this.analyzePriceMovement(priceData)
    };
  }

  private analyzePriceMovement(priceData: any): string {
    if (priceData.change24h > 5) return 'Consider Taking Profits';
    if (priceData.change24h < -5) return 'Potential Buying Opportunity';
    return 'Market Stable';
  }

  private async monitorWallet({ address }: { address: string }): Promise<any> {
    const balance = await this.wallet.getBalance(address);
    const transactions = await this.transactionManager.getTransactionHistory(address);
    return {
      balance,
      recentTransactions: transactions.slice(-5),
      securityStatus: this.assessWalletSecurity(transactions)
    };
  }

  private assessWalletSecurity(transactions: any[]): string {
    const uniqueRecipients = new Set(transactions.map(tx => tx.to)).size;
    const largeTransactions = transactions.filter(tx => parseFloat(tx.value) > 1).length;
    
    if (uniqueRecipients > 10 && largeTransactions > 5) return 'High Activity - Enhanced Security Recommended';
    return 'Normal Activity';
  }

  private async executeTrade({ 
    type, 
    amount, 
    token, 
    priceThreshold 
  }: { 
    type: 'buy' | 'sell', 
    amount: string, 
    token: string, 
    priceThreshold?: number 
  }): Promise<any> {
    const currentPrice = await this.market.getPrice(token);
    
    if (priceThreshold) {
      if (type === 'buy' && currentPrice.price > priceThreshold) {
        throw new Error('Price above threshold');
      }
      if (type === 'sell' && currentPrice.price < priceThreshold) {
        throw new Error('Price below threshold');
      }
    }

    // Execute trade logic here
    return {
      type,
      amount,
      token,
      executionPrice: currentPrice.price,
      timestamp: new Date().toISOString()
    };
  }

  private async analyzeMarket(): Promise<any> {
    const topCryptos = await this.market.getTopCryptos(10);
    const marketStats = await this.market.getMarketStats();
    
    return {
      topPerformers: this.identifyTopPerformers(topCryptos),
      marketSentiment: this.calculateMarketSentiment(marketStats),
      recommendations: this.generateMarketRecommendations(topCryptos, marketStats)
    };
  }

  private identifyTopPerformers(cryptos: any[]): any[] {
    return cryptos
      .filter(crypto => crypto.price_change_percentage_24h > 0)
      .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
      .slice(0, 3);
  }

  private calculateMarketSentiment(stats: any): string {
    const totalMarketCap = stats.data.total_market_cap.usd;
    const marketCapChange = stats.data.market_cap_change_percentage_24h_usd;
    
    if (marketCapChange > 5) return 'Bullish';
    if (marketCapChange < -5) return 'Bearish';
    return 'Neutral';
  }

  private generateMarketRecommendations(cryptos: any[], stats: any): string[] {
    const recommendations: string[] = [];
    const sentiment = this.calculateMarketSentiment(stats);
    
    if (sentiment === 'Bullish') {
      recommendations.push('Consider increasing portfolio exposure');
    } else if (sentiment === 'Bearish') {
      recommendations.push('Consider reducing risk');
    }

    return recommendations;
  }

  private async trackTransaction({ txHash }: { txHash: string }): Promise<any> {
    const status = await this.transactionManager.getTransactionStatus(txHash);
    const gasPrice = await this.transactionManager.getGasPrice();
    
    return {
      status,
      gasPrice,
      recommendation: this.provideTransactionInsights(status, gasPrice)
    };
  }

  private provideTransactionInsights(status: string, gasPrice: string): string {
    if (status === 'Pending' && parseFloat(gasPrice) > 100) {
      return 'Consider increasing gas price for faster confirmation';
    }
    return 'Transaction progressing normally';
  }

  private async interactWithContract({ 
    address, 
    abi, 
    method, 
    params 
  }: { 
    address: string, 
    abi: any[], 
    method: string, 
    params: any[] 
  }): Promise<any> {
    const gasEstimate = await this.contractManager.estimateContractGas(
      address,
      abi,
      method,
      ...params
    );

    // Add contract interaction safety checks
    this.validateContractInteraction(method, params);

    return {
      gasEstimate,
      safetyCheck: 'Passed',
      estimatedCost: this.calculateTransactionCost(gasEstimate)
    };
  }

  private validateContractInteraction(method: string, params: any[]): void {
    // Add validation logic for contract interactions
    const riskyMethods = ['transfer', 'approve', 'mint'];
    if (riskyMethods.includes(method)) {
      // Perform additional validation
      this.validateHighRiskOperation(method, params);
    }
  }

  private validateHighRiskOperation(method: string, params: any[]): void {
    // Add specific validation logic for high-risk operations
    if (method === 'approve' && params[1] === '0xffffffffffffffffffffffffffffffffffffffff') {
      throw new Error('Infinite approval detected - consider limiting approval amount');
    }
  }

  private calculateTransactionCost(gasEstimate: string): string {
    // Add logic to calculate transaction cost in USD
    return `Estimated cost: ${gasEstimate} gas units`;
  }
}
