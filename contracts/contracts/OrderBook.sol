// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OrderBook {
    struct Order {
        address seller;
        uint256 price;
        bool active;
        uint256 timestamp;
        bool useToken; // 是否使用代币支付
    }
    
    struct OrderBookEntry {
        uint256 ticketId;
        uint256 price;
        address seller;
        uint256 timestamp;
        bool useToken; // 是否使用代币支付
    }
    
    // ticketId => order
    mapping(uint256 => Order) public orders;
    // projectId => optionId => OrderBookEntry[] (按价格排序)
    mapping(uint256 => mapping(uint256 => OrderBookEntry[])) public orderBooks;
    IERC721 public ticket;
    IERC20 public token;

    event OrderPlaced(uint256 indexed ticketId, address indexed seller, uint256 price, bool useToken);
    event OrderCancelled(uint256 indexed ticketId);
    event OrderFilled(uint256 indexed ticketId, address indexed buyer, uint256 price, bool useToken);

    constructor(address ticketAddr, address tokenAddr) {
        ticket = IERC721(ticketAddr);
        token = IERC20(tokenAddr);
    }

    function placeOrder(uint256 ticketId, uint256 price, uint256 projectId, uint256 optionId, bool useToken) external {
        require(ticket.ownerOf(ticketId) == msg.sender, "Not owner");
        require(price > 0, "Price must be positive");
        require(!orders[ticketId].active, "Order already exists");
        
        // 检查合约是否已被授权转移NFT
        require(ticket.getApproved(ticketId) == address(this) || 
                ticket.isApprovedForAll(msg.sender, address(this)), 
                "Contract not approved for NFT transfer");
        
        orders[ticketId] = Order(msg.sender, price, true, block.timestamp, useToken);
        
        // 添加到订单簿
        OrderBookEntry memory entry = OrderBookEntry(ticketId, price, msg.sender, block.timestamp, useToken);
        orderBooks[projectId][optionId].push(entry);
        
        // 按价格排序
        _sortOrderBook(projectId, optionId);
        
        emit OrderPlaced(ticketId, msg.sender, price, useToken);
    }
    
    function _sortOrderBook(uint256 projectId, uint256 optionId) internal {
        OrderBookEntry[] storage entries = orderBooks[projectId][optionId];
        for (uint i = 0; i < entries.length - 1; i++) {
            for (uint j = 0; j < entries.length - i - 1; j++) {
                if (entries[j].price > entries[j + 1].price) {
                    OrderBookEntry memory temp = entries[j];
                    entries[j] = entries[j + 1];
                    entries[j + 1] = temp;
                }
            }
        }
    }

    function cancelOrder(uint256 ticketId, uint256 projectId, uint256 optionId) external {
        require(orders[ticketId].seller == msg.sender, "Not seller");
        require(orders[ticketId].active, "Not active");
        orders[ticketId].active = false;
        
        // 从订单簿中移除
        _removeFromOrderBook(ticketId, projectId, optionId);
        
        emit OrderCancelled(ticketId);
    }

    function fillOrder(uint256 ticketId, uint256 projectId, uint256 optionId) external payable {
        Order storage order = orders[ticketId];
        require(order.active, "Not active");
        address seller = order.seller;
        
        if (order.useToken) {
            // 使用代币支付
            require(token.transferFrom(msg.sender, seller, order.price), "Token transfer failed");
        } else {
            // 使用ETH支付
            require(msg.value == order.price, "Wrong price");
            payable(seller).transfer(msg.value);
        }
        
        order.active = false;
        
        // 从订单簿中移除
        _removeFromOrderBook(ticketId, projectId, optionId);
        
        ticket.safeTransferFrom(seller, msg.sender, ticketId);
        emit OrderFilled(ticketId, msg.sender, order.price, order.useToken);
    }
    
    function _removeFromOrderBook(uint256 ticketId, uint256 projectId, uint256 optionId) internal {
        OrderBookEntry[] storage entries = orderBooks[projectId][optionId];
        for (uint i = 0; i < entries.length; i++) {
            if (entries[i].ticketId == ticketId) {
                // 移除元素
                for (uint j = i; j < entries.length - 1; j++) {
                    entries[j] = entries[j + 1];
                }
                entries.pop();
                break;
            }
        }
    }

    function getOrder(uint256 ticketId) external view returns (address, uint256, bool, uint256) {
        Order memory o = orders[ticketId];
        return (o.seller, o.price, o.active, o.timestamp);
    }
    
    function getOrderBook(uint256 projectId, uint256 optionId) external view returns (OrderBookEntry[] memory) {
        return orderBooks[projectId][optionId];
    }
    
    function getBestPrice(uint256 projectId, uint256 optionId) external view returns (uint256) {
        OrderBookEntry[] storage entries = orderBooks[projectId][optionId];
        if (entries.length == 0) {
            return 0;
        }
        return entries[0].price; // 最低价格（最优价格）
    }
}
