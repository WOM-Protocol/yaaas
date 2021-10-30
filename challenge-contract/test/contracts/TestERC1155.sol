pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract TestERC1155 is ERC1155 {

    constructor() public ERC1155("http://test") {
    }

    function mint(uint256 newItemId,uint256 amount) public returns (uint256) {
        _mint(msg.sender, newItemId, amount, "");
        return newItemId;
    }
}
