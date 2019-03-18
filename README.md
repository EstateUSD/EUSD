# StableToken

## Dependencies
*  Install latest version of node from https://nodejs.org/en/download/

*  Install truffle
```bash
npm install -g truffle
```

* Install Ganache GUI from https://truffleframework.com/ganache 


## Setup

Run the following commands in the project folder.
```bash
npm install
```

Compile code
```bash
truffle compile
```

Run Ganache GUI, click-on the "Quick Start" to start your local blockchain

Run tests
```bash
truffle test
```

## Deployment

For deployment the wallet must have ETH balance for the respective network.
For example; for Reinkby ETH, your wallet must have rinkeby ETH, same is the case with mainnet ETH as well.

Once you have ETH, then only run the following commands.

The wallet that this project is using, its mnemonics is stored in ".secret" file.
You MUST change your wallet mnemonics in this file.  

### Rinkeby

```bash
truffle migrate --network rinkeby
```

### Mainnet 
CAUTION: This would require actual ETH on mainnet. When you really want to deploy,
then only execute the below command.
```bash
truffle migrate --network mainnet
```
