pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155Burnable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ERC1155Openzeppelin is ERC1155Burnable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor() public ERC1155("https://token-info.com/api/item/{id}.json") {
    }

    function awardItem(uint256 amount, bytes memory data) public returns (uint256) {
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _mint(msg.sender, newItemId, amount, data);

        return newItemId;
    }
}
