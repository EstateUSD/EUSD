const EUSD = artifacts.require("EUSD_v1");
const Proxy = artifacts.require('AdminUpgradeabilityProxy');

const MockEUSD_v1 = artifacts.require('MockEUSD_v1');
const MockEUSD_v2 = artifacts.require('MockEUSD_v2');

const { EVMRevert } = require('./helpers/EVMRevert');
const { expectThrow } = require('./helpers/expectThrow');
const { latestTime } = require('./helpers/latestTime');
const { increaseTimeTo, duration } = require('./helpers/increaseTime');

const { BN, constants, expectEvent, shouldFail, time } = require('openzeppelin-test-helpers');

const { shouldBehaveLikeOwnable } = require('./ownership/Ownable.behaviour');


var proxiedEUSD;
var proxyAdmin;
var owner;
var admin1;
var admin2;
var user1;
var user2;
var newAdmin;
var newProxyAdmin;

contract("EUSD", accounts => {
    describe('no owner', function () {
        it("owner address is correct", async () => {
            var EUSD = await EUSD.deployed();
            expect(await EUSD.owner()).to.equal(owner);
        });
    });
});

contract("EUSDProxy", accounts => {

    owner = accounts[0];
    proxyAdmin = accounts[1];
    admin1 = accounts[2];
    admin2 = accounts[3];
    user1 = accounts[4];
    user2 = accounts[5];
    newAdmin = accounts[6];
    newProxyAdmin = accounts[7];

    beforeEach(async function() {
        const proxy = await Proxy.deployed();
        proxiedEUSD = await EUSD.at(proxy.address);
        this.ownable = await EUSD.at(proxy.address);
    });

    describe('Values of variables', function () {
        it("Token variables", async () => {
            expect(await proxiedEUSD.name()).to.equal("EUSD");
            expect(await proxiedEUSD.symbol()).to.equal("EUSD");
            expect((await proxiedEUSD.decimals()).toNumber()).to.equal(18);
            expect((await proxiedEUSD.totalSupply()).toNumber()).to.equal(0);

            expect(await proxiedEUSD.owner()).to.equal(owner);
            expect(await proxiedEUSD.admin1()).to.equal(admin1);
            expect(await proxiedEUSD.admin2()).to.equal(admin2);
        });
    });

    describe('initialization', function () {
        it("no initialization possible", async () => {
            await expectThrow(proxiedEUSD.initialize("EUSD", "EUSD", 18, owner, admin1, admin2), EVMRevert);
        });
    });


    describe('owner / admin', function () {
        it("correct owner", async () => {
            expect(await proxiedEUSD.owner()).to.equal(owner);
        });

        it("correct admins", async () => {
            expect(await proxiedEUSD.admin1()).to.equal(admin1);
            expect(await proxiedEUSD.admin2()).to.equal(admin2);
        });

        it("admins renounce", async () => {
            expect(await proxiedEUSD.admin1()).to.equal(admin1);
            expect(await proxiedEUSD.admin2()).to.equal(admin2);

            await proxiedEUSD.changeAdmin1("0x0000000000000000000000000000000000000000");
            await proxiedEUSD.changeAdmin2("0x0000000000000000000000000000000000000000");

            expect(await proxiedEUSD.admin1()).to.equal("0x0000000000000000000000000000000000000000");
            expect(await proxiedEUSD.admin2()).to.equal("0x0000000000000000000000000000000000000000");

            await proxiedEUSD.changeAdmin1(admin1);
            await proxiedEUSD.changeAdmin2(admin2);

        });

        it("change admins", async () => {
            await proxiedEUSD.changeAdmin1(newAdmin);
            expect(await proxiedEUSD.admin1()).to.equal(newAdmin);
            await expectThrow(proxiedEUSD.changeAdmin2(newAdmin), EVMRevert);

            await proxiedEUSD.changeAdmin1(admin1);
            expect(await proxiedEUSD.admin1()).to.equal(admin1);

            await proxiedEUSD.changeAdmin2(newAdmin);
            expect(await proxiedEUSD.admin2()).to.equal(newAdmin);
            await expectThrow(proxiedEUSD.changeAdmin1(newAdmin), EVMRevert);

            await proxiedEUSD.changeAdmin2(admin2);
            expect(await proxiedEUSD.admin2()).to.equal(admin2);
        });

    });

    describe('as Mintable', function () {
        it("owner should mint instantly", async () => {
            await proxiedEUSD.mint(owner, 1000);
            expect((await proxiedEUSD.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.totalSupply()).toNumber()).to.equal(1000);
        });

        it("admin1 should mint hold", async () => {
            await proxiedEUSD.mint(owner, 1000, {from:admin1});
            expect((await proxiedEUSD.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.totalSupply()).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.totalMintHoldTransactions()).toNumber()).to.equal(1);
        });

        it("admin2 should mint hold", async () => {
            await proxiedEUSD.mint(owner, 1000, {from:admin2});
            expect((await proxiedEUSD.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.totalSupply()).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.totalMintHoldTransactions()).toNumber()).to.equal(2);
        });

        it("owner should cancelHoldMint", async () => {
            await proxiedEUSD.cancelHoldMint(1);
            expect((await proxiedEUSD.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.totalSupply()).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.totalMintHoldTransactions()).toNumber()).to.equal(1);

            await proxiedEUSD.cancelHoldMint(0);
            expect((await proxiedEUSD.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.totalSupply()).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.totalMintHoldTransactions()).toNumber()).to.equal(0);
        });

        it("owner should not cancelHoldMint out of index", async () => {
            await expectThrow(proxiedEUSD.cancelHoldMint(0), EVMRevert);
            expect((await proxiedEUSD.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.totalSupply()).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.totalMintHoldTransactions()).toNumber()).to.equal(0);
        });

        it("admin mint hold 12 hours", async () => {
            await proxiedEUSD.mint(user1, 1000, {from:admin1});
            await proxiedEUSD.mint(user2, 1000, {from:admin1});
            this.releaseTime = (await latestTime()) + duration.hours(12);
            expect((await proxiedEUSD.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.balanceOf(user1)).toNumber()).to.equal(0);
            expect((await proxiedEUSD.balanceOf(user2)).toNumber()).to.equal(0);
            expect((await proxiedEUSD.totalSupply()).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.totalMintHoldTransactions()).toNumber()).to.equal(2);

            await expectThrow(proxiedEUSD.releaseMint(3), EVMRevert);
            await proxiedEUSD.releaseMintAtIndex(0);
            await proxiedEUSD.releaseMint(1);

            expect((await proxiedEUSD.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.balanceOf(user1)).toNumber()).to.equal(0);
            expect((await proxiedEUSD.balanceOf(user2)).toNumber()).to.equal(0);
            expect((await proxiedEUSD.totalSupply()).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.totalMintHoldTransactions()).toNumber()).to.equal(2);

            //increase time less 1 seconds
            await time.increaseTo(this.releaseTime - time.duration.seconds(1));

            await expectThrow(proxiedEUSD.releaseMint(3), EVMRevert);
            await proxiedEUSD.releaseMintAtIndex(0);
            await proxiedEUSD.releaseMint(1);

            expect((await proxiedEUSD.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.balanceOf(user1)).toNumber()).to.equal(0);
            expect((await proxiedEUSD.balanceOf(user2)).toNumber()).to.equal(0);
            expect((await proxiedEUSD.totalSupply()).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.totalMintHoldTransactions()).toNumber()).to.equal(2);

            //increase time +1 seconds
            await time.increaseTo(this.releaseTime + time.duration.seconds(1));
            await expectThrow(proxiedEUSD.releaseMint(2), EVMRevert);
            await proxiedEUSD.releaseMintAtIndex(0);
            expect((await proxiedEUSD.totalMintHoldTransactions()).toNumber()).to.equal(1);
            await proxiedEUSD.releaseMint(1);

            expect((await proxiedEUSD.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.balanceOf(user1)).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.balanceOf(user2)).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.totalSupply()).toNumber()).to.equal(3000);
            expect((await proxiedEUSD.totalMintHoldTransactions()).toNumber()).to.equal(0);

            //burn 1000
            await proxiedEUSD.burnFrom(user1, 1000);
            await proxiedEUSD.burnFrom(user2, 1000);
            expect((await proxiedEUSD.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.balanceOf(user1)).toNumber()).to.equal(0);
            expect((await proxiedEUSD.balanceOf(user2)).toNumber()).to.equal(0);
            expect((await proxiedEUSD.totalSupply()).toNumber()).to.equal(1000);
            expect((await proxiedEUSD.totalMintHoldTransactions()).toNumber()).to.equal(0);

        });

        it("should not mint user1", async () => {
            await expectThrow(proxiedEUSD.mint(owner, 1000, {from:user1}), EVMRevert);
        });

    });

    describe('as ERC20', function () {
        it("should transfer from owner to user1", async () => {

            await proxiedEUSD.transfer(user1, 500);

            expect((await proxiedEUSD.balanceOf(user1)).toNumber()).to.equal(500);
            expect((await proxiedEUSD.balanceOf(owner)).toNumber()).to.equal(500);
        });

        it("should not transfer when frozen", async () => {

            await proxiedEUSD.freezeAccount(user1);
            await expectThrow(proxiedEUSD.transfer(user2, 100, {from:user1}), EVMRevert);

            await proxiedEUSD.unFreezeAccount(user1);
            await proxiedEUSD.freezeAccount(user2);
            await expectThrow(proxiedEUSD.transfer(user2, 100, {from:user1}), EVMRevert);
            await proxiedEUSD.unFreezeAccount(user2);

            expect((await proxiedEUSD.balanceOf(user1)).toNumber()).to.equal(500);
            expect((await proxiedEUSD.balanceOf(owner)).toNumber()).to.equal(500);
        });

        it("should transfer from user1 to user2", async () => {

            await proxiedEUSD.transfer(user2, 100, {from:user1});

            expect((await proxiedEUSD.balanceOf(user1)).toNumber()).to.equal(400);
            expect((await proxiedEUSD.balanceOf(user2)).toNumber()).to.equal(100);
        });

        it("should transferFrom from user1 to user2", async () => {

            await proxiedEUSD.approve(user2, 100, {from:user1});
            await proxiedEUSD.transferFrom(user1, user2, 100, {from:user2});

            expect((await proxiedEUSD.balanceOf(user1)).toNumber()).to.equal(300);
            expect((await proxiedEUSD.balanceOf(user2)).toNumber()).to.equal(200);
        });

        it("should not transferFrom when frozen", async () => {

            await proxiedEUSD.approve(user2, 100, {from:user1});
            await proxiedEUSD.freezeAccount(user1);
            await expectThrow(proxiedEUSD.transferFrom(user1, user2, 100, {from:user2}), EVMRevert);
            await proxiedEUSD.unFreezeAccount(user1);

            expect((await proxiedEUSD.balanceOf(user1)).toNumber()).to.equal(300);
            expect((await proxiedEUSD.balanceOf(user2)).toNumber()).to.equal(200);
        });

        it("should reclaimTokens from user1", async () => {

            expect((await proxiedEUSD.balanceOf(user1)).toNumber()).to.equal(300);
            await proxiedEUSD.reclaimTokens(user1, 300);
            expect((await proxiedEUSD.balanceOf(user1)).toNumber()).to.equal(0);
            expect((await proxiedEUSD.balanceOf(owner)).toNumber()).to.equal(800);
            expect((await proxiedEUSD.totalSupply()).toNumber()).to.equal(1000);
        });

        it("should not reclaimTokens when address is 0x0", async () => {
            await expectThrow(proxiedEUSD.reclaimTokens("0x0000000000000000000000000000000000000000", 300), EVMRevert);

        });

        it("should burnFrom from user2", async () => {

            expect((await proxiedEUSD.balanceOf(user2)).toNumber()).to.equal(200);
            await proxiedEUSD.burnFrom(user2, 200);
            expect((await proxiedEUSD.balanceOf(user2)).toNumber()).to.equal(0);
            expect((await proxiedEUSD.balanceOf(owner)).toNumber()).to.equal(800);
            expect((await proxiedEUSD.totalSupply()).toNumber()).to.equal(800);
        });

    });

    shouldBehaveLikeOwnable(accounts);
});


