import { ethers } from "hardhat";

async function main() {
  // 部署 LotteryTicket
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const LotteryTicket = await ethers.getContractFactory("LotteryTicket");
  const ticket = await LotteryTicket.deploy(deployer.address, deployer.address);
  await ticket.deployed();
  console.log("LotteryTicket deployed to:", ticket.address);

  // 部署 LotteryToken
  const LotteryToken = await ethers.getContractFactory("LotteryToken");
  const token = await LotteryToken.deploy(deployer.address);
  await token.deployed();
  console.log("LotteryToken deployed to:", token.address);

  // 部署 LotteryManager
  const LotteryManager = await ethers.getContractFactory("LotteryManager");
  const manager = await LotteryManager.deploy(ticket.address, token.address, deployer.address);
  await manager.deployed();
  console.log("LotteryManager deployed to:", manager.address);

  // 先将 LotteryTicket 的 manager 设置为 LotteryManager（确保 mint 不会因 onlyManager 回退）
  await ticket.setManager(manager.address);
  console.log("LotteryTicket manager set to LotteryManager");

  // 如需由管理合约托管 NFT 合约的 owner 权限，可再转移所有权
  await ticket.transferOwnership(manager.address);
  console.log("LotteryTicket ownership transferred to manager");

  // 部署 OrderBook
  const OrderBook = await ethers.getContractFactory("OrderBook");
  const orderBook = await OrderBook.deploy(ticket.address, token.address);
  await orderBook.deployed();
  console.log("OrderBook deployed to:", orderBook.address);
  
  console.log("\n=== 部署完成 ===");
  console.log("请更新 frontend/src/blockchain.ts 中的合约地址:");
  console.log(`LOTTERY_TICKET: "${ticket.address}"`);
  console.log(`LOTTERY_TOKEN: "${token.address}"`);
  console.log(`LOTTERY_MANAGER: "${manager.address}"`);
  console.log(`ORDER_BOOK: "${orderBook.address}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
