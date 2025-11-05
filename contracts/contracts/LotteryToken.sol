// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract LotteryToken is ERC20, Ownable {
    mapping(address => bool) public claimed;
    uint256 public constant INIT_AMOUNT = 10000 * 1e18;

    constructor(address initialOwner) ERC20("LotteryToken", "LTK") Ownable(initialOwner) {}

    function claim() external {
        require(!claimed[msg.sender], "Already claimed");
        claimed[msg.sender] = true;
        _mint(msg.sender, INIT_AMOUNT);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
