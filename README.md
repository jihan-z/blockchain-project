# Polymarket 去中心化竞猜系统

一个基于区块链的去中心化竞猜平台，支持创建竞猜项目、购买彩票、交易彩票以及自动结算奖励。系统实现了完整的 ERC721 NFT 彩票凭证、ERC20 代币支付和链上订单簿功能。

## 项目简介

本项目是一个去中心化竞猜系统，类似于 Polymarket。用户可以在平台上创建各种竞猜项目（如体育比赛、娱乐节目等），其他玩家可以购买彩票参与竞猜，并在结果公布前自由交易彩票。系统支持 ETH 和 ERC20 代币两种支付方式。

## 核心功能

### 1. 竞猜项目管理
- **创建项目**：公证人可以创建竞猜项目，设置项目名称、多个选项、结束时间和初始奖池
- **支持双币种**：项目可以选择使用 ETH 或 ERC20 代币作为支付方式
- **项目结算**：项目创建者可以在项目结束时设置获胜选项，系统自动计算奖励

### 2. 彩票购买与持有
- **购买彩票**：玩家可以选择任意选项并投入资金购买彩票
- **NFT 凭证**：每次购买都会获得一个 ERC721 NFT 作为彩票凭证
- **我的彩票**：用户可以查看自己持有的所有彩票

### 3. 链上订单簿交易
- **挂单出售**：用户可以挂单出售自己的彩票，设置出售价格
- **订单簿显示**：系统按价格自动排序，显示当前最优价格
- **最优价格购买**：买家可以按最优价格购买彩票
- **订单管理**：支持取消订单和完成交易

### 4. 奖励结算
- **自动计算**：系统根据获胜选项自动计算每个中奖彩票的奖励
- **按票分配**：所有中奖彩票持有者平分奖池
- **奖励领取**：中奖用户可以主动领取奖励（支持 ETH 和代币）

## 技术架构

### 智能合约

1. **LotteryManager.sol** - 核心管理合约
   - 管理所有竞猜项目
   - 处理彩票购买和奖励结算
   - 支持 ETH 和 ERC20 代币支付

2. **LotteryTicket.sol** - ERC721 NFT 合约
   - 彩票凭证的 NFT 实现
   - 每个彩票对应一个唯一的 NFT Token

3. **LotteryToken.sol** - ERC20 代币合约
   - 项目使用的代币标准
   - 支持代币支付和奖励发放

4. **OrderBook.sol** - 订单簿合约
   - 管理彩票交易订单
   - 实现链上订单簿功能
   - 支持最优价格匹配

### 前端技术栈

- **React** + **TypeScript** - 前端框架
- **ethers.js** - 区块链交互库
- **MetaMask** - 钱包集成

## 如何运行

### 环境要求

- Node.js >= 16.0.0
- npm 或 yarn
- Ganache 本地区块链（或其他测试网络）
- MetaMask 浏览器插件

### 1. 启动本地区块链（Ganache）

确保 Ganache 运行在 `http://localhost:8545`，并配置至少一个账户。

### 2. 部署智能合约

```bash
# 进入合约目录
cd contracts

# 安装依赖
npm install

# 编译合约
npx hardhat compile

# 部署合约（会自动部署所有合约）
npx hardhat run scripts/deployAll.ts --network ganache
```

部署完成后，会输出所有合约地址，请复制这些地址。

### 3. 配置前端合约地址

打开 `frontend/src/blockchain.ts`，将部署得到的合约地址更新到以下常量：

```typescript
export const LOTTERY_TICKET = "你的 LotteryTicket 合约地址";
export const LOTTERY_TOKEN = "你的 LotteryToken 合约地址";
export const LOTTERY_MANAGER = "你的 LotteryManager 合约地址";
export const ORDER_BOOK = "你的 OrderBook 合约地址";
```

### 4. 启动前端应用

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run start
```

前端应用将在 `http://localhost:3000` 启动。

