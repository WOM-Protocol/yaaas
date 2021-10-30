pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";

contract TestERC1155 is ERC1155Upgradeable {


    constructor() public ERC1155Upgradeable() {
    }

    function mint(uint256 newItemId,uint256 amount) public returns (uint256) {
        _mint(msg.sender, newItemId, amount, "");
        return newItemId;
    }
}
