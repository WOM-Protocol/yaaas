const ExchangeChallenge = artifacts.require("ExchangeChallenge");

module.exports = function (deployer) {
  deployer.deploy(ExchangeChallenge, '0xc1acb7dd45752495468afe2e9b2dc576f3d90e23');
};
