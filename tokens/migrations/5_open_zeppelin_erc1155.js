const ERC1155Openzeppelin = artifacts.require("ERC1155Openzeppelin");

module.exports = function (deployer) {
  deployer.deploy(ERC1155Openzeppelin);
};
