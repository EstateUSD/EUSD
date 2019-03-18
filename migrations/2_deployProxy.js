const EINR = artifacts.require('EINR_v1');
const Proxy = artifacts.require('AdminUpgradeabilityProxy');

const MockEINR_v1 = artifacts.require('MockEINR_v1');
const MockEINR_v2 = artifacts.require('MockEINR_v2');

module.exports = async function(deployer, networks, accounts) {

  var owner = accounts[0];
  var proxyAdmin = accounts[1];
  var admin1 = accounts[2];
  var admin2 = accounts[3];

  await deployer.deploy(EINR);
  const proxy = await deployer.deploy(Proxy, EINR.address, proxyAdmin, web3.utils.stringToHex(""));
  const proxiedEINR = await EINR.at(proxy.address);

  await proxiedEINR.initialize("EINR", "EINR", 18, owner, admin1, admin2);

  if(networks == 'development') {
    await deployer.deploy(MockEINR_v1);
    await deployer.deploy(MockEINR_v2);
  }
}