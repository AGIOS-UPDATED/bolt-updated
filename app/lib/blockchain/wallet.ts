import { ethers } from 'ethers';

export class CryptoWallet {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet | null = null;

  constructor(providerUrl: string = 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID') {
    this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
  }

  async createWallet(): Promise<string> {
    this.wallet = ethers.Wallet.createRandom().connect(this.provider);
    return this.wallet.address;
  }

  async importWallet(privateKey: string): Promise<string> {
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    return this.wallet.address;
  }

  async getBalance(address?: string): Promise<string> {
    const targetAddress = address || this.wallet?.address;
    if (!targetAddress) throw new Error('No wallet address specified');
    
    const balance = await this.provider.getBalance(targetAddress);
    return ethers.utils.formatEther(balance);
  }

  async sendTransaction(to: string, amount: string): Promise<ethers.providers.TransactionResponse> {
    if (!this.wallet) throw new Error('Wallet not initialized');

    const tx = await this.wallet.sendTransaction({
      to,
      value: ethers.utils.parseEther(amount)
    });

    return tx;
  }

  getAddress(): string {
    if (!this.wallet) throw new Error('Wallet not initialized');
    return this.wallet.address;
  }
}
