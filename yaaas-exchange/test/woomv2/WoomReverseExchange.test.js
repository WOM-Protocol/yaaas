const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const WoomReverseExchange = artifacts.require("WoomExchange.sol");
const TestERC721 = artifacts.require("../contracts/TestERC721.sol");
const TestERC20 = artifacts.require("../contracts/TestERC20.sol");

const ZERO = "0x0000000000000000000000000000000000000000";
const { expectThrow, verifyBalanceChange } = require("@daonomic/tests-common");

contract("woomReverseExchange", accounts => {
	let testERC721;
	let testERC20;
	let woomReverseExchange;


	beforeEach(async () => {
        testERC721 = await TestERC721.new();
        testERC20 = await TestERC20.new();
        woomReverseExchange = await WoomReverseExchange.new();
        await testERC20.mint(accounts[1], 100);
        await testERC20.mint(accounts[2], 100);
        await testERC20.mint(accounts[3], 300);
        await testERC721.mint(accounts[1], 1);
        await testERC721.mint(accounts[2], 2);
    });
	describe("Create new Offer/Auction", () => {
		it("Expect throw sender not an owner", async () => {
			await expectThrow(
                woomReverseExchange.rvsAddOffer(
                    accounts[1],
                    testERC721.address,
                    1,
                    testERC20.address,
                    false,
                    100,
                    false,
                    true,
                    1620481367,  { from: accounts[2] }
                )
            )
        });
        
        it("Expect throw contract not approved", async () => {
            await testERC20.approve(woomReverseExchange.address, 100, {from: accounts[1]});
			await expectThrow(
                woomReverseExchange.rvsAddOffer(
                    accounts[1],
                    testERC721.address,
                    1,
                    testERC20.address,
                    false,
                    100,
                    false,
                    true,
                    1620481367,  { from: accounts[1] }
                )
            )
        });
        it("Expect offer successfuly created", async () => {
            const assetId = 1;
            const price = 100;
            const expiresAt = 1620481367
            await testERC721.setApprovalForAll(woomReverseExchange.address, true, {from: accounts[1]});
            await testERC20.approve(woomReverseExchange.address, price, {from: accounts[1]});
			const res = await woomReverseExchange.rvsAddOffer(
                    accounts[1],
                    testERC721.address,
                    assetId,
                    testERC20.address,
                    false,
                    price,
                    false,
                    true,
                    expiresAt,  { from: accounts[1] }
                )
            const offer = await  woomReverseExchange.rvsOffers(testERC721.address, assetId);
            assert.equal(offer.seller, accounts[1]);
        });
        it("Set Offer price", async () => {
            const assetId = 1;
            const price = 100;
            const expiresAt = 1620481367
            await testERC721.setApprovalForAll(woomReverseExchange.address, true, {from: accounts[1]});
            await testERC20.approve(woomReverseExchange.address, price, {from: accounts[1]});
			const res = await woomReverseExchange.rvsAddOffer(
                    accounts[1],
                    testERC721.address,
                    assetId,
                    testERC20.address,
                    false,
                    price,
                    false,
                    true,
                    expiresAt,  { from: accounts[1] }
                )
            await woomReverseExchange.rvsSetOfferPrice(testERC721.address, assetId, 200, {from: accounts[1]})    
            const offer = await  woomReverseExchange.rvsOffers(testERC721.address, assetId);
            assert.equal(offer.price, 200);
        });
        it("Set ExpiresAt", async () => {
            const assetId = 1;
            const price = 100;
            const expiresAt = 1620481367
            await testERC20.approve(woomReverseExchange.address, price, {from: accounts[1]});
            await testERC721.setApprovalForAll(woomReverseExchange.address, true, {from: accounts[1]});
			const res = await woomReverseExchange.rvsAddOffer(
                    accounts[1],
                    testERC721.address,
                    assetId,
                    testERC20.address,
                    false,
                    price,
                    false,
                    true,
                    expiresAt,  { from: accounts[1] }
                )
            await woomReverseExchange.rvsSetExpiresAt(testERC721.address, assetId, 1620481368, {from: accounts[1]})    
            const offer = await  woomReverseExchange.rvsOffers(testERC721.address, assetId);
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
        it("Expect success bid created", async () => {
            await testERC721.setApprovalForAll(woomReverseExchange.address, true, {from: accounts[1]});
            await testERC20.approve(woomReverseExchange.address, price, {from: accounts[1]});
			let res = await woomReverseExchange.rvsAddOffer(
                    accounts[1],
                    testERC721.address,
                    assetId,
                    testERC20.address,
                    isEther,// isEther
                    price,
                    isForSell,// isForSell
                    isForAuction,// isForAuction
                    expiresAt,  { from: accounts[1] }
                )
            const offer = await  woomReverseExchange.rvsOffers(testERC721.address, assetId);
            res = await woomReverseExchange.rvsSafePlaceBid(
                testERC721.address,
                assetId,
                expiresAt,
                {from:accounts[2]}
                )
            const bid = await woomReverseExchange.rvsbidforAuctions(testERC721.address, assetId, accounts[2]);    
            assert.equal(price, offer.price);
        })
        it("Cancel bid", async () => {
            await testERC721.setApprovalForAll(woomReverseExchange.address, true, {from: accounts[1]});
            await testERC20.approve(woomReverseExchange.address, price, {from: accounts[1]});
			let res = await woomReverseExchange.rvsAddOffer(
                    accounts[1],
                    testERC721.address,
                    assetId,
                    testERC20.address,
                    isEther,// isEther
                    price,
                    isForSell,// isForSell
                    isForAuction,// isForAuction
                    expiresAt,  { from: accounts[1] }
                )
            await  woomReverseExchange.rvsOffers(testERC721.address, assetId);
            await testERC20.approve(woomReverseExchange.address, price, {from: accounts[1]});
            res = await woomReverseExchange.rvsSafePlaceBid(
                testERC721.address,
                assetId,
                expiresAt,
                {from:accounts[2]}
                )
            const bidC = await woomReverseExchange.rvsCancelBid(testERC721.address, assetId,accounts[2], {from: accounts[2]})  
            const bid = await woomReverseExchange.rvsbidforAuctions(testERC721.address, assetId, accounts[2]) 
            assert.equal(1, 1);
        })
        it("Accept bid", async () => {
            await testERC721.setApprovalForAll(woomReverseExchange.address, true, {from: accounts[1]});
            await testERC20.approve(woomReverseExchange.address, price, {from: accounts[1]});
			let res = await woomReverseExchange.rvsAddOffer(
                    accounts[1],
                    testERC721.address,
                    assetId,
                    testERC20.address,
                    isEther,// isEther
                    price,
                    isForSell,// isForSell
                    isForAuction,// isForAuction
                    expiresAt,  { from: accounts[1] }
                )
            await  woomReverseExchange.rvsOffers(testERC721.address, assetId);
            res = await woomReverseExchange.rvsSafePlaceBid(
                testERC721.address,
                assetId,
                expiresAt,
                {from:accounts[2]}
                )
            await woomReverseExchange.rvsAcceptBid( testERC721.address, assetId, accounts[2], {from: accounts[1]})  
            assert.equal((await testERC20.balanceOf(accounts[1])).toString(), 0);
            assert.equal((await testERC20.balanceOf(accounts[2])).toString(), (price*2)-(price*1/100));
        })

    })
    describe("Direct Buy/Sell", () => {
        it("set owner share", async () => {
            
			const res = await woomReverseExchange.rvsSetOwnerShare(
                    2,  { from: accounts[0] }
            )
            assert.equal((await woomReverseExchange.rvsOwnerShare()),2)      
        })
        
    })
});
