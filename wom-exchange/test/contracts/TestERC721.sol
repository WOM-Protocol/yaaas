// SPDX-License-Identifier: MIT

pragma solidity >=0.6.9 <0.8.1;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";

contract TestERC721 is ERC721Upgradeable {
    function mint(address to, uint assetId) external {
        _mint(to, assetId);
    }
}
