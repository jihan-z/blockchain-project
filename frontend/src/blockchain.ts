import { ethers } from 'ethers';

// 扩展Window接口以包含ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

// ================================
// 合约地址配置
// ================================

// 部署在本地Ganache网络上的合约地址
export const CONTRACT_ADDRESSES = {
  LOTTERY_MANAGER: "0xc644ad1Bc645306cC656183ae91a7083ADc6c968",
  LOTTERY_TICKET: "0x53CC186d8B3eD61C7d2aa64B4e6Fa64E89825D55",
  LOTTERY_TOKEN: "0x3e36e22bE1FCdE1081a6d7F13e085c3F63d41dEC",
  ORDER_BOOK: "0x963444C30C181B3D9b10725a8Db92F1CBA0D9CF3",
  EASY_BET: "0x0000000000000000000000000000000000000000" // 需要部署后更新
};

// ================================
// 合约ABI定义
// ================================

// LotteryManager合约ABI
export const LOTTERY_MANAGER_ABI = [
  // 构造函数
  {"inputs":[{"internalType":"address","name":"ticketAddr","type":"address"},{"internalType":"address","name":"tokenAddr","type":"address"},{"internalType":"address","name":"initialOwner","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
  
  // 错误定义
  {"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},
  
  // 事件定义
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"projectId","type":"uint256"},{"indexed":false,"internalType":"string","name":"name","type":"string"},{"indexed":false,"internalType":"string[]","name":"options","type":"string[]"},{"indexed":false,"internalType":"uint256","name":"endTime","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"totalPool","type":"uint256"},{"indexed":false,"internalType":"bool","name":"useToken","type":"bool"}],"name":"ProjectCreated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"projectId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"winningOption","type":"uint256"}],"name":"ProjectFinished","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"ticketId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"bool","name":"useToken","type":"bool"}],"name":"RewardClaimed","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"projectId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"optionId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"ticketId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"bool","name":"useToken","type":"bool"}],"name":"TicketBought","type":"event"},
  
  // 状态变量
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"claimed","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"optionPool","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"optionTickets","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"projects","outputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"uint256","name":"totalPool","type":"uint256"},{"internalType":"bool","name":"finished","type":"bool"},{"internalType":"uint256","name":"winningOption","type":"uint256"},{"internalType":"address","name":"creator","type":"address"},{"internalType":"bool","name":"useToken","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"ticketOption","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"ticketProject","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"tickets","outputs":[{"internalType":"uint256","name":"projectId","type":"uint256"},{"internalType":"uint256","name":"optionId","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"bool","name":"claimed","type":"bool"}],"stateMutability":"view","type":"function"},
  
  // 主要功能函数
  {"inputs":[{"internalType":"uint256","name":"projectId","type":"uint256"},{"internalType":"uint256","name":"optionId","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"buyTicket","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"payable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"projectId","type":"uint256"}],"name":"claimPrize","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string[]","name":"options","type":"string[]"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"bool","name":"useToken","type":"bool"},{"internalType":"uint256","name":"tokenAmount","type":"uint256"}],"name":"createProject","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"projectId","type":"uint256"},{"internalType":"uint256","name":"winningOption","type":"uint256"}],"name":"endProject","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"projectId","type":"uint256"}],"name":"getProject","outputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string[]","name":"options","type":"string[]"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"uint256","name":"totalPool","type":"uint256"},{"internalType":"bool","name":"finished","type":"bool"},{"internalType":"uint256","name":"winningOption","type":"uint256"},{"internalType":"address","name":"creator","type":"address"},{"internalType":"bool","name":"useToken","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getProjectCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"ticketId","type":"uint256"}],"name":"getTicket","outputs":[{"internalType":"uint256","name":"projectId","type":"uint256"},{"internalType":"uint256","name":"optionId","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"bool","name":"claimed","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserTickets","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"projectId","type":"uint256"},{"internalType":"uint256","name":"winningOption","type":"uint256"}],"name":"setResult","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"ticket","outputs":[{"internalType":"contract LotteryTicket","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"}
];

