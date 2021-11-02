const ExchangeChallenge = artifacts.require("ExchangeChallenge.sol");
const TestERC1155 = artifacts.require("./contracts/TestERC1155.sol");
const TestERC20 = artifacts.require("./contracts/TestERC20.sol");

const ZERO = "0x0000000000000000000000000000000000000000";
const { expectThrow, verifyBalanceChange } = require("@daonomic/tests-common");

contract("YaasExchangeChallenge", accounts => {
	let testERC1155;
	let testERC20;
    let exchangeChallenge;
    const challengeId = 1;
	beforeEach(async () => {
        testERC1155 = await TestERC1155.new();
        testERC20 = await TestERC20.new();
        exchangeChallenge = await ExchangeChallenge.new(testERC20.address);
        await testERC20.mint(accounts[1], web3.utils.toBN(100e18));
        await testERC20.mint(accounts[2], 100);
        await testERC20.mint(accounts[3], web3.utils.toBN(100e18));
        await testERC1155.mint(1, 300,{from:accounts[1]});
        await testERC1155.mint(2, 300,{from:accounts[2]});
    });
	describe("Create challenge", () => {
        let  seller = accounts[2];
        let assetId = 1;
        let amount = 10;
        let allowResell = false;
        let saleEnd = (new Date()).getTime()+1;
        let airdropStartAt =  (new Date()).getTime(); 
        let airdropEndAt =  (new Date()).getTime() + 1;
        it("Expect throw Challenge Exchange: Insufficient balance", async () => {
			await expectThrow(
                 exchangeChallenge.addChallenge(
                    challengeId,
                    seller, 
                    testERC1155.address, //collection
                    assetId, 
                    amount, 
                    allowResell, 
                    saleEnd, 
                    airdropStartAt, 
                    airdropEndAt,
                    { from: accounts[2] }
                )
            )
        });
        it("Successful challenge creation", async () => {
                seller = accounts[1];
                await testERC20.approve(exchangeChallenge.address, web3.utils.toBN(amount*10e18), {from: accounts[1]});
                const txp = await exchangeChallenge.addChallenge(
                    challengeId,
                    seller, 
                    testERC1155.address, //collection
                    assetId, 
                    amount, 
                    allowResell, 
                    saleEnd, 
                    airdropStartAt, 
                    airdropEndAt,
                    { from: accounts[1] }
                );
                const challenge = await exchangeChallenge.challenges(1);
                assert.equal(challenge.seller, seller);
        });

        it("airdrop challenge nft", async () => {
            await testERC1155.setApprovalForAll(exchangeChallenge.address, true, {from: accounts[1]});
            seller = accounts[1];
            await testERC20.approve(exchangeChallenge.address, web3.utils.toBN(amount*10e18), {from: accounts[1]});
            const txp = await exchangeChallenge.addChallenge(
                challengeId,
                seller, 
                testERC1155.address, //collection
                assetId, 
                amount, 
                allowResell, 
                saleEnd, 
                airdropStartAt, 
                airdropEndAt,
                { from: accounts[1] }
            );
            await exchangeChallenge.airdropChallenge(1, accounts[3], 1, {from: accounts[1]});
            const challenge = await exchangeChallenge.challenges(1);
            assert.equal(challenge.amount, amount-1);
            assert.equal(challenge.seller, accounts[1]);
        });

        it("Unauthorized nft challenge creation", async () => {
            await testERC1155.setApprovalForAll(exchangeChallenge.address, true, {from: accounts[1]});
            seller = accounts[1];
            await testERC20.approve(exchangeChallenge.address, web3.utils.toBN(amount*10e18), {from: accounts[1]});
            const txp = await exchangeChallenge.addChallenge(
                challengeId,
                seller, 
                testERC1155.address, //collection
                assetId, 
                amount, 
                allowResell, 
                saleEnd, 
                airdropStartAt, 
                airdropEndAt,
                { from: accounts[1] }
            );
            await exchangeChallenge.airdropChallenge(1, accounts[3], 1, {from: accounts[1]});
            amount = 1;
            await expectThrow(
            exchangeChallenge.addChallenge(
                challengeId,
                accounts[3], 
                testERC1155.address, //collection
                assetId, 
                amount, 
                allowResell, 
                saleEnd, 
                airdropStartAt, 
                airdropEndAt,
                { from: accounts[3] }
            )
            )
            
        });


        it("Expect throw Challenge Exchange: wallet not the owner, set swap rate", async () => {
			await expectThrow(
               exchangeChallenge.setYaaasFee(10,
                    { from: accounts[1] }
                )
            )
        });
        it("set swap rate", async () => {
            const txp = await exchangeChallenge.setYaaasFee(10,
                { from: accounts[0] }
            );
            const fee = await exchangeChallenge.YAAS_FEES();
            assert.equal(fee, 10);
        });


        it("set utility token", async () => {
            const txp = await exchangeChallenge.setMarketToken(testERC1155.address,
                { from: accounts[0] }
            );
            const address = await exchangeChallenge.MARKET_TOKEN();
            assert.equal(address, testERC1155.address);
        });
    })
});
