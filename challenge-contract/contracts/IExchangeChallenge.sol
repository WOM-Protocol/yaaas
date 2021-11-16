pragma solidity >=0.6.0 <0.9.0;


/**
 * @dev Interface of the ExchangeChallenge contract 
 */
interface IExchangeChallenge {
    /**
     * @dev Returns true if this contract implements the interface defined by
     */
    struct Challenge{
        address seller;
        address collection;
        uint256 assetId;
        uint256 amount;
        bool allowResell;
        uint256 saleEnd;
        uint256 airdropStartAt;
        uint256 airdropEndAt;
    }
    /**
     * @dev Emitted when `challengeId` challenge is created.
     */
    event AddChallenge(uint id, address indexed seller, address indexed collection, uint256  assetId, uint256  amount,bool allowResell, uint256  saleEnd, uint256  airdropStartAt, uint256  airdropEndAt);
    /**
     * @dev save an offer challenge.
     */
    function addChallenge(uint id, address seller, address collection, uint256 assetId, uint256 amount, bool allowResell, uint256 saleEnd, uint256 airdropStartAt, uint256 airdropEndAt) external  returns (uint256);

    /**
     * @dev Emitted when `challengeId` challenge is created.
     */
    event AirDropChallenge(uint256 challengeId, address receiver, uint256 amount);
    /**
     * @dev airdrop NFT token
     */
    function airdropChallenge(uint challengeId, address receiver, uint256 amount) external returns (bool);
    /**
     * @dev set utility token
     */
     function setMarketToken(address token)external   returns (bool);
    /**
     * @dev set marketplace  token nft number equivalent in ERC20
     */
     function setYaaasFee(uint256 fee)external   returns (bool);
    /**
     */

    event SetMarketToken(address  token);
    event SetYaaasFee(uint256 fee);
 

}