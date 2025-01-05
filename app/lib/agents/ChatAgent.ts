import { CryptoAgent, TaskResult } from './CryptoAgent';
import { AutomationAgent } from './AutomationAgent';

interface ChatResponse {
  message: string;
  data?: any;
  suggestions?: string[];
}

export class ChatAgent {
  private cryptoAgent: CryptoAgent;
  private automationAgent: AutomationAgent;
  private commandPatterns: Map<RegExp, Function>;

  constructor(providerUrl: string, marketApiKey: string) {
    this.cryptoAgent = new CryptoAgent(providerUrl, marketApiKey);
    this.automationAgent = new AutomationAgent(providerUrl, marketApiKey);
    this.initializeCommandPatterns();
  }

  private initializeCommandPatterns() {
    this.commandPatterns = new Map([
      [/check (?:the )?price (?:of )?([a-zA-Z0-9]+)/i, this.handlePriceCheck.bind(this)],
      [/monitor (?:my )?wallet ([0-9a-fA-Fx]+)/i, this.handleWalletMonitor.bind(this)],
      [/set (?:a )?price alert for ([a-zA-Z0-9]+) at \$?([\d.]+)/i, this.handlePriceAlert.bind(this)],
      [/analyze (?:the )?market/i, this.handleMarketAnalysis.bind(this)],
      [/track transaction ([0-9a-fA-Fx]+)/i, this.handleTransactionTracking.bind(this)],
      [/buy ([a-zA-Z0-9]+)(?: for )?\$?([\d.]+)/i, this.handleBuyOrder.bind(this)],
      [/sell ([a-zA-Z0-9]+)(?: for )?\$?([\d.]+)/i, this.handleSellOrder.bind(this)],
      [/show (?:my )?active rules/i, this.handleShowRules.bind(this)],
      [/help/i, this.handleHelp.bind(this)]
    ]);
  }

  async processMessage(message: string): Promise<ChatResponse> {
    try {
      for (const [pattern, handler] of this.commandPatterns) {
        const match = message.match(pattern);
        if (match) {
          return await handler(match);
        }
      }

      return {
        message: "I'm not sure what you want to do. Try 'help' to see available commands.",
        suggestions: [
          "check price of bitcoin",
          "analyze market",
          "help"
        ]
      };
    } catch (error) {
      return {
        message: `Error: ${error.message}`,
        suggestions: ["Try another command", "Type 'help' for assistance"]
      };
    }
  }

  private async handlePriceCheck([_, symbol]: RegExpMatchArray): Promise<ChatResponse> {
    const result = await this.cryptoAgent.executeTask('check_price', { symbol });
    
    if (!result.success) {
      return {
        message: `Failed to get price for ${symbol}: ${result.error}`,
        suggestions: ["Try another cryptocurrency", "Check market analysis"]
      };
    }

    return {
      message: `${symbol.toUpperCase()} Price Information:
• Current Price: $${result.data.price}
• 24h Change: ${result.data.change24h}%
• Recommendation: ${result.data.recommendation}`,
      data: result.data,
      suggestions: [
        `set price alert for ${symbol} at ${Math.floor(result.data.price * 0.95)}`,
        "analyze market",
        `buy ${symbol} for 100`
      ]
    };
  }

  private async handleWalletMonitor([_, address]: RegExpMatchArray): Promise<ChatResponse> {
    const result = await this.cryptoAgent.executeTask('monitor_wallet', { address });
    
    if (!result.success) {
      return {
        message: `Failed to monitor wallet: ${result.error}`,
        suggestions: ["Check another wallet", "analyze market"]
      };
    }

    return {
      message: `Wallet Status:
• Balance: ${result.data.balance} ETH
• Security Status: ${result.data.securityStatus}
• Recent Transactions: ${result.data.recentTransactions.length}`,
      data: result.data,
      suggestions: [
        "analyze market",
        "show active rules"
      ]
    };
  }

  private async handlePriceAlert([_, symbol, price]: RegExpMatchArray): Promise<ChatResponse> {
    const ruleId = this.automationAgent.setupPriceAlert(symbol, parseFloat(price));
    
    return {
      message: `Price alert set for ${symbol.toUpperCase()} at $${price}
• Alert ID: ${ruleId}
• You will be notified when the price crosses this threshold`,
      suggestions: [
        `check price of ${symbol}`,
        "show active rules",
        "analyze market"
      ]
    };
  }

