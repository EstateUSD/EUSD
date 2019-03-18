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

### Rinkeby

```bash
truffle migrate --network rinkeby
```

### Mainnet
```bash
truffle migrate --network mainnet
```
