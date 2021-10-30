pragma solidity >=0.4.22 <0.9.0;

import "./IERC20.sol";
import "./Ownable.sol";
import "./ERC721Validator.sol";
import "./IWoomReverseExchange.sol";
import "./IERC721Receiver.sol";
import "./SafeMath.sol";
contract WoomReverseExchange is Ownable, ERC721Validator, IWoomReverseExchange{
    mapping(address=> mapping(uint  => RvsOffer)) public rvsOffers;
    using SafeMath for uint256;
    // For auctions bid by bider, collection and assetId
    mapping(address => mapping( uint256 => mapping(address => RvsBid))) public rvsbidforAuctions;
    uint public rvsOwnerShare = 1;
    function rvsAddOffer(
        address _seller,
        address _collection,
        uint256 _assetId,
        address _token,
        bool isEther,
        uint256 _price,
        bool isForSell,
        bool isForAuction,
        uint256 expiresAt
        )
       public returns (bool success) {
        // get NFT asset from seller
        IERC721 nftCollection = _requireERC721(_collection);
        require(nftCollection.ownerOf(_assetId) == _msgSender(), "Transfer caller is not owner");
        require(_seller == _msgSender(), "Seller should be equals owner");
        require(nftCollection.isApprovedForAll(_msgSender(), address(this)), "Contract not approved");
        // Create bid
        require( IERC20(_token).allowance(_msgSender(), address(this)) >= _price , "NFT Marketplace: Allowance error");
        bytes32 OfferId =
        keccak256(
          abi.encodePacked(
            block.timestamp,
            _msgSender(),
            _collection,
            _assetId,
            expiresAt
          )
        );
        rvsOffers[_collection][_assetId] = RvsOffer(
            OfferId,
            _seller,
            _collection,
            _assetId,
            _token,
            isEther,
            _price,
            isForSell,
            isForAuction,
            expiresAt
        );
        nftCollection.safeTransferFrom(_seller, address(this), _assetId);
        emit RvsListed(_seller,_collection, _assetId, _token, _price);
        return true;
    }
    function rvsSetOfferPrice(address collection, uint256 assetId, uint price ) public  returns(bool){
        RvsOffer storage offer = _rvsGetOwnerOffer(collection, assetId);
        offer.price = price;
        return true;
    }
    function rvsSetForSell(address collection, uint256 assetId, bool isForSell) public  returns(bool){
        RvsOffer storage offer = _rvsGetOwnerOffer(collection, assetId);
        IERC721 nftCollection = _requireERC721(collection);
        offer.isForSell = isForSell;
        if(!isForSell){
          nftCollection.safeTransferFrom(address(this), _msgSender(), assetId);
        }else{
          nftCollection.safeTransferFrom(_msgSender(), address(this), assetId);
        }  
        return true;
    }
    function rvsSetForAuction(address collection, uint256 assetId, bool isForAuction)public returns(bool){
        RvsOffer storage offer = _rvsGetOwnerOffer(collection, assetId);
        offer.isForAuction = isForAuction;
        return true;
    }
    function rvsSetExpiresAt(address collection, uint256 assetId, uint256 expiresAt)public returns(bool){
        RvsOffer storage offer = _rvsGetOwnerOffer(collection, assetId);
        offer.expiresAt = expiresAt;
        return true;
    }
    function _rvsGetOwnerOffer(address collection, uint256 assetId)internal view returns (RvsOffer storage){
        RvsOffer storage offer = rvsOffers[collection][assetId];
        require(_msgSender() == offer.seller, "Marketplace: invalid owner");
        return offer;
    }

  function rvsSafePlaceBid(
    address _collection,
    uint256 _assetId,
    uint256 _expiresAt
  ) public {
    _rvsCreateBid(_collection, _assetId, _expiresAt);
  }
  function rvsSetOwnerShare(
    uint newShare
  ) public onlyOwner{
    rvsOwnerShare = newShare;
  }

  function _rvsCreateBid(
    address _collection,
    uint256 _assetId,
    uint256 _expiresAt
  ) internal {
    // Checks order validity
    RvsOffer memory offer = rvsOffers[_collection][_assetId];
    // check on expire time
    if ( _expiresAt > offer.expiresAt ) {
      _expiresAt = offer.expiresAt;
    }
    // Check price if theres previous a bid
    RvsBid memory bid = rvsbidforAuctions[_collection][_assetId][_msgSender()];
    require(bid.id == 0 , "bid already exists");
    require(offer.isForAuction,"NFT Marketplace: NFT token not in sell");
    // Create bid
    bytes32 bidId =
      keccak256(
        abi.encodePacked(
          block.timestamp,
          msg.sender,
          _expiresAt
        )
      );

    // Save RvsBid for this order
    rvsbidforAuctions[_collection][_assetId][_msgSender()] = RvsBid({
      id: bidId,
      bidder: _msgSender(),
      expiresAt: _expiresAt
    });

    emit RvsBidCreated(
       bidId,
      _collection,
      _assetId,
      _msgSender(), // bidder
      _expiresAt
    );
  }
 function rvsCancelBid(
    address _collection,
    uint256 _assetId,
    address _bidder
  ) external returns(bool) {
    IERC721 nftCollection = _requireERC721(_collection);
    require(_bidder == _msgSender() || _msgSender() == nftCollection.ownerOf(_assetId), "Marketplace: Unauthorized operation");
    RvsBid memory bid = rvsbidforAuctions[_collection][_assetId][_msgSender()];
    delete rvsbidforAuctions[_collection][_assetId][_bidder];
    emit RvsBidCancelled(bid.id);
    return true;
  }
  
  function rvsAcceptBid(
    address _collection,
    uint256 _assetId,
    address _bidder
  ) public {
    //get offer
    RvsOffer memory offer = rvsOffers[_collection][_assetId];
        // get bid to accept
    RvsBid memory bid = rvsbidforAuctions[_collection][_assetId][_bidder];
    
    // get service fees
    uint ownerBenif = (offer.price).div(100).mul(rvsOwnerShare);
    uint sellerAmount = (offer.price).sub(ownerBenif);
    // check seller
    require(offer.seller == _msgSender(), "Marketplace: unauthorized sender");
    require(offer.isForAuction, "Marketplace: offer not in auction");


    require(bid.expiresAt <= block.timestamp, "Marketplace: the bid expired");
    
    delete rvsbidforAuctions[_collection][_assetId][_bidder];
    emit RvsBidAccepted(bid.id);
    // transfer escrowed bid amount minus market fee to seller
    IERC20(offer.token).transferFrom(offer.seller ,bid.bidder, sellerAmount);
    IERC20(offer.token).transferFrom(offer.seller , owner(), ownerBenif);

    delete rvsOffers[_collection][_assetId];
    // Transfer NFT asset
    IERC721(_collection).safeTransferFrom(address(this), bid.bidder, _assetId);
    // Notify ..
    emit RvsBidSuccessful(_collection, _assetId, bid.bidder);
  }
 

}