// LotteryTicket合约ABI
export const LOTTERY_TICKET_ABI = [
  {"inputs":[{"internalType":"address","name":"_manager","type":"address"},{"internalType":"address","name":"initialOwner","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
  {"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"address","name":"owner","type":"address"}],"name":"ERC721IncorrectOwner","type":"error"},
  {"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ERC721InsufficientApproval","type":"error"},
  {"inputs":[{"internalType":"address","name":"approver","type":"address"}],"name":"ERC721InvalidApprover","type":"error"},
  {"inputs":[{"internalType":"address","name":"operator","type":"address"}],"name":"ERC721InvalidOperator","type":"error"},
  {"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"ERC721InvalidOwner","type":"error"},
  {"inputs":[{"internalType":"address","name":"receiver","type":"address"}],"name":"ERC721InvalidReceiver","type":"error"},
  {"inputs":[{"internalType":"address","name":"spender","type":"address"}],"name":"ERC721InvalidSpender","type":"error"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},
  {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"projectId","type":"uint256"},{"internalType":"uint256","name":"optionId","type":"uint256"}],"name":"mint","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getTicketInfo","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenOfOwnerByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}
];

// LotteryToken合约ABI
export const LOTTERY_TOKEN_ABI = [
  {"inputs":[{"internalType":"address","name":"initialOwner","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
  {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"allowance","type":"uint256"},{"internalType":"uint256","name":"needed","type":"uint256"}],"name":"ERC20InsufficientAllowance","type":"error"},
  {"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"uint256","name":"needed","type":"uint256"}],"name":"ERC20InsufficientBalance","type":"error"},
  {"inputs":[{"internalType":"address","name":"approver","type":"address"}],"name":"ERC20InvalidApprover","type":"error"},
  {"inputs":[{"internalType":"address","name":"receiver","type":"address"}],"name":"ERC20InvalidReceiver","type":"error"},
  {"inputs":[{"internalType":"address","name":"sender","type":"address"}],"name":"ERC20InvalidSender","type":"error"},
  {"inputs":[{"internalType":"address","name":"spender","type":"address"}],"name":"ERC20InvalidSpender","type":"error"},
  {"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},
  {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"claim","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"claimed","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}
];

// OrderBook合约ABI
export const ORDER_BOOK_ABI = [
  {"inputs":[{"internalType":"address","name":"ticketAddr","type":"address"},{"internalType":"address","name":"tokenAddr","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"ticketId","type":"uint256"}],"name":"OrderCancelled","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"ticketId","type":"uint256"},{"indexed":true,"internalType":"address","name":"buyer","type":"address"},{"indexed":false,"internalType":"uint256","name":"price","type":"uint256"},{"indexed":false,"internalType":"bool","name":"useToken","type":"bool"}],"name":"OrderFilled","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"ticketId","type":"uint256"},{"indexed":true,"internalType":"address","name":"seller","type":"address"},{"indexed":false,"internalType":"uint256","name":"price","type":"uint256"},{"indexed":false,"internalType":"bool","name":"useToken","type":"bool"}],"name":"OrderPlaced","type":"event"},
  {"inputs":[{"internalType":"uint256","name":"ticketId","type":"uint256"},{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"uint256","name":"projectId","type":"uint256"},{"internalType":"uint256","name":"optionId","type":"uint256"},{"internalType":"bool","name":"useToken","type":"bool"}],"name":"placeOrder","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"ticketId","type":"uint256"},{"internalType":"uint256","name":"projectId","type":"uint256"},{"internalType":"uint256","name":"optionId","type":"uint256"}],"name":"cancelOrder","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"ticketId","type":"uint256"},{"internalType":"uint256","name":"projectId","type":"uint256"},{"internalType":"uint256","name":"optionId","type":"uint256"}],"name":"fillOrder","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"ticketId","type":"uint256"}],"name":"getOrder","outputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bool","name":"","type":"bool"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"projectId","type":"uint256"},{"internalType":"uint256","name":"optionId","type":"uint256"}],"name":"getOrderBook","outputs":[{"components":[{"internalType":"uint256","name":"ticketId","type":"uint256"},{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"address","name":"seller","type":"address"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"bool","name":"useToken","type":"bool"}],"internalType":"struct OrderBook.OrderBookEntry[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"projectId","type":"uint256"},{"internalType":"uint256","name":"optionId","type":"uint256"}],"name":"getBestPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
];

// EasyBet合约ABI
export const EASY_BET_ABI = [
  {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"price","type":"uint256"},{"indexed":false,"internalType":"address","name":"owner","type":"address"}],"name":"BetPlaced","type":"event"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"activities","outputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"listedTimestamp","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"helloworld","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"}
];

// ================================
// TypeScript 类型定义
// ================================

export interface Project {
  name: string;
  options: string[];
  endTime: number;
  totalPool: string;
  finished: boolean;
  winningOption: number;
  creator: string;
  useToken: boolean;
}

export interface Ticket {
  projectId: number;
  optionId: number;
  amount: string;
  owner: string;
  claimed: boolean;
}

export interface OrderBookEntry {
  tokenId: number;
  price: string;
  seller: string;
  timestamp: number;
  useToken: boolean;
}

export interface Order {
  seller: string;
  price: string;
  active: boolean;
  timestamp: number;
  useToken: boolean;
}

// ================================
// 区块链连接和工具函数
// ================================

/**
 * 获取以太坊提供者
 */
export function getProvider(): ethers.BrowserProvider | ethers.JsonRpcProvider {
  if (typeof window.ethereum !== 'undefined') {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return new ethers.JsonRpcProvider('http://localhost:8545');
}

/**
 * 获取合约实例（只读）
 */
export function getContract(address: string, abi: any[]): ethers.Contract {
  const provider = getProvider();
  return new ethers.Contract(address, abi, provider);
}

/**
 * 获取带签名的合约实例（用于写入操作）
 */
export async function getSignedContract(address: string, abi: any[]): Promise<ethers.Contract> {
  const provider = getProvider();
  const signer = await provider.getSigner();
  return new ethers.Contract(address, abi, signer);
}

/**
 * 获取当前账户地址
 */
export async function getCurrentAccount(): Promise<string> {
  const provider = getProvider();
  const signer = await provider.getSigner();
  return signer.getAddress();
}

/**
 * 检查是否已连接钱包
 */
export function isWalletConnected(): boolean {
  return typeof window.ethereum !== 'undefined' && window.ethereum.isConnected();
}

/**
 * 连接钱包
 */
export async function connectWallet(): Promise<string[]> {
  if (typeof window.ethereum !== 'undefined') {
    return await window.ethereum.request({ method: 'eth_requestAccounts' });
  }
  throw new Error('MetaMask not detected');
}

/**
 * 获取网络信息
 */
export async function getNetwork(): Promise<ethers.Network> {
  const provider = getProvider();
  return provider.getNetwork();
}

/**
 * 获取账户余额
 */
export async function getBalance(address: string): Promise<string> {
  const provider = getProvider();
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

// ================================
// 智能合约交互函数
// ================================

/**
 * 获取 LotteryManager 合约实例
 */
export function getLotteryManagerContract(signer?: ethers.Signer): ethers.BaseContract {
  const provider = getProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTERY_MANAGER, LOTTERY_MANAGER_ABI, provider);
  return signer ? contract.connect(signer) : contract;
}

/**
 * 获取 LotteryTicket 合约实例
 */
export function getLotteryTicketContract(signer?: ethers.Signer): ethers.BaseContract {
  const provider = getProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTERY_TICKET, LOTTERY_TICKET_ABI, provider);
  return signer ? contract.connect(signer) : contract;
}

/**
 * 获取 LotteryToken 合约实例
 */
export function getLotteryTokenContract(signer?: ethers.Signer): ethers.BaseContract {
  const provider = getProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESSES.LOTTERY_TOKEN, LOTTERY_TOKEN_ABI, provider);
  return signer ? contract.connect(signer) : contract;
}

/**
 * 获取 OrderBook 合约实例
 */
export function getOrderBookContract(signer?: ethers.Signer): ethers.BaseContract {
  const provider = getProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESSES.ORDER_BOOK, ORDER_BOOK_ABI, provider);
  return signer ? contract.connect(signer) : contract;
}

/**
 * 获取 EasyBet 合约实例
 */
export function getEasyBetContract(signer?: ethers.Signer): ethers.BaseContract {
  const provider = getProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESSES.EASY_BET, EASY_BET_ABI, provider);
  return signer ? contract.connect(signer) : contract;
}

// ================================
// LotteryManager 功能函数
// ================================

/**
 * 获取项目数量
 */
export async function getProjectCount(): Promise<number> {
  const contract = getLotteryManagerContract() as ethers.Contract;
  const count = await contract.getProjectCount();
  return Number(count);
}

/**
 * 获取项目信息
 */
export async function getProject(projectId: number): Promise<Project> {
  const contract = getLotteryManagerContract() as ethers.Contract;
  const project = await contract.getProject(projectId);
  return {
    name: project[0],
    options: project[1],
    endTime: Number(project[2]),
    totalPool: ethers.formatEther(project[3]),
    finished: project[4],
    winningOption: Number(project[5]),
    creator: project[6],
    useToken: project[7]
  };
}

/**
 * 获取所有项目
 */
export async function getAllProjects(): Promise<Project[]> {
  const count = await getProjectCount();
  const projects: Project[] = [];
  
  for (let i = 0; i < count; i++) {
    const project = await getProject(i);
    projects.push(project);
  }
  
  return projects;
}

/**
 * 创建新项目
 */
export async function createProject(
  name: string,
  options: string[],
  endTime: number,
  poolAmount: string,
  useToken: boolean
): Promise<ethers.TransactionResponse> {
  const signer = await getProvider().getSigner();
  const contract = getLotteryManagerContract(signer) as ethers.Contract;
  const amountWei = ethers.parseEther(poolAmount);
  
  if (useToken) {
    // 先授权代币
    const tokenContract = getLotteryTokenContract(signer) as ethers.Contract;
    const approveTx = await tokenContract.approve(CONTRACT_ADDRESSES.LOTTERY_MANAGER, amountWei);
    await approveTx.wait();
    
    return await contract.createProject(name, options, endTime, useToken, amountWei);
  } else {
    return await contract.createProject(name, options, endTime, useToken, 0, {
      value: amountWei
    });
  }
}

/**
 * 购买彩票
 */
export async function buyTicket(
  projectId: number,
  optionId: number,
  amount: string,
  useToken: boolean
): Promise<ethers.TransactionResponse> {
  const signer = await getProvider().getSigner();
  const contract = getLotteryManagerContract(signer) as ethers.Contract;
  
  if (useToken) {
    const tokenContract = getLotteryTokenContract(signer) as ethers.Contract;
    const amountWei = ethers.parseEther(amount);
    
    // 先批准代币转账
    await tokenContract.approve(CONTRACT_ADDRESSES.LOTTERY_MANAGER, amountWei);
    
    return await contract.buyTicket(projectId, optionId, amountWei);
  } else {
    const amountWei = ethers.parseEther(amount);
    return await contract.buyTicket(projectId, optionId, amountWei, {
      value: amountWei
    });
  }
}

/**
 * 设置项目结果
 */
export async function setResult(projectId: number, winningOption: number, signer: ethers.Signer): Promise<any> {
  const contract = getLotteryManagerContract(signer) as ethers.Contract;
  return await contract.setResult(projectId, winningOption);
}

/**
 * 提前结束项目
 */
export async function endProject(projectId: number, signer?: ethers.Signer): Promise<ethers.TransactionResponse> {
  const _signer = signer || await getProvider().getSigner();
  const contract = getLotteryManagerContract(_signer) as ethers.Contract;
  return await contract.endProject(projectId);
}

/**
 * 领取奖励
 */
export async function claimPrize(projectId: number, signer?: ethers.Signer): Promise<ethers.TransactionResponse> {
  const _signer = signer || await getProvider().getSigner();
  const contract = getLotteryManagerContract(_signer) as ethers.Contract;
  return await contract.claimPrize(projectId);
}

/**
 * 获取用户票券
 */
export async function getUserTickets(userAddress: string): Promise<number[]> {
  const contract = getLotteryManagerContract() as ethers.Contract;
  const tickets = await contract.getUserTickets(userAddress);
  return tickets.map((ticket: any) => Number(ticket));
}

/**
 * 获取票券信息
 */
export async function getTicket(ticketId: number): Promise<Ticket> {
  const contract = getLotteryManagerContract() as ethers.Contract;
  const ticket = await contract.getTicket(ticketId);
  return {
    projectId: Number(ticket[0]),
    optionId: Number(ticket[1]),
    amount: ethers.formatEther(ticket[2]),
    owner: ticket[3],
    claimed: ticket[4]
  };
}

// ================================
// LotteryToken 功能函数
// ================================

/**
 * 领取测试代币
 */
export async function claimTokens(signer: ethers.Signer): Promise<any> {
  const contract = getLotteryTokenContract(signer) as ethers.Contract;
  return await contract.claim();
}

/**
 * 获取代币余额
 */
export async function getTokenBalance(address: string): Promise<string> {
  const contract = getLotteryTokenContract() as ethers.Contract;
  const balance = await contract.balanceOf(address);
  return ethers.formatEther(balance);
}

/**
 * 检查是否已领取代币
 */
export async function hasClaimedTokens(address: string): Promise<boolean> {
  const contract = getLotteryTokenContract() as ethers.Contract;
  return await contract.claimed(address);
}

/**
 * 批准代币花费
 */
export async function approveTokens(spender: string, amount: string, signer?: ethers.Signer): Promise<ethers.TransactionResponse> {
  const _signer = signer || await getProvider().getSigner();
  const contract = getLotteryTokenContract(_signer) as ethers.Contract;
  const amountWei = ethers.parseEther(amount);
  return await contract.approve(spender, amountWei);
}

// ================================
// LotteryTicket 功能函数
// ================================

/**
 * 获取用户NFT票券余额
 */
export async function getTicketBalance(userAddress: string): Promise<number> {
  const contract = getLotteryTicketContract() as ethers.Contract;
  const balance = await contract.balanceOf(userAddress);
  return Number(balance);
}

/**
  * 获取用户票券ID列表
 */
export async function getUserTicketIds(userAddress: string): Promise<number[]> {
  const contract = getLotteryTicketContract() as ethers.Contract;
  const balance = await contract.balanceOf(userAddress);
  const ticketIds: number[] = [];
  
  for (let i = 0; i < balance; i++) {
    const ticketId = await contract.tokenOfOwnerByIndex(userAddress, i);
    ticketIds.push(Number(ticketId));
  }
  
  return ticketIds;
}

/**
 * 获取票券信息
 */
export async function getTicketInfo(ticketId: number): Promise<{ projectId: number; optionId: number }> {
  const contract = getLotteryTicketContract() as ethers.Contract;
  const info = await contract.getTicketInfo(ticketId);
  return {
    projectId: Number(info[0]),
    optionId: Number(info[1])
  };
}

/**
 * 获取票券所有者
 */
export async function getTicketOwner(ticketId: number): Promise<string> {
  const contract = getLotteryTicketContract() as ethers.Contract;
  return await contract.ownerOf(ticketId);
}

// ================================
// OrderBook 功能函数
// ================================

/**
 * 下单
 */
export async function placeOrder(
  ticketId: number,
  price: string,
  projectId: number,
  optionId: number,
  useToken: boolean
): Promise<ethers.TransactionResponse> {
  const signer = await getProvider().getSigner();
  const ticketContract = getLotteryTicketContract(signer) as ethers.Contract;
  const contract = getOrderBookContract(signer) as ethers.Contract;
  
  // 先批准NFT转账并等待确认
  const approveTx = await ticketContract.approve(CONTRACT_ADDRESSES.ORDER_BOOK, ticketId);
  await approveTx.wait();
  
  const priceWei = ethers.parseEther(price);
  return await contract.placeOrder(ticketId, priceWei, projectId, optionId, useToken);
}

/**
 * 取消订单
 */
export async function cancelOrder(ticketId: number, projectId: number, optionId: number): Promise<ethers.TransactionResponse> {
  const signer = await getProvider().getSigner();
  const contract = getOrderBookContract(signer) as ethers.Contract;
  return await contract.cancelOrder(ticketId, projectId, optionId);
}

/**
 * 成交订单
 */
export async function fillOrder(ticketId: number, projectId: number, optionId: number, price: string, useToken: boolean): Promise<ethers.TransactionResponse> {
  const signer = await getProvider().getSigner();
  const contract = getOrderBookContract(signer) as ethers.Contract;
  
  if (useToken) {
    const tokenContract = getLotteryTokenContract(signer) as ethers.Contract;
    const priceWei = ethers.parseEther(price);
    
    // 先批准代币转账
    await (tokenContract as ethers.Contract).approve(CONTRACT_ADDRESSES.ORDER_BOOK, priceWei);
    
    return await contract.fillOrder(ticketId, projectId, optionId);
  } else {
    const priceWei = ethers.parseEther(price);
    return await contract.fillOrder(ticketId, projectId, optionId, {
      value: priceWei
    });
  }
}

/**
 * 获取订单信息
 */
export async function getOrder(ticketId: number): Promise<Order> {
  const contract = getOrderBookContract() as ethers.Contract;
  const order = await contract.getOrder(ticketId);
  return {
    seller: order[0],
    price: ethers.formatEther(order[1]),
    active: order[2],
    timestamp: Number(order[3]),
    useToken: order[4]
  };
}

/**
 * 获取订单簿
 */
export async function getOrderBook(projectId: number, optionId: number): Promise<OrderBookEntry[]> {
  const contract = getOrderBookContract() as ethers.Contract;
  const orders = await contract.getOrderBook(projectId, optionId);
  
  return orders.map((order: any) => ({
    tokenId: Number(order.ticketId), // ABI 中字段名是 ticketId
    price: ethers.formatEther(order.price),
    seller: order.seller,
    timestamp: Number(order.timestamp),
    useToken: order.useToken
  }));
}

/**
 * 获取最优价格
 */
export async function getBestPrice(projectId: number, optionId: number): Promise<string> {
  const contract = getOrderBookContract() as ethers.Contract;
  const price = await contract.getBestPrice(projectId, optionId);
  return ethers.formatEther(price);
}

// ================================
// EasyBet 功能函数
// ================================

/**
 * 测试函数
 */
export async function helloWorld(): Promise<string> {
  const contract = getEasyBetContract() as ethers.Contract;
  return await contract.helloworld();
}

/**
 * 获取活动信息
 */
export async function getActivity(activityId: number): Promise<{ owner: string; listedTimestamp: number }> {
  const contract = getEasyBetContract() as ethers.Contract;
  const activity = await contract.activities(activityId);
  return {
    owner: activity[0],
    listedTimestamp: Number(activity[1])
  };
}

// ================================
// 事件监听函数
// ================================

/**
 * 监听项目创建事件
 */
export function onProjectCreated(callback: (projectId: number, name: string, options: string[], endTime: number, totalPool: string, useToken: boolean) => void): () => void {
  const contract = getLotteryManagerContract() as ethers.Contract;
  const filter = contract.filters.ProjectCreated();
  
  contract.on(filter, (projectId, name, options, endTime, totalPool, useToken) => {
    callback(
      Number(projectId),
      name,
      options,
      Number(endTime),
      ethers.formatEther(totalPool),
      useToken
    );
  });
  
  return () => contract.off(filter);
}

/**
 * 监听票券购买事件
 */
export function onTicketBought(callback: (user: string, projectId: number, optionId: number, ticketId: number, amount: string, useToken: boolean) => void): () => void {
  const contract = getLotteryManagerContract();
  const filter = contract.filters.TicketBought();
  
  contract.on(filter, (user, projectId, optionId, ticketId, amount, useToken) => {
    callback(
      user,
      Number(projectId),
      Number(optionId),
      Number(ticketId),
      ethers.formatEther(amount),
      useToken
    );
  });
  
  return () => contract.off(filter);
}

/**
 * 监听项目结束事件
 */
export function onProjectFinished(callback: (projectId: number, winningOption: number) => void): () => void {
  const contract = getLotteryManagerContract();
  const filter = contract.filters.ProjectFinished();
  
  contract.on(filter, (projectId, winningOption) => {
    callback(Number(projectId), Number(winningOption));
  });
  
  return () => contract.off(filter);
}

/**
 * 监听奖励领取事件
 */
export function onRewardClaimed(callback: (user: string, ticketId: number, amount: string, useToken: boolean) => void): () => void {
  const contract = getLotteryManagerContract();
  const filter = contract.filters.RewardClaimed();
  
  contract.on(filter, (user, ticketId, amount, useToken) => {
    callback(
      user,
      Number(ticketId),
      ethers.formatEther(amount),
      useToken
    );
  });
  
  return () => contract.off(filter);
}

// ================================
// 工具函数
// ================================

/**
 * 格式化以太币金额
 */
export function formatEther(value: ethers.BigNumberish): string {
  return ethers.formatEther(value);
}

/**
 * 解析以太币金额
 */
export function parseEther(value: string): bigint {
  return ethers.parseEther(value);
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

/**
 * 检查项目是否已结束
 */
export function isProjectEnded(project: Project): boolean {
  return project.finished || Date.now() / 1000 > project.endTime;
}

/**
 * 检查项目是否可领奖
 */
export function canClaimPrize(project: Project): boolean {
  return project.finished && project.winningOption >= 0;
}

/**
 * 等待交易确认
 */
export async function waitForTransaction(txHash: string): Promise<ethers.TransactionReceipt | null> {
  const provider = getProvider();
  return await provider.waitForTransaction(txHash);
}

/**
 * 获取交易收据
 */
export async function getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
  const provider = getProvider();
  return await provider.getTransactionReceipt(txHash);
}

// ================================
// 错误处理函数
// ================================

/**
 * 处理合约调用错误
 */
export function handleContractError(error: any): string {
  if (error.code === 'ACTION_REJECTED') {
    return '用户取消了交易';
  } else if (error.code === 'NETWORK_ERROR') {
    return '网络错误，请检查网络连接';
  } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    return '交易失败，请检查输入参数';
  } else if (error.reason) {
    return error.reason;
  } else if (error.message) {
    return error.message;
  } else {
    return '未知错误';
  }
}

/**
 * 检查钱包是否安装
 */
export function checkWalletInstalled(): boolean {
  return typeof window.ethereum !== 'undefined';
}

/**
 * 切换到正确的网络（如果需要）
 */
export async function switchNetwork(chainId: string): Promise<boolean> {
  if (!checkWalletInstalled()) {
    return false;
  }
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }],
    });
    return true;
  } catch (error: any) {
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId,
            chainName: 'Local Network',
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: ['http://localhost:8545']
          }],
        });
        return true;
      } catch (addError) {
        return false;
      }
    }
    return false;
  }
}

// 向后兼容旧版本的导出
export const LOTTERY_MANAGER_ADDRESS = CONTRACT_ADDRESSES.LOTTERY_MANAGER;
export const LOTTERY_TICKET_ADDRESS = CONTRACT_ADDRESSES.LOTTERY_TICKET;
export const LOTTERY_TOKEN_ADDRESS = CONTRACT_ADDRESSES.LOTTERY_TOKEN;
export const ORDER_BOOK_ADDRESS = CONTRACT_ADDRESSES.ORDER_BOOK;
export const EASY_BET_ADDRESS = CONTRACT_ADDRESSES.EASY_BET;
