pragma solidity >=0.4.22 <0.9.0;
contract IYaaasExchange{
     event Swapped(
        address  buyer,
        address  seller,
        address  token,
        uint256  assetId,
        uint256  price
    );
    event Listed(
        address seller,
        address collection,
        uint256 assetId,
        address token,
        uint256 price
    );
    struct Offer{
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
        uint shareIndex;
    }
    struct Bid{
        bytes32 id;
        address bidder;
        address token;
        uint256 price;
        uint256 expiresAt;
    }
    // BID EVENTS
    event BidCreated(
      bytes32 id,
      address indexed collection,
      uint256 indexed assetId,
      address indexed bidder,
      address  token,
      uint256 price,
      uint256 expiresAt
    );
    event BidSuccessful(
        address collection,
        uint256 assetId,
        address token,
        address bidder,
        uint256 price
    );
    event BidAccepted(bytes32 id);
    event BidCancelled(bytes32 id);
}