  private async handleMarketAnalysis(): Promise<ChatResponse> {
    const result = await this.cryptoAgent.executeTask('analyze_market', {});
    
    if (!result.success) {
      return {
        message: `Failed to analyze market: ${result.error}`,
        suggestions: ["Try again later", "check price of bitcoin"]
      };
    }

    const topPerformers = result.data.topPerformers
      .map((coin: any) => `${coin.symbol.toUpperCase()}: ${coin.price_change_percentage_24h}%`)
      .join('\n');

    return {
      message: `Market Analysis:
• Sentiment: ${result.data.marketSentiment}
• Top Performers:
${topPerformers}
• Recommendations:
${result.data.recommendations.join('\n')}`,
      data: result.data,
      suggestions: [
        `check price of ${result.data.topPerformers[0]?.symbol}`,
        "set price alert",
        "show active rules"
      ]
    };
  }

  private async handleTransactionTracking([_, txHash]: RegExpMatchArray): Promise<ChatResponse> {
    const result = await this.cryptoAgent.executeTask('track_transaction', { txHash });
    
    if (!result.success) {
      return {
        message: `Failed to track transaction: ${result.error}`,
        suggestions: ["Check another transaction", "monitor wallet"]
      };
    }

    return {
      message: `Transaction Status:
• Status: ${result.data.status}
• Gas Price: ${result.data.gasPrice} Gwei
• ${result.data.recommendation}`,
      data: result.data,
      suggestions: [
        "analyze market",
        "show active rules"
      ]
    };
  }

  private async handleBuyOrder([_, symbol, amount]: RegExpMatchArray): Promise<ChatResponse> {
    const result = await this.cryptoAgent.executeTask('execute_trade', {
      type: 'buy',
      token: symbol,
      amount: amount
    });
    
    if (!result.success) {
      return {
        message: `Failed to execute buy order: ${result.error}`,
        suggestions: ["Try a different amount", "check price first"]
      };
    }

    return {
      message: `Buy Order Executed:
• Token: ${result.data.token.toUpperCase()}
• Amount: $${result.data.amount}
• Price: $${result.data.executionPrice}
• Time: ${result.data.timestamp}`,
      data: result.data,
      suggestions: [
        `set price alert for ${symbol}`,
        "show active rules",
        "analyze market"
      ]
    };
  }

  private async handleSellOrder([_, symbol, amount]: RegExpMatchArray): Promise<ChatResponse> {
    const result = await this.cryptoAgent.executeTask('execute_trade', {
      type: 'sell',
      token: symbol,
      amount: amount
    });
    
    if (!result.success) {
      return {
        message: `Failed to execute sell order: ${result.error}`,
        suggestions: ["Try a different amount", "check price first"]
      };
    }

    return {
      message: `Sell Order Executed:
• Token: ${result.data.token.toUpperCase()}
• Amount: $${result.data.amount}
• Price: $${result.data.executionPrice}
• Time: ${result.data.timestamp}`,
      data: result.data,
      suggestions: [
        "analyze market",
        "show active rules"
      ]
    };
  }

  private async handleShowRules(): Promise<ChatResponse> {
    const rules = this.automationAgent.getActiveRules();
    
    if (rules.length === 0) {
      return {
        message: "No active rules found.",
        suggestions: [
          "set price alert for bitcoin at 45000",
          "analyze market"
        ]
      };
    }

    const rulesList = rules
      .map(({ ruleId, rule }) => `${ruleId}: ${rule.condition} → ${rule.action}`)
      .join('\n');

    return {
      message: `Active Rules:\n${rulesList}`,
      data: rules,
      suggestions: [
        "analyze market",
        "check price of bitcoin"
      ]
    };
  }

  private async handleHelp(): Promise<ChatResponse> {
    return {
      message: `Available Commands:
• check price of [crypto] - Get current price and analysis
• monitor wallet [address] - Monitor wallet balance and activity
• set price alert for [crypto] at [price] - Set price alerts
• analyze market - Get market analysis and recommendations
• track transaction [hash] - Track transaction status
• buy [crypto] [amount] - Execute a buy order
• sell [crypto] [amount] - Execute a sell order
• show active rules - View active automation rules
• help - Show this help message`,
      suggestions: [
        "check price of bitcoin",
        "analyze market",
        "monitor wallet 0x123..."
      ]
    };
  }
}
