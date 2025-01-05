import { ethers } from 'ethers';

export class SmartContractManager {
  private provider: ethers.providers.JsonRpcProvider;

  constructor(providerUrl: string = 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID') {
    this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
  }

  async deployContract(
    wallet: ethers.Wallet,
    abi: any[],
    bytecode: string,
    ...args: any[]
  ): Promise<ethers.Contract> {
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const contract = await factory.deploy(...args);
    await contract.deployed();
    return contract;
  }

  async interactWithContract(
    contractAddress: string,
    abi: any[],
    method: string,
    wallet: ethers.Wallet,
    ...args: any[]
  ): Promise<any> {
    const contract = new ethers.Contract(contractAddress, abi, wallet);
    return await contract[method](...args);
  }

  async getContractEvents(
    contractAddress: string,
    abi: any[],
    eventName: string,
    fromBlock: number = 0
  ): Promise<ethers.Event[]> {
    const contract = new ethers.Contract(contractAddress, abi, this.provider);
    const filter = contract.filters[eventName]();
    return await contract.queryFilter(filter, fromBlock);
  }

  async estimateContractGas(
    contractAddress: string,
    abi: any[],
    method: string,
    ...args: any[]
  ): Promise<string> {
    const contract = new ethers.Contract(contractAddress, abi, this.provider);
    const gasEstimate = await contract.estimateGas[method](...args);
    return gasEstimate.toString();
  }
}
