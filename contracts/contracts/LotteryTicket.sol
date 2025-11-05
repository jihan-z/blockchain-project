// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract LotteryTicket is ERC721Enumerable, Ownable {
    uint256 public nextTokenId;
    address public manager;

    struct TicketInfo {
        uint256 projectId;
        uint256 optionId;
    }
    mapping(uint256 => TicketInfo) public ticketInfo;

    modifier onlyManager() {
        require(msg.sender == manager, "Not manager");
        _;
    }

    constructor(address _manager, address initialOwner) ERC721("LotteryTicket", "LTK") Ownable(initialOwner) {
        manager = _manager;
    }

    function setManager(address _manager) external onlyOwner {
        manager = _manager;
    }

    function mint(address to, uint256 projectId, uint256 optionId) external onlyManager returns (uint256) {
        uint256 tokenId = nextTokenId++;
        _mint(to, tokenId);
        ticketInfo[tokenId] = TicketInfo(projectId, optionId);
        return tokenId;
    }

    function burn(uint256 tokenId) external onlyManager {
        _burn(tokenId);
        delete ticketInfo[tokenId];
    }

    function getTicketInfo(uint256 tokenId) external view returns (uint256, uint256) {
        TicketInfo memory info = ticketInfo[tokenId];
        return (info.projectId, info.optionId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
