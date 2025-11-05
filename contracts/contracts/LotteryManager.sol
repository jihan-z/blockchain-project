// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LotteryTicket.sol";
import "./LotteryToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LotteryManager is Ownable {
    struct Project {
        string name;
        string[] options;
        uint256 endTime;
        uint256 totalPool;
        bool finished;
        uint256 winningOption;
        address creator;
        bool useToken; // 是否使用代币支付
    }
    
    struct Ticket {
        uint256 projectId;
        uint256 optionId;
        uint256 amount;
        address owner;
        bool claimed;
    }
    
    Project[] public projects;
    Ticket[] public tickets;
    LotteryTicket public ticket;
    LotteryToken public lotteryToken;
    
    // 项目ID => 选项ID => 总投注额
    mapping(uint256 => mapping(uint256 => uint256)) public optionPool;
    // 项目ID => 选项ID => 票ID列表
    mapping(uint256 => mapping(uint256 => uint256[])) public optionTickets;
    // 票ID => 项目ID
    mapping(uint256 => uint256) public ticketProject;
    // 票ID => 选项ID
    mapping(uint256 => uint256) public ticketOption;
    // 票ID => 是否已领奖
    mapping(uint256 => bool) public claimed;
    
    event ProjectCreated(uint256 indexed projectId, string name, string[] options, uint256 endTime, uint256 totalPool, bool useToken);
    event TicketBought(address indexed user, uint256 indexed projectId, uint256 indexed optionId, uint256 ticketId, uint256 amount, bool useToken);
    event ProjectFinished(uint256 indexed projectId, uint256 winningOption);
    event RewardClaimed(address indexed user, uint256 indexed ticketId, uint256 amount, bool useToken);

    constructor(address ticketAddr, address tokenAddr, address initialOwner) Ownable(initialOwner) {
        ticket = LotteryTicket(ticketAddr);
        lotteryToken = LotteryToken(tokenAddr);
    }

    // 创建项目
    function createProject(
        string memory name, 
        string[] memory options, 
        uint256 endTime, 
        bool useToken,
        uint256 tokenAmount
    ) external payable {
        require(options.length >= 2, "At least 2 options");
        require(endTime > block.timestamp, "End time must be in the future");
        
        uint256 poolAmount;
        if (useToken) {
            require(msg.value == 0, "No ETH allowed when using token");
            require(tokenAmount > 0, "Token amount must be positive");
            require(lotteryToken.transferFrom(msg.sender, address(this), tokenAmount), "Token transfer failed");
            poolAmount = tokenAmount;
        } else {
            require(msg.value > 0, "ETH pool required");
            require(tokenAmount == 0, "Token amount must be 0 when using ETH");
            poolAmount = msg.value;
        }
        
        projects.push(Project({
            name: name,
            options: options,
            endTime: endTime,
            totalPool: poolAmount,
            finished: false,
            winningOption: 0,
            creator: msg.sender,
            useToken: useToken
        }));
        
        emit ProjectCreated(projects.length - 1, name, options, endTime, poolAmount, useToken);
    }

    // 购买彩票
    function buyTicket(
        uint256 projectId, 
        uint256 optionId, 
        uint256 amount
    ) external payable returns (uint256) {
        Project storage p = projects[projectId];
        require(block.timestamp < p.endTime, "Project ended");
        require(!p.finished, "Project finished");
        require(optionId < p.options.length, "Invalid option");
        require(amount > 0, "Amount must be positive");
        
        if (p.useToken) {
            require(msg.value == 0, "No ETH allowed when using token");
            require(lotteryToken.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
        } else {
            require(msg.value == amount, "ETH amount must match");
        }
        
        // 更新奖池
        p.totalPool += amount;
        optionPool[projectId][optionId] += amount;
        
        // 创建票记录
        uint256 ticketId = tickets.length;
        tickets.push(Ticket({
            projectId: projectId,
            optionId: optionId,
            amount: amount,
            owner: msg.sender,
            claimed: false
        }));
        
        // 铸造NFT
        uint256 nftId = ticket.mint(msg.sender, projectId, optionId);
        optionTickets[projectId][optionId].push(ticketId);
        ticketProject[ticketId] = projectId;
        ticketOption[ticketId] = optionId;
        
        emit TicketBought(msg.sender, projectId, optionId, ticketId, amount, p.useToken);
        return ticketId;
    }

    // 设置结果（项目创建者）
    function setResult(uint256 projectId, uint256 winningOption) external {
        Project storage p = projects[projectId];
        require(msg.sender == p.creator, "Only creator can set result");
        require(!p.finished, "Already finished");
        require(winningOption < p.options.length, "Invalid option");
        require(block.timestamp >= p.endTime, "Project not ended yet");
        
        p.finished = true;
        p.winningOption = winningOption;
        
        emit ProjectFinished(projectId, winningOption);
    }

    // 提前结束项目（项目创建者）
    function endProject(uint256 projectId, uint256 winningOption) external {
        Project storage p = projects[projectId];
        require(msg.sender == p.creator, "Only creator can end project");
        require(!p.finished, "Already finished");
        require(block.timestamp < p.endTime, "Project already ended");
        require(winningOption < p.options.length, "Invalid option");
        
        p.finished = true;
        p.winningOption = winningOption;
        
        emit ProjectFinished(projectId, winningOption);
    }

    // 领奖
    function claimPrize(uint256 projectId) external {
        Project storage p = projects[projectId];
        require(p.finished, "Project not finished");
        
        uint256 totalWinningTickets = optionTickets[projectId][p.winningOption].length;
        require(totalWinningTickets > 0, "No winning tickets");
        
        // 计算每个中奖票的奖励
        uint256 rewardPerTicket = p.totalPool / totalWinningTickets;
        
        // 给所有中奖票的持有者发放奖励
        uint256[] memory winningTicketIds = optionTickets[projectId][p.winningOption];
        for (uint256 i = 0; i < winningTicketIds.length; i++) {
            uint256 ticketId = winningTicketIds[i];
            Ticket storage t = tickets[ticketId];
            
            // 修复：检查 NFT 的实际持有者，而不是 tickets 数组中可能过期的 owner
            address currentOwner = ticket.ownerOf(ticketId);
            
            if (!t.claimed && currentOwner == msg.sender) {
                t.claimed = true;
                
                if (p.useToken) {
                    require(lotteryToken.transfer(msg.sender, rewardPerTicket), "Token transfer failed");
                } else {
                    payable(msg.sender).transfer(rewardPerTicket);
                }
                
                emit RewardClaimed(msg.sender, ticketId, rewardPerTicket, p.useToken);
            }
        }
    }

    // 获取项目数量
    function getProjectCount() external view returns (uint256) {
        return projects.length;
    }

    // 获取项目信息
    function getProject(uint256 projectId) external view returns (
        string memory name,
        string[] memory options,
        uint256 endTime,
        uint256 totalPool,
        bool finished,
        uint256 winningOption,
        address creator,
        bool useToken
    ) {
        Project storage p = projects[projectId];
        return (p.name, p.options, p.endTime, p.totalPool, p.finished, p.winningOption, p.creator, p.useToken);
    }
    
    // 获取票信息
    function getTicket(uint256 ticketId) external view returns (
        uint256 projectId,
        uint256 optionId,
        uint256 amount,
        address owner,
        bool claimed
    ) {
        Ticket storage t = tickets[ticketId];
        return (t.projectId, t.optionId, t.amount, t.owner, t.claimed);
    }
    
    // 获取用户的所有票
    function getUserTickets(address user) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < tickets.length; i++) {
            if (tickets[i].owner == user) {
                count++;
            }
        }
        
        uint256[] memory userTickets = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < tickets.length; i++) {
            if (tickets[i].owner == user) {
                userTickets[index] = i;
                index++;
            }
        }
        
        return userTickets;
    }
}
