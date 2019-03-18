const EINR = artifacts.require("EINR_v1");
const Proxy = artifacts.require('AdminUpgradeabilityProxy');

const MockEINR_v1 = artifacts.require('MockEINR_v1');
const MockEINR_v2 = artifacts.require('MockEINR_v2');

const { EVMRevert } = require('./helpers/EVMRevert');
const { expectThrow } = require('./helpers/expectThrow');
const { latestTime } = require('./helpers/latestTime');
const { increaseTimeTo, duration } = require('./helpers/increaseTime');

const { BN, constants, expectEvent, shouldFail, time } = require('openzeppelin-test-helpers');

const { shouldBehaveLikeOwnable } = require('./ownership/Ownable.behaviour');


var proxiedEINR;
var proxyAdmin;
var owner;
var admin1;
var admin2;
var user1;
var user2;
var newAdmin;
var newProxyAdmin;

contract("EINR", accounts => {
    describe('no owner', function () {
        it("owner address is correct", async () => {
            var einr = await EINR.deployed();
            expect(await einr.owner()).to.equal(owner);
        });
    });
});

contract("EINRProxy", accounts => {

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
        proxiedEINR = await EINR.at(proxy.address);
        this.ownable = await EINR.at(proxy.address);
    });

    describe('Values of variables', function () {
        it("Token variables", async () => {
            expect(await proxiedEINR.name()).to.equal("EINR");
            expect(await proxiedEINR.symbol()).to.equal("EINR");
            expect((await proxiedEINR.decimals()).toNumber()).to.equal(18);
            expect((await proxiedEINR.totalSupply()).toNumber()).to.equal(0);

            expect(await proxiedEINR.owner()).to.equal(owner);
            expect(await proxiedEINR.admin1()).to.equal(admin1);
            expect(await proxiedEINR.admin2()).to.equal(admin2);
        });
    });

    describe('initialization', function () {
        it("no initialization possible", async () => {
            await expectThrow(proxiedEINR.initialize("EINR", "EINR", 18, owner, admin1, admin2), EVMRevert);
        });
    });


    describe('owner / admin', function () {
        it("correct owner", async () => {
            expect(await proxiedEINR.owner()).to.equal(owner);
        });

        it("correct admins", async () => {
            expect(await proxiedEINR.admin1()).to.equal(admin1);
            expect(await proxiedEINR.admin2()).to.equal(admin2);
        });

        it("admins renounce", async () => {
            expect(await proxiedEINR.admin1()).to.equal(admin1);
            expect(await proxiedEINR.admin2()).to.equal(admin2);

            await proxiedEINR.changeAdmin1("0x0000000000000000000000000000000000000000");
            await proxiedEINR.changeAdmin2("0x0000000000000000000000000000000000000000");

            expect(await proxiedEINR.admin1()).to.equal("0x0000000000000000000000000000000000000000");
            expect(await proxiedEINR.admin2()).to.equal("0x0000000000000000000000000000000000000000");

            await proxiedEINR.changeAdmin1(admin1);
            await proxiedEINR.changeAdmin2(admin2);

        });

        it("change admins", async () => {
            await proxiedEINR.changeAdmin1(newAdmin);
            expect(await proxiedEINR.admin1()).to.equal(newAdmin);
            await expectThrow(proxiedEINR.changeAdmin2(newAdmin), EVMRevert);

            await proxiedEINR.changeAdmin1(admin1);
            expect(await proxiedEINR.admin1()).to.equal(admin1);

            await proxiedEINR.changeAdmin2(newAdmin);
            expect(await proxiedEINR.admin2()).to.equal(newAdmin);
            await expectThrow(proxiedEINR.changeAdmin1(newAdmin), EVMRevert);

            await proxiedEINR.changeAdmin2(admin2);
            expect(await proxiedEINR.admin2()).to.equal(admin2);
        });

    });

    describe('as Mintable', function () {
        it("owner should mint instantly", async () => {
            await proxiedEINR.mint(owner, 1000);
            expect((await proxiedEINR.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEINR.totalSupply()).toNumber()).to.equal(1000);
        });

        it("admin1 should mint hold", async () => {
            await proxiedEINR.mint(owner, 1000, {from:admin1});
            expect((await proxiedEINR.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEINR.totalSupply()).toNumber()).to.equal(1000);
            expect((await proxiedEINR.totalMintHoldTransactions()).toNumber()).to.equal(1);
        });

        it("admin2 should mint hold", async () => {
            await proxiedEINR.mint(owner, 1000, {from:admin2});
            expect((await proxiedEINR.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEINR.totalSupply()).toNumber()).to.equal(1000);
            expect((await proxiedEINR.totalMintHoldTransactions()).toNumber()).to.equal(2);
        });

        it("owner should cancelHoldMint", async () => {
            await proxiedEINR.cancelHoldMint(1);
            expect((await proxiedEINR.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEINR.totalSupply()).toNumber()).to.equal(1000);
            expect((await proxiedEINR.totalMintHoldTransactions()).toNumber()).to.equal(1);

            await proxiedEINR.cancelHoldMint(0);
            expect((await proxiedEINR.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEINR.totalSupply()).toNumber()).to.equal(1000);
            expect((await proxiedEINR.totalMintHoldTransactions()).toNumber()).to.equal(0);
        });

        it("owner should not cancelHoldMint out of index", async () => {
            await expectThrow(proxiedEINR.cancelHoldMint(0), EVMRevert);
            expect((await proxiedEINR.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEINR.totalSupply()).toNumber()).to.equal(1000);
            expect((await proxiedEINR.totalMintHoldTransactions()).toNumber()).to.equal(0);
        });

        it("admin mint hold 12 hours", async () => {
            await proxiedEINR.mint(user1, 1000, {from:admin1});
            await proxiedEINR.mint(user2, 1000, {from:admin1});
            this.releaseTime = (await latestTime()) + duration.hours(12);
            expect((await proxiedEINR.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEINR.balanceOf(user1)).toNumber()).to.equal(0);
            expect((await proxiedEINR.balanceOf(user2)).toNumber()).to.equal(0);
            expect((await proxiedEINR.totalSupply()).toNumber()).to.equal(1000);
            expect((await proxiedEINR.totalMintHoldTransactions()).toNumber()).to.equal(2);

            await expectThrow(proxiedEINR.releaseMint(3), EVMRevert);
            await proxiedEINR.releaseMintAtIndex(0);
            await proxiedEINR.releaseMint(1);

            expect((await proxiedEINR.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEINR.balanceOf(user1)).toNumber()).to.equal(0);
            expect((await proxiedEINR.balanceOf(user2)).toNumber()).to.equal(0);
            expect((await proxiedEINR.totalSupply()).toNumber()).to.equal(1000);
            expect((await proxiedEINR.totalMintHoldTransactions()).toNumber()).to.equal(2);

            //increase time less 1 seconds
            await time.increaseTo(this.releaseTime - time.duration.seconds(1));

            await expectThrow(proxiedEINR.releaseMint(3), EVMRevert);
            await proxiedEINR.releaseMintAtIndex(0);
            await proxiedEINR.releaseMint(1);

            expect((await proxiedEINR.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEINR.balanceOf(user1)).toNumber()).to.equal(0);
            expect((await proxiedEINR.balanceOf(user2)).toNumber()).to.equal(0);
            expect((await proxiedEINR.totalSupply()).toNumber()).to.equal(1000);
            expect((await proxiedEINR.totalMintHoldTransactions()).toNumber()).to.equal(2);

            //increase time +1 seconds
            await time.increaseTo(this.releaseTime + time.duration.seconds(1));
            await expectThrow(proxiedEINR.releaseMint(2), EVMRevert);
            await proxiedEINR.releaseMintAtIndex(0);
            expect((await proxiedEINR.totalMintHoldTransactions()).toNumber()).to.equal(1);
            await proxiedEINR.releaseMint(1);

            expect((await proxiedEINR.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEINR.balanceOf(user1)).toNumber()).to.equal(1000);
            expect((await proxiedEINR.balanceOf(user2)).toNumber()).to.equal(1000);
            expect((await proxiedEINR.totalSupply()).toNumber()).to.equal(3000);
            expect((await proxiedEINR.totalMintHoldTransactions()).toNumber()).to.equal(0);

            //burn 1000
            await proxiedEINR.burnFrom(user1, 1000);
            await proxiedEINR.burnFrom(user2, 1000);
            expect((await proxiedEINR.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxiedEINR.balanceOf(user1)).toNumber()).to.equal(0);
            expect((await proxiedEINR.balanceOf(user2)).toNumber()).to.equal(0);
            expect((await proxiedEINR.totalSupply()).toNumber()).to.equal(1000);
            expect((await proxiedEINR.totalMintHoldTransactions()).toNumber()).to.equal(0);

        });

        it("should not mint user1", async () => {
            await expectThrow(proxiedEINR.mint(owner, 1000, {from:user1}), EVMRevert);
        });

    });

    describe('as ERC20', function () {
        it("should transfer from owner to user1", async () => {

            await proxiedEINR.transfer(user1, 500);

            expect((await proxiedEINR.balanceOf(user1)).toNumber()).to.equal(500);
            expect((await proxiedEINR.balanceOf(owner)).toNumber()).to.equal(500);
        });

        it("should not transfer when frozen", async () => {

            await proxiedEINR.freezeAccount(user1);
            await expectThrow(proxiedEINR.transfer(user2, 100, {from:user1}), EVMRevert);

            await proxiedEINR.unFreezeAccount(user1);
            await proxiedEINR.freezeAccount(user2);
            await expectThrow(proxiedEINR.transfer(user2, 100, {from:user1}), EVMRevert);
            await proxiedEINR.unFreezeAccount(user2);

            expect((await proxiedEINR.balanceOf(user1)).toNumber()).to.equal(500);
            expect((await proxiedEINR.balanceOf(owner)).toNumber()).to.equal(500);
        });

        it("should transfer from user1 to user2", async () => {

            await proxiedEINR.transfer(user2, 100, {from:user1});

            expect((await proxiedEINR.balanceOf(user1)).toNumber()).to.equal(400);
            expect((await proxiedEINR.balanceOf(user2)).toNumber()).to.equal(100);
        });

        it("should transferFrom from user1 to user2", async () => {

            await proxiedEINR.approve(user2, 100, {from:user1});
            await proxiedEINR.transferFrom(user1, user2, 100, {from:user2});

            expect((await proxiedEINR.balanceOf(user1)).toNumber()).to.equal(300);
            expect((await proxiedEINR.balanceOf(user2)).toNumber()).to.equal(200);
        });

        it("should not transferFrom when frozen", async () => {

            await proxiedEINR.approve(user2, 100, {from:user1});
            await proxiedEINR.freezeAccount(user1);
            await expectThrow(proxiedEINR.transferFrom(user1, user2, 100, {from:user2}), EVMRevert);
            await proxiedEINR.unFreezeAccount(user1);

            expect((await proxiedEINR.balanceOf(user1)).toNumber()).to.equal(300);
            expect((await proxiedEINR.balanceOf(user2)).toNumber()).to.equal(200);
        });

        it("should reclaimTokens from user1", async () => {

            expect((await proxiedEINR.balanceOf(user1)).toNumber()).to.equal(300);
            await proxiedEINR.reclaimTokens(user1, 300);
            expect((await proxiedEINR.balanceOf(user1)).toNumber()).to.equal(0);
            expect((await proxiedEINR.balanceOf(owner)).toNumber()).to.equal(800);
            expect((await proxiedEINR.totalSupply()).toNumber()).to.equal(1000);
        });

        it("should not reclaimTokens when address is 0x0", async () => {
            await expectThrow(proxiedEINR.reclaimTokens("0x0000000000000000000000000000000000000000", 300), EVMRevert);

        });

        it("should burnFrom from user2", async () => {

            expect((await proxiedEINR.balanceOf(user2)).toNumber()).to.equal(200);
            await proxiedEINR.burnFrom(user2, 200);
            expect((await proxiedEINR.balanceOf(user2)).toNumber()).to.equal(0);
            expect((await proxiedEINR.balanceOf(owner)).toNumber()).to.equal(800);
            expect((await proxiedEINR.totalSupply()).toNumber()).to.equal(800);
        });

    });

    shouldBehaveLikeOwnable(accounts);
});


