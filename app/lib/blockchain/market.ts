interface PriceData {
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
}

export class CryptoMarket {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getPrice(symbol: string): Promise<PriceData> {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true&include_market_cap=true`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch price data');
    }

    const data = await response.json();
    return {
      price: data[symbol].usd,
      change24h: data[symbol].usd_24h_change,
      volume24h: data[symbol].usd_24h_vol,
      marketCap: data[symbol].usd_market_cap
    };
  }

  async getTopCryptos(limit: number = 10): Promise<any[]> {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch top cryptocurrencies');
    }

    return await response.json();
  }

  async getMarketStats(): Promise<any> {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/global'
    );

    if (!response.ok) {
      throw new Error('Failed to fetch market statistics');
    }

    return await response.json();
  }
}
