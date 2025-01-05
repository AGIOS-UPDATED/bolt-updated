import { Message } from 'ai';
import { CryptoAgent } from './CryptoAgent';
import { AutomationAgent } from './AutomationAgent';

interface CryptoResponse {
  content: string;
  data?: any;
  suggestions?: string[];
}

export class CryptoMessageHandler {
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
      [/crypto\s+price\s+(?:of\s+)?([a-zA-Z0-9]+)/i, this.handlePriceCheck.bind(this)],
      [/crypto\s+wallet\s+([0-9a-fA-Fx]+)/i, this.handleWalletMonitor.bind(this)],
      [/crypto\s+alert\s+([a-zA-Z0-9]+)\s+at\s+\$?([\d.]+)/i, this.handlePriceAlert.bind(this)],
      [/crypto\s+market/i, this.handleMarketAnalysis.bind(this)],
      [/crypto\s+tx\s+([0-9a-fA-Fx]+)/i, this.handleTransactionTracking.bind(this)],
      [/crypto\s+buy\s+([a-zA-Z0-9]+)\s+\$?([\d.]+)/i, this.handleBuyOrder.bind(this)],
      [/crypto\s+sell\s+([a-zA-Z0-9]+)\s+\$?([\d.]+)/i, this.handleSellOrder.bind(this)],
      [/crypto\s+rules/i, this.handleShowRules.bind(this)],
      [/crypto\s+help/i, this.handleHelp.bind(this)]
    ]);
  }

  async processMessage(message: string): Promise<Message | null> {
    for (const [pattern, handler] of this.commandPatterns) {
      const match = message.match(pattern);
      if (match) {
        const response = await handler(match);
        return {
          id: Date.now().toString(),
          role: 'assistant',
          content: this.formatResponse(response)
        };
      }
    }
    return null;
  }

  private formatResponse(response: CryptoResponse): string {
    let formattedContent = response.content;

    if (response.suggestions?.length) {
      formattedContent += '\n\nSuggested commands:\n' + 
        response.suggestions.map(s => `• ${s}`).join('\n');
    }

    return formattedContent;
  }

  private async handlePriceCheck([_, symbol]: RegExpMatchArray): Promise<CryptoResponse> {
    const result = await this.cryptoAgent.executeTask('check_price', { symbol });
    
    if (!result.success) {
      return {
        content: `Failed to get price for ${symbol}: ${result.error}`,
        suggestions: ["Try 'crypto price bitcoin'", "Try 'crypto market'"]
      };
    }

    return {
      content: `${symbol.toUpperCase()} Price Information:
• Current Price: $${result.data.price}
• 24h Change: ${result.data.change24h}%
• Recommendation: ${result.data.recommendation}`,
      data: result.data,
      suggestions: [
        `crypto alert ${symbol} at ${Math.floor(result.data.price * 0.95)}`,
        "crypto market",
        `crypto buy ${symbol} 100`
      ]
    };
  }

  private async handleWalletMonitor([_, address]: RegExpMatchArray): Promise<CryptoResponse> {
    const result = await this.cryptoAgent.executeTask('monitor_wallet', { address });
    
    if (!result.success) {
      return {
        content: `Failed to monitor wallet: ${result.error}`,
        suggestions: ["Try another wallet address", "crypto market"]
      };
    }

    return {
      content: `Wallet Status:
• Balance: ${result.data.balance} ETH
• Security Status: ${result.data.securityStatus}
• Recent Transactions: ${result.data.recentTransactions.length}`,
      data: result.data,
      suggestions: [
        "crypto market",
        "crypto rules"
      ]
    };
  }

  private async handlePriceAlert([_, symbol, price]: RegExpMatchArray): Promise<CryptoResponse> {
    const ruleId = this.automationAgent.setupPriceAlert(symbol, parseFloat(price));
    
    return {
      content: `Price alert set for ${symbol.toUpperCase()} at $${price}
• Alert ID: ${ruleId}
• You will be notified when the price crosses this threshold`,
      suggestions: [
        `crypto price ${symbol}`,
        "crypto rules",
        "crypto market"
      ]
    };
  }

  private async handleMarketAnalysis(): Promise<CryptoResponse> {
    const result = await this.cryptoAgent.executeTask('analyze_market', {});
    
    if (!result.success) {
      return {
        content: `Failed to analyze market: ${result.error}`,
        suggestions: ["Try again later", "crypto price bitcoin"]
      };
    }

    const topPerformers = result.data.topPerformers
      .map((coin: any) => `${coin.symbol.toUpperCase()}: ${coin.price_change_percentage_24h}%`)
      .join('\n');

    return {
      content: `Market Analysis:
• Sentiment: ${result.data.marketSentiment}
• Top Performers:
${topPerformers}
• Recommendations:
${result.data.recommendations.join('\n')}`,
      data: result.data,
      suggestions: [
        `crypto price ${result.data.topPerformers[0]?.symbol}`,
        "crypto alert",
        "crypto rules"
      ]
    };
  }

  private async handleTransactionTracking([_, txHash]: RegExpMatchArray): Promise<CryptoResponse> {
    const result = await this.cryptoAgent.executeTask('track_transaction', { txHash });
    
    if (!result.success) {
      return {
        content: `Failed to track transaction: ${result.error}`,
        suggestions: ["Check another transaction", "crypto wallet"]
      };
    }

    return {
      content: `Transaction Status:
• Status: ${result.data.status}
• Gas Price: ${result.data.gasPrice} Gwei
• ${result.data.recommendation}`,
      data: result.data,
      suggestions: [
        "crypto market",
        "crypto rules"
      ]
    };
  }

  private async handleBuyOrder([_, symbol, amount]: RegExpMatchArray): Promise<CryptoResponse> {
    const result = await this.cryptoAgent.executeTask('execute_trade', {
      type: 'buy',
      token: symbol,
      amount: amount
    });
    
    if (!result.success) {
      return {
        content: `Failed to execute buy order: ${result.error}`,
        suggestions: ["Try a different amount", "crypto price first"]
      };
    }

    return {
      content: `Buy Order Executed:
• Token: ${result.data.token.toUpperCase()}
• Amount: $${result.data.amount}
• Price: $${result.data.executionPrice}
• Time: ${result.data.timestamp}`,
      data: result.data,
      suggestions: [
        `crypto alert ${symbol}`,
        "crypto rules",
        "crypto market"
      ]
    };
  }

  private async handleSellOrder([_, symbol, amount]: RegExpMatchArray): Promise<CryptoResponse> {
    const result = await this.cryptoAgent.executeTask('execute_trade', {
      type: 'sell',
      token: symbol,
      amount: amount
    });
    
    if (!result.success) {
      return {
        content: `Failed to execute sell order: ${result.error}`,
        suggestions: ["Try a different amount", "crypto price first"]
      };
    }

    return {
      content: `Sell Order Executed:
• Token: ${result.data.token.toUpperCase()}
• Amount: $${result.data.amount}
• Price: $${result.data.executionPrice}
• Time: ${result.data.timestamp}`,
      data: result.data,
      suggestions: [
        "crypto market",
        "crypto rules"
      ]
    };
  }

  private async handleShowRules(): Promise<CryptoResponse> {
    const rules = this.automationAgent.getActiveRules();
    
    if (rules.length === 0) {
      return {
        content: "No active crypto rules found.",
        suggestions: [
          "crypto alert bitcoin at 45000",
          "crypto market"
        ]
      };
    }

    const rulesList = rules
      .map(({ ruleId, rule }) => `${ruleId}: ${rule.condition} → ${rule.action}`)
      .join('\n');

    return {
      content: `Active Crypto Rules:\n${rulesList}`,
      data: rules,
      suggestions: [
        "crypto market",
        "crypto price bitcoin"
      ]
    };
  }

  private async handleHelp(): Promise<CryptoResponse> {
    return {
      content: `Available Crypto Commands:
• crypto price [symbol] - Get current price and analysis
• crypto wallet [address] - Monitor wallet balance and activity
• crypto alert [symbol] at [price] - Set price alerts
• crypto market - Get market analysis and recommendations
• crypto tx [hash] - Track transaction status
• crypto buy [symbol] [amount] - Execute a buy order
• crypto sell [symbol] [amount] - Execute a sell order
• crypto rules - View active automation rules
• crypto help - Show this help message`,
      suggestions: [
        "crypto price bitcoin",
        "crypto market",
        "crypto wallet 0x123..."
      ]
    };
  }
}
