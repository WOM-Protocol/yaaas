pragma solidity >=0.4.22 <0.9.0;
contract IWoomReverseExchange{
     event RvsSwapped(
        address  buyer,
        address  seller,
        address  token,
        uint256  assetId,
        uint256  price
    );
    event RvsListed(
        address seller,
        address collection,
        uint256 assetId,
        address token,
        uint256 price
    );
    struct RvsOffer{
        bytes32 id;
        address seller;
        address collection;
        uint256 assetId;
        address token;
        bool isEther;
        uint256 price;
        bool isForSell;
        bool isForAuction;
        uint256 expiresAt;
    }
    struct RvsBid{
        bytes32 id;
        address bidder;
        uint256 expiresAt;
    }
    // BID EVENTS
    event RvsBidCreated(
      bytes32 id,
      address indexed collection,
      uint256 indexed assetId,
      address indexed bidder,
      uint256 expiresAt
    );
    event RvsBidSuccessful(
        address collection,
        uint256 assetId,
        address bidder
    );
    event RvsBidAccepted(bytes32 id);
    event RvsBidCancelled(bytes32 id);
}