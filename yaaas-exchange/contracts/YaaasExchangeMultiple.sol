pragma solidity >=0.4.22 <0.9.0;

import "./IERC20.sol";
import "./Ownable.sol";
import "./IYaaasExchangeMultiple.sol";
import "./SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";

contract YaaasExchangeMultiple is
    Ownable,
    IYaaasExchangeMultiple
{
    using SafeMath for uint256;


    //ERC1155
    mapping(uint256 => Offer) public offers;
    // For auctions bid by bider, collection and assetId
    mapping(uint256 => mapping(address => Bid)) public bidforAuctions;

    mapping(uint256 => uint256) public shares;

    constructor() {
        shares[1] = 1;
        shares[2] = 2;
        shares[3] = 2;
        shares[4] = 2;
        shares[5] = 2;
    }
    /**
    * @dev Create new offer
    * @param id an unique offer id
    * @param _seller the token owner
    * @param _collection the ERC1155 address
    * @param _assertId the NFT id
    * @param _isEther if sale in ether price
    * @param _price the sale price
    * @param _amount the amount of tokens owner wants to put in sale.
    * @param _isForSell if the token in direct sale
    * @param _isForAuction if the token in auctions
    * @param _expiresAt the offer's exprice date.
    * @param _shareIndex the percentage the contract owner earns in every sale
    */
    function addOffer(
        uint256 id,
        address _seller,
        address _collection,
        uint256 _assertId,
        bool _isEther,
        uint256 _price,
        uint256 _amount,
        bool _isForSell,
        bool _isForAuction,
        uint256 _expiresAt,
        uint256 _shareIndex
    ) public returns (bool success) {
        // get NFT asset from seller
        IERC1155Upgradeable nftCollection = IERC1155Upgradeable(_collection);
        require(
            nftCollection.balanceOf(_msgSender(), _assertId) >= _amount,
            "Insufficient token balance"
        );
        
        require(_seller == _msgSender(), "Seller should be equals owner");
       require(
            nftCollection.isApprovedForAll(_msgSender(), address(this)),
            "Contract not approved"
        );
        
        offers[id] = Offer(
            _seller,
            _collection,
            _assertId,
            _isEther,
            _price,
            _amount,
            _isForSell,
            _isForAuction,
            _expiresAt,
            _shareIndex
        );
        
        //nftCollection.safeTransferFrom(_seller, address(this), _assetId);
        emit Listed(_seller, _collection, _assertId, _amount, _price);
        return true;
    }

    function setOfferPrice(
        uint256 id,
        uint256 price
    ) public returns (bool) {
        Offer storage offer = _getOwnerOffer(id);
        offer.price = price;
        return true;
    }

    function setForSell(
        uint256 projectID,
        bool isForSell
    ) public returns (bool) {
        Offer storage offer = _getOwnerOffer(projectID);
        offer.isForSell = isForSell;
        return true;
    }

    function setForAuction(
        uint256 projectID,
        bool isForAuction
    ) public returns (bool) {
        Offer storage offer = _getOwnerOffer(projectID);
        offer.isForAuction = isForAuction;
        return true;
    }

    function setExpiresAt(
        uint256 projectID,
        uint256 expiresAt
    ) public returns (bool) {
        Offer storage offer = _getOwnerOffer(projectID);
        offer.expiresAt = expiresAt;
        return true;
    }

    function _getOwnerOffer(uint256 id)
        internal
        view
        returns (Offer storage)
    {
        Offer storage offer = offers[id];
        require(_msgSender() == offer.seller, "Marketplace: invalid owner");
        return offer;
    }

    function buyOffer(uint256 id, uint256 amount)
        public
        payable
        returns (bool success)
    {
        Offer storage offer = offers[id];
        require(msg.value > 0, "price must be >0");
        require(offer.isForSell, "Offer not for sell");
        _buyOffer(offer, offer.collection, amount);
        emit Swapped(
            _msgSender(),
            offer.seller,
            offer.collection,
            offer.assetId,
            msg.value
        );
        return true;
    }

    function _buyOffer(Offer storage offer, address collection, uint256 amount) internal {
        IERC1155Upgradeable nftCollection = IERC1155Upgradeable(collection);
        require(msg.value >= offer.price.mul(amount),"Yaaas: Insufficient funds");
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
        }
        nftCollection.safeTransferFrom(_to, _msgSender(), offer.assetId, amount, "");
    }

    function safePlaceBid(
        uint256 _offer_id,
        address _token,
        uint256 _price,
        uint256 _amount,
        uint256 _expiresAt
    ) public {
        _createBid(_offer_id, _token, _price, _amount,_expiresAt);
    }

    function setOwnerShare(uint256 index, uint256 newShare) public onlyOwner {
        require(newShare >= 0 && newShare <= 100, "Owner Share must be >= 0 and <= 100");
        shares[index] = newShare;
    }

    function _createBid(
        uint256 offerID,
        address _token,
        uint256 _price,
        uint256 _amount,
        uint256 _expiresAt
    ) internal {
        // Checks order validity
        Offer memory offer = offers[offerID];
        // check on expire time
        if (_expiresAt > offer.expiresAt) {
            _expiresAt = offer.expiresAt;
        }
        // Check price if theres previous a bid
        Bid memory bid = bidforAuctions[offerID][_msgSender()];
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
        bidforAuctions[offerID][_msgSender()] = Bid({
            id: bidId,
            bidder: _msgSender(),
            token: _token,
            price: _price,
            amount: _amount,
            expiresAt: _expiresAt
        });

        emit BidCreated(
            bidId,
            offer.collection,
            offer.assetId,
            _msgSender(), // bidder
            _token,
            _price,
            _amount,
            _expiresAt
        );
    }

    function cancelBid(
        uint256 _offerId,
        address _bidder
    ) external returns (bool) {
        Offer memory offer = offers[_offerId];
        require(
            _bidder == _msgSender() ||
                _msgSender() == offer.seller,
            "Marketplace: Unauthorized operation"
        );
        Bid memory bid = bidforAuctions[_offerId][_msgSender()];
        delete bidforAuctions[_offerId][_bidder];
        emit BidCancelled(bid.id);
        return true;
    }

    function acceptBid(
        uint256 _offerID,
        address _bidder
    ) public {
        //get offer
        Offer memory offer = offers[_offerID];
        // get bid to accept
        Bid memory bid = bidforAuctions[_offerID][_bidder];

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

        delete bidforAuctions[_offerID][_bidder];
        emit BidAccepted(bid.id);
        // transfer escrowed bid amount minus market fee to seller
        IERC20(bid.token).transferFrom(bid.bidder, _msgSender(), sellerAmount);
        IERC20(bid.token).transferFrom(bid.bidder, owner(), ownerBenif);

        delete offers[_offerID];
        // Transfer NFT asset
        IERC1155Upgradeable(offer.collection).safeTransferFrom(
            offer.seller,
            bid.bidder,
            offer.assetId,
            bid.amount,
            ""
        );
        // Notify ..
        emit BidSuccessful(
            offer.collection,
            offer.assetId,
            bid.token,
            bid.bidder,
            bid.price,
            bid.amount
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
