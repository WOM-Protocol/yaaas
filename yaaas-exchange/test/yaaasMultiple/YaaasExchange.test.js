const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const YaaasExchangeMultiple = artifacts.require("YaaasExchangeMultiple.sol");
const TestERC1155 = artifacts.require("../contracts/TestERC1155.sol");
const TestERC20 = artifacts.require("../contracts/TestERC20.sol");

const ZERO = "0x0000000000000000000000000000000000000000";
const { expectThrow, verifyBalanceChange } = require("@daonomic/tests-common");

contract("YaasExchangeMultiple", accounts => {
	let testERC1155;
	let testERC20;
	let yaasExchangeMultiple;
    let ownerShare = 1;
    let offerId= 1;

	beforeEach(async () => {
        testERC1155 = await TestERC1155.new();
        testERC20 = await TestERC20.new();
        yaasExchangeMultiple = await YaaasExchangeMultiple.new();
        await testERC20.mint(accounts[1], 100);
        await testERC20.mint(accounts[2], 100);
        await testERC20.mint(accounts[3], 300);
        await testERC1155.mint(1, 300,{from:accounts[1]});
        await testERC1155.mint(2, 300,{from:accounts[2]});
    });
	describe("Create new Offer/Auction", () => {
        let amount = 20;
        let price = 100;
		it("Expect throw sender not an owner", async () => {
			await expectThrow(
				 yaasExchangeMultiple.addOffer(
                    offerId, 
                    accounts[1],
                    testERC1155.address,
                    1,
                    false,
                    price,
                    amount,
                    false,
                    true,
                    1620481367,
                    ownerShare,
                    { from: accounts[2] }
                )
            )
        });
        
        it("Expect throw contract not approved", async () => {
			await expectThrow(
				 yaasExchangeMultiple.addOffer(
                    offerId, 
                    accounts[1],
                    testERC1155.address,
                    1,
                    false,
                    price,
                    amount,
                    false,
                    true,
                    1620481367,
                    ownerShare,
                     { from: accounts[1] }
                )
            )
        });
        it("Expect offer successfuly created", async () => {
            const assetId = 1;
            const price = 100;
            const expiresAt = 1620481367
            await testERC1155.setApprovalForAll(yaasExchangeMultiple.address, true, {from: accounts[1]});
			const res = await yaasExchangeMultiple.addOffer(
                offerId,
                accounts[1],
                testERC1155.address,
                1,
                false,
                price,
                amount,
                false,
                true,
                1620481367,
                ownerShare,
                    { from: accounts[1] }
                )
            const offer = await  yaasExchangeMultiple.offers(offerId);
            assert.equal(offer.seller, accounts[1]);
        });
        it("Set Offer price", async () => {
            const assetId = 1;
            const expiresAt = 1620481367
            await testERC1155.setApprovalForAll(yaasExchangeMultiple.address, true, {from: accounts[1]});
			const res = await yaasExchangeMultiple.addOffer(
                    offerId,
                    accounts[1],
                    testERC1155.address,
                    assetId,
                    false,
                    price,
                    amount,
                    false,
                    true,
                    expiresAt,
                    ownerShare,  { from: accounts[1] }
                )
            await yaasExchangeMultiple.setOfferPrice(offerId, 200, {from: accounts[1]})    
            const offer = await  yaasExchangeMultiple.offers(offerId);
            assert.equal(offer.price, 200);
        });
        it("Set ExpiresAt", async () => {
            const assetId = 1;
            const expiresAt = 1620481367
            await testERC1155.setApprovalForAll(yaasExchangeMultiple.address, true, {from: accounts[1]});
			const res = await yaasExchangeMultiple.addOffer(
                    offerId,
                    accounts[1],
                    testERC1155.address,
                    assetId,
                    false,
                    price,
                    amount,
                    false,
                    true,
                    expiresAt,
                    ownerShare,
                     { from: accounts[1] }
                )
            await yaasExchangeMultiple.setExpiresAt(offerId, 1620481368, {from: accounts[1]})    
            const offer = await  yaasExchangeMultiple.offers(offerId);
            assert.equal(offer.expiresAt, 1620481368);
        });
        

    })
    describe("Create/Cancel bid", () => {
        let assetId = 1;
        let price = 100;
        let expiresAt = 1620481367;
        let isEther = false;
        let isForAuction = true;
        let isForSell = false;
        let amount = 20;
        it("Expect throw erc20 not approved", async () => {
            await testERC1155.setApprovalForAll(yaasExchangeMultiple.address, true, {from: accounts[1]});
			const res = await yaasExchangeMultiple.addOffer(
                    offerId,
                    accounts[1],
                    testERC1155.address,
                    assetId,
                    isEther,
                    price,
                    amount,
                    isForSell,
                    isForAuction,
                    expiresAt,
                    ownerShare,  { from: accounts[1] }
                )
            await  yaasExchangeMultiple.offers(offerId);
            await expectThrow(    
             yaasExchangeMultiple.safePlaceBid(
                offerId,
                testERC20.address,
                price,
                amount,
                expiresAt,
                {from:accounts[2]}
                )
            )
        })
        it("Expect success bid created", async () => {
            await testERC1155.setApprovalForAll(yaasExchangeMultiple.address, true, {from: accounts[1]});
			let res = await yaasExchangeMultiple.addOffer(
                    offerId,
                    accounts[1],
                    testERC1155.address,
                    assetId,
                    isEther,// isEther
                    price,
                    amount,
                    isForSell,// isForSell
                    isForAuction,// isForAuction
                    expiresAt,
                    ownerShare,
                     { from: accounts[1] }
                )
            const offer = await  yaasExchangeMultiple.offers(offerId);
            await testERC20.approve(yaasExchangeMultiple.address, price, {from: accounts[2]});
            res = await yaasExchangeMultiple.safePlaceBid(
                offerId,
                testERC20.address,
                price,
                amount,
                expiresAt,
                {from:accounts[2]}
                )
            const bid = await yaasExchangeMultiple.bidforAuctions(offerId, accounts[2]);    
            assert.equal(price, bid.price);
        })
        it("Cancel bid", async () => {
            await testERC1155.setApprovalForAll(yaasExchangeMultiple.address, true, {from: accounts[1]});
			let res = await yaasExchangeMultiple.addOffer(
                    offerId,
                    accounts[1],
                    testERC1155.address,
                    assetId,
                    isEther,// isEther
                    price,
                    amount,
                    isForSell,// isForSell
                    isForAuction,// isForAuction
                    expiresAt,
                    ownerShare,
                      { from: accounts[1] }
                )
            await  yaasExchangeMultiple.offers(offerId);
            await testERC20.approve(yaasExchangeMultiple.address, price, {from: accounts[2]});
            res = await yaasExchangeMultiple.safePlaceBid(
                offerId,
                testERC20.address,
                price,
                amount,//amount
                expiresAt,
                {from:accounts[2]}
                )
            const bidC = await yaasExchangeMultiple.cancelBid(offerId,accounts[2], {from: accounts[2]})  
            const bid = await yaasExchangeMultiple.bidforAuctions(offerId, accounts[2]) 
            assert.equal(0, bid.price);
        })
        it("Accept bid", async () => {
            await testERC1155.setApprovalForAll(yaasExchangeMultiple.address, true, {from: accounts[1]});
			let res = await yaasExchangeMultiple.addOffer(
                    offerId,
                    accounts[1],
                    testERC1155.address,
                    assetId,
                    isEther,// isEther
                    price,
                    amount,
                    isForSell,// isForSell
                    isForAuction,// isForAuction
                    expiresAt, 
                    ownerShare, { from: accounts[1] }
                )
            await  yaasExchangeMultiple.offers(offerId);
            await testERC20.approve(yaasExchangeMultiple.address, price, {from: accounts[2]});
            await testERC20.approve(yaasExchangeMultiple.address, price, {from: accounts[3]});
            res = await yaasExchangeMultiple.safePlaceBid(
                offerId,
                testERC20.address,
                price,
                10,//amount
                expiresAt,
                {from:accounts[2]}
                )
            res = await yaasExchangeMultiple.safePlaceBid(
                offerId,
                testERC20.address,
                price,
                10,//amount
                expiresAt,
                {from:accounts[3]}
                )
            await yaasExchangeMultiple.acceptBid( offerId, accounts[2], {from: accounts[1]})  
            assert.equal((await testERC20.balanceOf(accounts[1])).toString(), (price*2)-(price*1/100));
            assert.equal((await testERC20.balanceOf(accounts[2])).toString(), 0);
            assert.equal((await testERC20.balanceOf(accounts[3])).toString(),(price*3));
        })

    })
    describe("Direct Buy/Sell", () => {
        let amount = 20;
        let assetId = 2;
        let price = web3.utils.toWei('10', 'ether');
        let expiresAt = 1620481367;
        let isEther = true;
        let isForAuction = false;
        let isForSell = true;
        it("Create offer successfuly", async () => {
            await testERC1155.setApprovalForAll(yaasExchangeMultiple.address, true, {from: accounts[2]});
			const res = await yaasExchangeMultiple.addOffer(
                    offerId,
                    accounts[2],
                    testERC1155.address,
                    assetId,
                    isEther,
                    price,
                    amount,
                    isForSell,
                    isForAuction,
                    expiresAt,
                    ownerShare,  { from: accounts[2] }
                )
           assert.equal(1,1)
            
        })
        it("Buy offer", async () => {
            let count2ldBalance = await web3.eth.getBalance(accounts[2]);
            let count3ldBalance = await web3.eth.getBalance(accounts[3]);
            await testERC1155.setApprovalForAll(yaasExchangeMultiple.address, true, {from: accounts[2]});
            amount = 2;
            price = 1;
			const res = await yaasExchangeMultiple.addOffer(
                    offerId,
                    accounts[2],
                    testERC1155.address,
                    assetId,
                    isEther,
                    price,
                    amount,
                    isForSell,
                    isForAuction,
                    expiresAt,
                    ownerShare,
                      { from: accounts[2] }
            )
            let newPrice = web3.utils.toWei('2.1', 'ether');
            await yaasExchangeMultiple.buyOffer(offerId, amount,{from: accounts[3], value:newPrice})
            count1ldBalance = await web3.eth.getBalance(accounts[2]);
            count2ldBalance = await web3.eth.getBalance(accounts[3]);
            assert.equal((await testERC1155.balanceOf(accounts[3], assetId)),2)            
        })
        it("set owner share", async () => {
            
			const res = await yaasExchangeMultiple.setOwnerShare(
                    1,1,  { from: accounts[0] }
            )
            assert.equal((await yaasExchangeMultiple.shares(1)),1)      
        })
        
    })
});