contract("EUSDProxy", accounts => {
    describe('Freeze or Unfreeze', function () {
        it("owner should freeze", async () => {
            await proxiedEUSD.freezeAccount(user1);
            await proxiedEUSD.unFreezeAccount(user1);
        });

        it("admin1 should freeze", async () => {
            await proxiedEUSD.freezeAccount(user1, {from:admin1});
            await proxiedEUSD.unFreezeAccount(user1, {from:admin1});
        });

        it("admin2 should freeze", async () => {
            await proxiedEUSD.freezeAccount(user1, {from:admin2});
            await proxiedEUSD.unFreezeAccount(user1, {from:admin2});
        });

        it("proxyAdmin should not allow to freeze", async () => {
            await expectThrow(proxiedEUSD.freezeAccount(user1, {from:proxyAdmin}), EVMRevert);
            await expectThrow(proxiedEUSD.unFreezeAccount(user1, {from:proxyAdmin}), EVMRevert);
        });

        it("user1 should not allow to freeze", async () => {
            await expectThrow(proxiedEUSD.freezeAccount(user1, {from:user1}), EVMRevert);
            await expectThrow(proxiedEUSD.unFreezeAccount(user1, {from:user1}), EVMRevert);
        });

        it("cannot freeze already frozen", async () => {
            await proxiedEUSD.freezeAccount(user1);
            await expectThrow(proxiedEUSD.freezeAccount(user1), EVMRevert);
            await proxiedEUSD.unFreezeAccount(user1);
        });

        it("cannot unfreeze already nonfrozen", async () => {
            await expectThrow(proxiedEUSD.unFreezeAccount(user1), EVMRevert);
        });

    });

    describe('as Upgradability', function () {
        it("proxyAdmin can upgrade to new implementation", async () => {
            proxy = await Proxy.deployed();

            var mock1 = await MockEUSD_v1.deployed();
            await proxy.upgradeTo(MockEUSD_v1.address, {from:proxyAdmin});
            proxy_mock1 = await MockEUSD_v1.at(proxy.address);
            expect(await proxy_mock1.version()).to.equal("v1");

            await proxy_mock1.mint(owner, 1000);
            expect((await proxy_mock1.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxy_mock1.totalSupply()).toNumber()).to.equal(1000);

            var mock2 = await MockEUSD_v2.deployed();
            await proxy.upgradeTo(MockEUSD_v2.address, {from:proxyAdmin});
            proxy_mock2 = await MockEUSD_v2.at(proxy.address);
            expect(await proxy_mock2.version()).to.equal("v2");

            expect((await proxy_mock2.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxy_mock2.totalSupply()).toNumber()).to.equal(1000);
        });

        it("admin cannot upgrade ", async () => {
            proxy = await Proxy.deployed();

            var mock1 = await MockEUSD_v1.deployed();
            await proxy.upgradeTo(MockEUSD_v1.address, {from:proxyAdmin});
            proxy_mock1 = await MockEUSD_v1.at(proxy.address);
            expect(await proxy_mock1.version()).to.equal("v1");

            await proxy_mock1.mint(owner, 1000);
            expect((await proxy_mock1.balanceOf(owner)).toNumber()).to.equal(2000);
            expect((await proxy_mock1.totalSupply()).toNumber()).to.equal(2000);

            var mock2 = await MockEUSD_v2.deployed();
            await expectThrow(proxy.upgradeTo(MockEUSD_v2.address, {from:admin1}), EVMRevert);
            proxy_mock2 = await MockEUSD_v2.at(proxy.address);
            expect(await proxy_mock2.version()).to.equal("v1");

            expect((await proxy_mock2.balanceOf(owner)).toNumber()).to.equal(2000);
            expect((await proxy_mock2.totalSupply()).toNumber()).to.equal(2000);
        });

        it("proxyAdmin can change admin", async () => {
            proxy = await Proxy.deployed();
            await proxy.changeAdmin(newProxyAdmin, {from:proxyAdmin});
            await proxy.changeAdmin(proxyAdmin, {from:newProxyAdmin});
        });

    });

    describe('as Pausable', function () {
        it("owner can pause", async () => {
            await proxiedEUSD.pause();
            await proxiedEUSD.unpause();
        });

        it("admin cannot pause", async () => {
            await expectThrow(proxiedEUSD.pause({from: admin1}), EVMRevert);
            await expectThrow(proxiedEUSD.unpause({from: admin1}), EVMRevert);
        });

        it("transfer not allowed when paused", async () => {
            await proxiedEUSD.pause();
            await expectThrow(proxiedEUSD.transfer(user1, 100), EVMRevert);
            await proxiedEUSD.unpause();
        });

        it("mint not allowed when paused", async () => {
            await proxiedEUSD.pause();
            await expectThrow(proxiedEUSD.mint(user1, 100), EVMRevert);
            await proxiedEUSD.unpause();
        });

        it("mint not allowed when frozen", async () => {
            await proxiedEUSD.freezeAccount(user1);
            await expectThrow(proxiedEUSD.mint(user1, 100), EVMRevert);
            await proxiedEUSD.unFreezeAccount(user1);
        });

        it("mint not allowed when amount is zero", async () => {
            await expectThrow(proxiedEUSD.mint(user1, 0), EVMRevert);
        });

        it("mint not allowed when non authorized sent request", async () => {
            await expectThrow(proxiedEUSD.mint(user1, 100, {from:user2}), EVMRevert);
        });

        it("reclaimTokens not allowed when paused", async () => {
            await proxiedEUSD.pause();
            await expectThrow(proxiedEUSD.reclaimTokens(user1, 100), EVMRevert);
            await proxiedEUSD.unpause();
        });

    });
});