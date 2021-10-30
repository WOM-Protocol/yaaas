// SPDX-License-Identifier: MIT

pragma solidity >=0.6.9 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20("Zoo", "ZET"){
    function mint(address to, uint amount) external {
        _mint(to, amount);
    }
}
