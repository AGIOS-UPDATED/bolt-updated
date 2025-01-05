import { ethers } from 'ethers';

export class TransactionManager {
  private provider: ethers.providers.JsonRpcProvider;

  constructor(providerUrl: string = 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID') {
    this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
  }

  async getTransactionHistory(address: string, startBlock: number = 0): Promise<any[]> {
    const history = [];
    const currentBlock = await this.provider.getBlockNumber();
    
    for (let i = startBlock; i <= currentBlock; i++) {
      const block = await this.provider.getBlockWithTransactions(i);
      const relevantTxs = block.transactions.filter(
        tx => tx.from === address || tx.to === address
      );
      history.push(...relevantTxs);
    }

    return history;
  }

  async getTransactionStatus(txHash: string): Promise<string> {
    const tx = await this.provider.getTransaction(txHash);
    if (!tx) return 'Not Found';

    const receipt = await this.provider.getTransactionReceipt(txHash);
    if (!receipt) return 'Pending';

    return receipt.status ? 'Confirmed' : 'Failed';
  }

  async estimateGas(from: string, to: string, value: string): Promise<string> {
    const gasEstimate = await this.provider.estimateGas({
      from,
      to,
      value: ethers.utils.parseEther(value)
    });

    return gasEstimate.toString();
  }

  async getGasPrice(): Promise<string> {
    const gasPrice = await this.provider.getGasPrice();
    return ethers.utils.formatUnits(gasPrice, 'gwei');
  }
}