### 5. 使用 MetaMask 连接

1. 在浏览器中打开 MetaMask
2. 添加 Ganache 网络（localhost:8545）
3. 导入 Ganache 账户的私钥到 MetaMask
4. 在前端页面点击"连接钱包"按钮

### 6. 领取测试代币（可选）

如果项目使用 ERC20 代币支付，需要先调用 LotteryToken 合约的 `mint` 或 `transfer` 函数领取测试代币。

## 使用流程

### 创建项目（公证人）

1. 进入"项目管理"页面
2. 填写项目信息：
   - 项目名称
   - 选项列表（至少 2 个）
   - 结束时间
   - 选择支付方式（ETH 或代币）
   - 初始奖池金额
3. 点击"创建项目"

### 购买彩票（玩家）

1. 进入"竞猜项目"页面
2. 选择想要参与的项目
3. 选择支持的选项
4. 输入购买金额
5. 确认交易，等待区块链确认

### 交易彩票（玩家）

1. 进入"我的彩票"页面，查看持有的彩票
2. 点击"挂单出售"，设置出售价格
3. 在"链上订单簿"页面查看订单
4. 其他玩家可以按最优价格购买

### 结算项目（公证人）

1. 项目结束后，进入"项目管理"页面
2. 选择要结算的项目
3. 选择获胜选项
4. 点击"结束项目"或"设置结果"

### 领取奖励（中奖玩家）

1. 进入"我的彩票"页面
2. 查看中奖的彩票
3. 点击"领取奖励"
4. 等待交易确认，奖励会自动发放

## 项目结构

```
.
├── contracts/              # 智能合约目录
│   ├── contracts/         # 合约源码
│   │   ├── LotteryManager.sol
│   │   ├── LotteryTicket.sol
│   │   ├── LotteryToken.sol
│   │   └── OrderBook.sol
│   ├── scripts/           # 部署脚本
│   │   └── deployAll.ts
│   └── hardhat.config.ts  # Hardhat 配置
│
└── frontend/              # 前端应用目录
    ├── src/
    │   ├── App.tsx        # 主应用组件
    │   ├── ProjectList.tsx      # 项目列表
    │   ├── MyTickets.tsx       # 我的彩票
    │   ├── OrderBook.tsx       # 订单簿
    │   ├── ProjectManager.tsx  # 项目管理
    │   └── blockchain.ts        # 区块链交互
    └── package.json
```

## 功能实现详情

### ✅ 基础功能

- [x] 公证人创建竞猜项目（支持多个选项）
- [x] 玩家购买彩票（获得 ERC721 NFT 凭证）
- [x] 彩票交易功能（ERC721 委托和转移）
- [x] 项目结算和奖励分配

### ✅ Bonus 功能

- [x] **ERC20 代币支持**（2分）：实现 LotteryToken 合约，支持使用代币购买彩票和领取奖励
- [x] **链上订单簿**（3分）：实现 OrderBook 合约，支持挂单、订单簿显示和最优价格购买

## 参考资源

- 课程参考 Demo：[DEMOs](https://github.com/LBruyne/blockchain-course-demos)
- OpenZeppelin 合约模板：[ERC20/ERC721 Wizard](https://wizard.openzeppelin.com/)
- Hardhat 文档：[Hardhat Documentation](https://hardhat.org/docs)
- Ethers.js 文档：[Ethers.js Documentation](https://docs.ethers.io/)

## 注意事项

1. **测试网络**：本项目使用 Ganache 本地测试网络，请确保 Ganache 运行正常
2. **Gas 费用**：在测试网络上操作不需要真实 Gas 费用，但需要确保账户有足够的 ETH
3. **合约授权**：交易彩票前需要先授权 OrderBook 合约转移 NFT
4. **代币余额**：使用代币支付时，确保账户有足够的代币余额

## 许可证

MIT License
