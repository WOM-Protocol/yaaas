const ERC721Openzeppelin = artifacts.require("ERC721Openzeppelin");

module.exports = function (deployer) {
  deployer.deploy(ERC721Openzeppelin);
};
