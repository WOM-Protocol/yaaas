pragma solidity >=0.4.22 <0.9.0;

import "./IERC20.sol";
import "./Ownable.sol";
import "./ERC721Validator.sol";
import "./IYaaasExchange.sol";
import "./IERC721Receiver.sol";
import "./SafeMath.sol";

contract YaaasExchange is
    Ownable,
    ERC721Validator,
    IYaaasExchange
{
    mapping(address => mapping(uint256 => Offer)) public offers;
    using SafeMath for uint256;
    // For auctions bid by bider, collection and assetId
    mapping(address => mapping(uint256 => mapping(address => Bid)))
        public bidforAuctions;
    mapping(uint256 => uint256) public shares;

    constructor() {
        shares[1] = 1;
        shares[2] = 2;
        shares[3] = 2;
        shares[4] = 2;
        shares[5] = 2;
    }

    function addOffer(
        address _seller,
        address _collection,
        uint256 _assetId,
        address token,
        bool isEther,
        uint256 _price,
        bool isForSell,
        bool isForAuction,
        uint256 expiresAt,
        uint256 shareIndex
    ) external returns (bool success) {
        // get NFT asset from seller
        IERC721 nftCollection = _requireERC721(_collection);
        require(
            nftCollection.ownerOf(_assetId) == _msgSender(),
            "Transfer caller is not owner"
        );
        require(_seller == _msgSender(), "Seller should be equals owner");
        require(
            nftCollection.isApprovedForAll(_msgSender(), address(this)),
            "Contract not approved"
        );
        // Create bid
        bytes32 OfferId = keccak256(
            abi.encodePacked(
                block.timestamp,
                _msgSender(),
                _collection,
                _assetId,
                expiresAt
            )
        );
        offers[_collection][_assetId] = Offer(
            OfferId,
            _seller,
            _collection,
            _assetId,
            token,
            isEther,
            _price,
            isForSell,
            isForAuction,
            expiresAt,
            shareIndex
        );
        nftCollection.safeTransferFrom(_seller, address(this), _assetId);
        emit Listed(_seller, _collection, _assetId, token, _price);
        return true;
    }

    function setOfferPrice(
        address collection,
        uint256 assetId,
        uint256 price
    ) external returns (bool) {
        Offer storage offer = _getOwnerOffer(collection, assetId);
        offer.price = price;
        return true;
    }

    function setForSell(
        address collection,
        uint256 assetId,
        bool isForSell
    ) external returns (bool) {
        Offer storage offer = _getOwnerOffer(collection, assetId);
        IERC721 nftCollection = _requireERC721(collection);
        offer.isForSell = isForSell;
        if (!isForSell) {
            nftCollection.safeTransferFrom(
                address(this),
                _msgSender(),
                assetId
            );
        } else {
            nftCollection.safeTransferFrom(
                _msgSender(),
                address(this),
                assetId
            );
        }
        return true;
    }

    function setForAuction(
        address collection,
        uint256 assetId,
        bool isForAuction
    ) external returns (bool) {
        Offer storage offer = _getOwnerOffer(collection, assetId);
        offer.isForAuction = isForAuction;
        return true;
    }

    function setExpiresAt(
        address collection,
        uint256 assetId,
        uint256 expiresAt
    ) external returns (bool) {
        Offer storage offer = _getOwnerOffer(collection, assetId);
        offer.expiresAt = expiresAt;
        return true;
    }

    function _getOwnerOffer(address collection, uint256 assetId)
        internal
        view
        returns (Offer storage)
    {
        Offer storage offer = offers[collection][assetId];
        require(_msgSender() == offer.seller, "Marketplace: invalid owner");
        return offer;
    }

    function buyOffer(address collection, uint256 assetId)
        external
        payable
        returns (bool success)
    {
        Offer storage offer = offers[collection][assetId];
        require(msg.value > 0, "price must be >0");
        require(offer.isForSell, "Offer not for sell");
        _buyOffer(offer, collection);
        emit Swapped(
            _msgSender(),
            offer.seller,
            collection,
            assetId,
            msg.value
        );
        return true;
    }

    function _buyOffer(Offer storage offer, address collection) internal {
        IERC721 nftCollection = _requireERC721(collection);
        uint256 ownerBenif = (msg.value).mul(shares[offer.shareIndex]).div(100);
        uint256 sellerAmount = (msg.value).sub(ownerBenif);
        address _to = offer.seller;
        if (offer.isEther) {
            require(
                offer.price <= sellerAmount,
                "price should equal or upper to offer price"
            );
            (bool sent, ) = _to.call{value: sellerAmount}("");
            (bool benifSent, ) = owner().call{value: ownerBenif}("");
            require(sent, "Failed to send Ether");
            require(benifSent, "Failed to send Ether");
            nftCollection.transferFrom(address(this), _msgSender(), offer.assetId);
        }
        
    }

    function safePlaceBid(
        address _collection,
        uint256 _assetId,
        address _token,
        uint256 _price,
        uint256 _expiresAt
    ) public {
        _createBid(_collection, _assetId, _token, _price, _expiresAt);
    }

    function setOwnerShare(uint256 index, uint256 newShare) public onlyOwner {
        require(newShare <= 100, "Owner Share must be >= 0 and <= 100");
        shares[index] = newShare;
        emit SetOwnerShare(index, newShare);
    }

    function _createBid(
        address _collection,
        uint256 _assetId,
        address _token,
        uint256 _price,
        uint256 _expiresAt
    ) internal {
        // Checks order validity
        Offer memory offer = offers[_collection][_assetId];
        // check on expire time
        if (_expiresAt > offer.expiresAt) {
            _expiresAt = offer.expiresAt;
        }
        // Check price if theres previous a bid
        Bid memory bid = bidforAuctions[_collection][_assetId][_msgSender()];
        require(bid.id == 0, "bid already exists");
        require(offer.isForAuction, "NFT Marketplace: NFT token not in sell");
        require(
            IERC20(_token).allowance(_msgSender(), address(this)) >= _price,
            "NFT Marketplace: Allowance error"
        );
        // Create bid
        bytes32 bidId = keccak256(
            abi.encodePacked(block.timestamp, msg.sender, _price, _expiresAt)
        );

        // Save Bid for this order
        bidforAuctions[_collection][_assetId][_msgSender()] = Bid({
            id: bidId,
            bidder: _msgSender(),
            token: _token,
            price: _price,
            expiresAt: _expiresAt
        });

        emit BidCreated(
            bidId,
            _collection,
            _assetId,
            _msgSender(), // bidder
            _token,
            _price,
            _expiresAt
        );
    }

    function cancelBid(
        address _collection,
        uint256 _assetId,
        address _bidder
    ) external returns (bool) {
        IERC721 nftCollection = _requireERC721(_collection);
        require(
            _bidder == _msgSender() ||
                _msgSender() == nftCollection.ownerOf(_assetId),
            "Marketplace: Unauthorized operation"
        );
        Bid memory bid = bidforAuctions[_collection][_assetId][_msgSender()];
        delete bidforAuctions[_collection][_assetId][_bidder];
        emit BidCancelled(bid.id);
        return true;
    }

    function acceptBid(
        address _collection,
        uint256 _assetId,
        address _bidder
    ) external {
        //get offer
        Offer memory offer = offers[_collection][_assetId];
        // get bid to accept
        Bid memory bid = bidforAuctions[_collection][_assetId][_bidder];

        // get service fees
        uint256 ownerBenif = (bid.price).div(100).mul(shares[offer.shareIndex]);
        uint256 sellerAmount = (bid.price).sub(ownerBenif);
        // check seller
        require(
            offer.seller == _msgSender(),
            "Marketplace: unauthorized sender"
        );
        require(offer.isForAuction, "Marketplace: offer not in auction");

        require(
            bid.expiresAt <= block.timestamp,
            "Marketplace: the bid expired"
        );

        delete bidforAuctions[_collection][_assetId][_bidder];
        emit BidAccepted(bid.id);
        // transfer escrowed bid amount minus market fee to seller
        IERC20(bid.token).transferFrom(bid.bidder, _msgSender(), sellerAmount);
        IERC20(bid.token).transferFrom(bid.bidder, owner(), ownerBenif);

        delete offers[_collection][_assetId];
        // Transfer NFT asset
        IERC721(_collection).safeTransferFrom(
            address(this),
            bid.bidder,
            _assetId
        );
        // Notify ..
        emit BidSuccessful(
            _collection,
            _assetId,
            bid.token,
            bid.bidder,
            bid.price
        );
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
