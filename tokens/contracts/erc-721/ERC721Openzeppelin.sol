pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ERC721Openzeppelin is ERC721Burnable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor() ERC721("IYAAS TOEKN", "IYS") public {
    }

    function awardItem(address holder, string memory tokenURI) public returns (uint256) {
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _mint(holder, newItemId);
        _setTokenURI(newItemId, tokenURI);

        return newItemId;
    }
}
