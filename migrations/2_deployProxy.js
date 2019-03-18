const EUSD = artifacts.require('EUSD_v1');
const Proxy = artifacts.require('AdminUpgradeabilityProxy');

const MockEUSD_v1 = artifacts.require('MockEUSD_v1');
const MockEUSD_v2 = artifacts.require('MockEUSD_v2');

module.exports = async function(deployer, networks, accounts) {

  var owner = accounts[0];
  var proxyAdmin = accounts[1];
  var admin1 = accounts[2];
  var admin2 = accounts[3];

  await deployer.deploy(EUSD);
  const proxy = await deployer.deploy(Proxy, EUSD.address, proxyAdmin, web3.utils.stringToHex(""));
  const proxiedEUSD = await EUSD.at(proxy.address);

  await proxiedEUSD.initialize("EUSD", "EUSD", 18, owner, admin1, admin2);

  if(networks == 'development') {
    await deployer.deploy(MockEUSD_v1);
    await deployer.deploy(MockEUSD_v2);
  }
}