contract("EINRProxy", accounts => {
    describe('Freeze or Unfreeze', function () {
        it("owner should freeze", async () => {
            await proxiedEINR.freezeAccount(user1);
            await proxiedEINR.unFreezeAccount(user1);
        });

        it("admin1 should freeze", async () => {
            await proxiedEINR.freezeAccount(user1, {from:admin1});
            await proxiedEINR.unFreezeAccount(user1, {from:admin1});
        });

        it("admin2 should freeze", async () => {
            await proxiedEINR.freezeAccount(user1, {from:admin2});
            await proxiedEINR.unFreezeAccount(user1, {from:admin2});
        });

        it("proxyAdmin should not allow to freeze", async () => {
            await expectThrow(proxiedEINR.freezeAccount(user1, {from:proxyAdmin}), EVMRevert);
            await expectThrow(proxiedEINR.unFreezeAccount(user1, {from:proxyAdmin}), EVMRevert);
        });

        it("user1 should not allow to freeze", async () => {
            await expectThrow(proxiedEINR.freezeAccount(user1, {from:user1}), EVMRevert);
            await expectThrow(proxiedEINR.unFreezeAccount(user1, {from:user1}), EVMRevert);
        });

        it("cannot freeze already frozen", async () => {
            await proxiedEINR.freezeAccount(user1);
            await expectThrow(proxiedEINR.freezeAccount(user1), EVMRevert);
            await proxiedEINR.unFreezeAccount(user1);
        });

        it("cannot unfreeze already nonfrozen", async () => {
            await expectThrow(proxiedEINR.unFreezeAccount(user1), EVMRevert);
        });

    });

    describe('as Upgradability', function () {
        it("proxyAdmin can upgrade to new implementation", async () => {
            proxy = await Proxy.deployed();

            var mock1 = await MockEINR_v1.deployed();
            await proxy.upgradeTo(MockEINR_v1.address, {from:proxyAdmin});
            proxy_mock1 = await MockEINR_v1.at(proxy.address);
            expect(await proxy_mock1.version()).to.equal("v1");

            await proxy_mock1.mint(owner, 1000);
            expect((await proxy_mock1.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxy_mock1.totalSupply()).toNumber()).to.equal(1000);

            var mock2 = await MockEINR_v2.deployed();
            await proxy.upgradeTo(MockEINR_v2.address, {from:proxyAdmin});
            proxy_mock2 = await MockEINR_v2.at(proxy.address);
            expect(await proxy_mock2.version()).to.equal("v2");

            expect((await proxy_mock2.balanceOf(owner)).toNumber()).to.equal(1000);
            expect((await proxy_mock2.totalSupply()).toNumber()).to.equal(1000);
        });

        it("admin cannot upgrade ", async () => {
            proxy = await Proxy.deployed();

            var mock1 = await MockEINR_v1.deployed();
            await proxy.upgradeTo(MockEINR_v1.address, {from:proxyAdmin});
            proxy_mock1 = await MockEINR_v1.at(proxy.address);
            expect(await proxy_mock1.version()).to.equal("v1");

            await proxy_mock1.mint(owner, 1000);
            expect((await proxy_mock1.balanceOf(owner)).toNumber()).to.equal(2000);
            expect((await proxy_mock1.totalSupply()).toNumber()).to.equal(2000);

            var mock2 = await MockEINR_v2.deployed();
            await expectThrow(proxy.upgradeTo(MockEINR_v2.address, {from:admin1}), EVMRevert);
            proxy_mock2 = await MockEINR_v2.at(proxy.address);
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
            await proxiedEINR.pause();
            await proxiedEINR.unpause();
        });

        it("admin cannot pause", async () => {
            await expectThrow(proxiedEINR.pause({from: admin1}), EVMRevert);
            await expectThrow(proxiedEINR.unpause({from: admin1}), EVMRevert);
        });

        it("transfer not allowed when paused", async () => {
            await proxiedEINR.pause();
            await expectThrow(proxiedEINR.transfer(user1, 100), EVMRevert);
            await proxiedEINR.unpause();
        });

        it("mint not allowed when paused", async () => {
            await proxiedEINR.pause();
            await expectThrow(proxiedEINR.mint(user1, 100), EVMRevert);
            await proxiedEINR.unpause();
        });

        it("mint not allowed when frozen", async () => {
            await proxiedEINR.freezeAccount(user1);
            await expectThrow(proxiedEINR.mint(user1, 100), EVMRevert);
            await proxiedEINR.unFreezeAccount(user1);
        });

        it("mint not allowed when amount is zero", async () => {
            await expectThrow(proxiedEINR.mint(user1, 0), EVMRevert);
        });

        it("mint not allowed when non authorized sent request", async () => {
            await expectThrow(proxiedEINR.mint(user1, 100, {from:user2}), EVMRevert);
        });

        it("reclaimTokens not allowed when paused", async () => {
            await proxiedEINR.pause();
            await expectThrow(proxiedEINR.reclaimTokens(user1, 100), EVMRevert);
            await proxiedEINR.unpause();
        });

    });
});