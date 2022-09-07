const Web3 = require('web3');
const { BigNumber } = require("@ethersproject/bignumber");
const config = require('../../config.js');
const specs = config.specs;
const w3 = new Web3(specs.nodeUrl);
let addresses;
if (specs.network == 'espacetestnet') {
  addresses = require('./testnetConfig.json');
}else{
  addresses = require('./espaceConfig.json');
}
const POKEPERIOD = 100; // 100 secs
const CHECKPERIOD = 5000; //5 secs
let contract = require(`../../ABIs/goledo/MultiFeeDistribution.sol/MultiFeeDistribution.json`);
contract.instance = new w3.eth.Contract(contract.abi);
contract.instance.options.address = addresses.MultiFeeDistribution;
async function ethTransact(data, to = undefined, nonce, key, sender, value = 0) {
  let gasPrice = BigNumber.from(await w3.eth.getGasPrice());
  gasPrice = gasPrice.mul(110).div(100).toString();
  let txParams = {
    from: sender,
    to: to,
    nonce: w3.utils.toHex(nonce),
    value: w3.utils.toHex(value),
    gasPrice: gasPrice,
    data: data,
  };
  txParams.gas = BigNumber.from(await w3.eth.estimateGas(txParams)).mul(101).div(100).toString();
  if (BigNumber.from(txParams.gas).lt(500000)) txParams.gas = BigNumber.from(500000).toString();
  let encodedTransaction = await w3.eth.accounts.signTransaction(
    txParams,
    key,
  );
  let rawTransaction = encodedTransaction.rawTransaction;
  let receipt = await w3.eth.sendSignedTransaction(rawTransaction);
  if (!receipt.status) throw new Error(`transaction failed`);
  return receipt;
}
async function run() {
  let account = w3.eth.accounts.privateKeyToAccount(specs.privateKey).address;
  //get current timestamp
  let lastestBlk = await w3.eth.getBlock('latest');
  console.log('account', account);
  let lastTime = lastestBlk.timestamp;
  let currentTime = lastestBlk.timestamp;
  let nonce = await w3.eth.getTransactionCount(account);
  while (1) {
    if (currentTime - lastTime > POKEPERIOD) {
      data = contract.instance.methods.getReward([addresses.GoledoToken, addresses.Markets['CFX']['atoken'], addresses.Markets['USDT']['atoken'], addresses.Markets['WETH']['atoken'], addresses.Markets['WBTC']['atoken']]).encodeABI();
      await ethTransact(data, contract.instance.options.address, nonce, specs.privateKey, account);
      console.log(">> ✅ getReward() Done.");
      nonce = nonce + 1;
      lastTime = currentTime;
    }
    await config.delay(CHECKPERIOD);
    lastestBlk = await w3.eth.getBlock('latest');
    console.log("Current timestamp: ", lastestBlk.timestamp);
    currentTime = lastestBlk.timestamp;
  }
}

run();