const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const WoomExchange = artifacts.require("WoomExchange.sol");
const TestERC721 = artifacts.require("../contracts/TestERC721.sol");
const TestERC20 = artifacts.require("../contracts/TestERC20.sol");

const ZERO = "0x0000000000000000000000000000000000000000";
const { expectThrow, verifyBalanceChange } = require("@daonomic/tests-common");

contract("WoomExchange", accounts => {
	let testERC721;
	let testERC20;
	let woomExchange;
    let ownerShare = 1;


	beforeEach(async () => {
        testERC721 = await TestERC721.new();
        testERC20 = await TestERC20.new();
        woomExchange = await WoomExchange.new();
        await testERC20.mint(accounts[1], 100);
        await testERC20.mint(accounts[2], 100);
        await testERC20.mint(accounts[3], 300);
        await testERC721.mint(accounts[1], 1);
        await testERC721.mint(accounts[2], 2);
    });
	describe("Create new Offer/Auction", () => {
		it("Expect throw sender not an owner", async () => {
			await expectThrow(
				 woomExchange.addOffer(
                    accounts[1],
                    testERC721.address,
                    1,
                    testERC20.address,
                    false,
                    100,
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
				 woomExchange.addOffer(
                    accounts[1],
                    testERC721.address,
                    1,
                    testERC20.address,
                    false,
                    100,
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
            await testERC721.setApprovalForAll(woomExchange.address, true, {from: accounts[1]});
			const res = await woomExchange.addOffer(
                    accounts[1],
                    testERC721.address,
                    assetId,
                    testERC20.address,
                    false,
                    price,
                    false,
                    true,
                    expiresAt,
                    ownerShare,
                    { from: accounts[1] }
                )
            const offer = await  woomExchange.offers(testERC721.address, assetId);
            assert.equal(offer.seller, accounts[1]);
        });
        it("Set Offer price", async () => {
            const assetId = 1;
            const price = 100;
            const expiresAt = 1620481367
            await testERC721.setApprovalForAll(woomExchange.address, true, {from: accounts[1]});
			const res = await woomExchange.addOffer(
                    accounts[1],
                    testERC721.address,
                    assetId,
                    testERC20.address,
                    false,
                    price,
                    false,
                    true,
                    expiresAt,
                    ownerShare,  { from: accounts[1] }
                )
            await woomExchange.setOfferPrice(testERC721.address, assetId, 200, {from: accounts[1]})    
            const offer = await  woomExchange.offers(testERC721.address, assetId);
            assert.equal(offer.price, 200);
        });
        it("Set ExpiresAt", async () => {
            const assetId = 1;
            const price = 100;
            const expiresAt = 1620481367
            await testERC721.setApprovalForAll(woomExchange.address, true, {from: accounts[1]});
			const res = await woomExchange.addOffer(
                    accounts[1],
                    testERC721.address,
                    assetId,
                    testERC20.address,
                    false,
                    price,
                    false,
                    true,
                    expiresAt,
                    ownerShare,
                     { from: accounts[1] }
                )
            await woomExchange.setExpiresAt(testERC721.address, assetId, 1620481368, {from: accounts[1]})    
            const offer = await  woomExchange.offers(testERC721.address, assetId);
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
        it("Expect throw erc20 not approved", async () => {
            await testERC721.setApprovalForAll(woomExchange.address, true, {from: accounts[1]});
			const res = await woomExchange.addOffer(
                    accounts[1],
                    testERC721.address,
                    assetId,
                    testERC20.address,
                    isEther,
                    price,
                    isForSell,
                    isForAuction,
                    expiresAt,
                    ownerShare,  { from: accounts[1] }
                )
            await  woomExchange.offers(testERC721.address, assetId);
            await expectThrow(    
             woomExchange.safePlaceBid(
                testERC721.address,
                assetId,
                testERC20.address,
                100,
                expiresAt,
                {from:accounts[2]}
                )
            )
        })
        it("Expect success bid created", async () => {
            await testERC721.setApprovalForAll(woomExchange.address, true, {from: accounts[1]});
			let res = await woomExchange.addOffer(
                    accounts[1],
                    testERC721.address,
                    assetId,
                    testERC20.address,
                    isEther,// isEther
                    price,
                    isForSell,// isForSell
                    isForAuction,// isForAuction
                    expiresAt,
                    ownerShare,
                     { from: accounts[1] }
                )
            const offer = await  woomExchange.offers(testERC721.address, assetId);
            await testERC20.approve(woomExchange.address, price, {from: accounts[2]});
            res = await woomExchange.safePlaceBid(
                testERC721.address,
                assetId,
                testERC20.address,
                price,
                expiresAt,
                {from:accounts[2]}
                )
            const bid = await woomExchange.bidforAuctions(testERC721.address, assetId, accounts[2]);    
            assert.equal(price, bid.price);
        })
        it("Cancel bid", async () => {
            await testERC721.setApprovalForAll(woomExchange.address, true, {from: accounts[1]});
			let res = await woomExchange.addOffer(
                    accounts[1],
                    testERC721.address,
                    assetId,
                    testERC20.address,
                    isEther,// isEther
                    price,
                    isForSell,// isForSell
                    isForAuction,// isForAuction
                    expiresAt,
                    ownerShare,
                      { from: accounts[1] }
                )
            await  woomExchange.offers(testERC721.address, assetId);
            await testERC20.approve(woomExchange.address, price, {from: accounts[2]});
            res = await woomExchange.safePlaceBid(
                testERC721.address,
                assetId,
                testERC20.address,
                price,
                expiresAt,
                {from:accounts[2]}
                )
            const bidC = await woomExchange.cancelBid(testERC721.address, assetId,accounts[2], {from: accounts[2]})  
            const bid = await woomExchange.bidforAuctions(testERC721.address, assetId, accounts[2]) 
            assert.equal(0, bid.price);
        })
        it("Accept bid", async () => {
            await testERC721.setApprovalForAll(woomExchange.address, true, {from: accounts[1]});
			let res = await woomExchange.addOffer(
                    accounts[1],
                    testERC721.address,
                    assetId,
                    testERC20.address,
                    isEther,// isEther
                    price,
                    isForSell,// isForSell
                    isForAuction,// isForAuction
                    expiresAt, 
                    ownerShare, { from: accounts[1] }
                )
            await  woomExchange.offers(testERC721.address, assetId);
            await testERC20.approve(woomExchange.address, price, {from: accounts[2]});
            await testERC20.approve(woomExchange.address, price, {from: accounts[3]});
            res = await woomExchange.safePlaceBid(
                testERC721.address,
                assetId,
                testERC20.address,
                price,
                expiresAt,
                {from:accounts[2]}
                )
            res = await woomExchange.safePlaceBid(
                testERC721.address,
                assetId,
                testERC20.address,
                price,
                expiresAt,
                {from:accounts[3]}
                )
            await woomExchange.acceptBid( testERC721.address, assetId, accounts[2], {from: accounts[1]})  
            assert.equal((await testERC20.balanceOf(accounts[1])).toString(), (price*2)-(price*1/100));
            assert.equal((await testERC20.balanceOf(accounts[2])).toString(), 0);
            assert.equal((await testERC20.balanceOf(accounts[3])).toString(),(price*3));
        })

    })
    describe("Direct Buy/Sell", () => {
        let assetId = 2;
        let price = web3.utils.toWei('10', 'ether');
        let expiresAt = 1620481367;
        let isEther = true;
        let isForAuction = false;
        let isForSell = true;
        it("Create offer successfuly", async () => {
            await testERC721.setApprovalForAll(woomExchange.address, true, {from: accounts[2]});
			const res = await woomExchange.addOffer(
                    accounts[2],
                    testERC721.address,
                    assetId,
                    testERC20.address,
                    isEther,
                    price,
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
            await testERC721.setApprovalForAll(woomExchange.address, true, {from: accounts[2]});
			const res = await woomExchange.addOffer(
                    accounts[2],
                    testERC721.address,
                    assetId,
                    testERC20.address,
                    isEther,
                    price,
                    isForSell,
                    isForAuction,
                    expiresAt,
                    ownerShare,
                      { from: accounts[2] }
            )
            let newPrice = web3.utils.toWei('11', 'ether');
            await woomExchange.buyOffer(testERC721.address, assetId,{from: accounts[3], value:newPrice})
            count1ldBalance = await web3.eth.getBalance(accounts[2]);
            count2ldBalance = await web3.eth.getBalance(accounts[3]);
            assert.equal((await testERC721.ownerOf(assetId)),accounts[3])            
        })
        it("set owner share", async () => {
            
			const res = await woomExchange.setOwnerShare(
                    1,1,  { from: accounts[0] }
            )
            assert.equal((await woomExchange.shares(1)),1)      
        })
        
    })
});
