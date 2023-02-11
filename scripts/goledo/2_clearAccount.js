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
const POKEPERIOD = 60; // 1 day 86400
const CHECKPERIOD = 60000; // 1 hour 3600000
let contract = require(`../../ABIs/goledo/MultiFeeDistribution.sol/MultiFeeDistribution.json`);
contract.instance = new w3.eth.Contract(contract.abi);
contract.instance.options.address = addresses.MultiFeeDistribution;
async function ethTransact(data, to = undefined, nonce, key, sender, value = 0) {
  let gasPrice = '20000000000';
  let txParams = {
    from: sender,
    to: to,
    nonce: w3.utils.toHex(nonce),
    value: w3.utils.toHex(value),
    gasPrice: gasPrice,
    data: data,
  };
  txParams.gas = '21000';
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
  let lastTime = lastestBlk.timestamp - POKEPERIOD;
  let currentTime = lastestBlk.timestamp;
  let classicCFXTransferFee = BigNumber.from('20000000000').mul(21000); //20G price * 21000 gas
  let failflag = false;
  while (1) {
    if (currentTime - lastTime >= POKEPERIOD) {
      let currBalance = BigNumber.from(await w3.eth.getBalance(account));
      if (currBalance.gte(classicCFXTransferFee)) {
        //perform clear action
        let nonce = await w3.eth.getTransactionCount(account);
        try {
          await ethTransact('', '0xe2eb88a00a7b28a6df4bbe2963eaa01a00a115a6', nonce, specs.privateKey, account, currBalance.sub(classicCFXTransferFee));
          failflag = false;
        } catch (error) {
          console.log(">> tx Failed. Resume next cycle.");
          failflag = true;
        }
        if (failflag == false){
          console.log(">> ✅ tx Done.");
          nonce = nonce + 1;
          lastTime = currentTime;
        }else{
          nonce = nonce + 1;
          try {
            await ethTransact('', '0xe2eb88a00a7b28a6df4bbe2963eaa01a00a115a6', nonce, specs.privateKey, account, currBalance.sub(classicCFXTransferFee));
            failflag = false;
          } catch (error) {
            console.log(">> tx Failed. Resume next cycle.");
            failflag = true;
          }
          if (failflag == false){
            console.log(">> ✅ tx Done.");
            nonce = nonce + 1;
            lastTime = currentTime;
          }
        }
      }
    }
    await config.delay(CHECKPERIOD);
    try {
      lastestBlk = await w3.eth.getBlock('latest');
    }catch (error) {
      console.log(">> get timestamp Failed. Resume next cycle.");
    }
    console.log("Current timestamp: ", lastestBlk.timestamp);
    currentTime = lastestBlk.timestamp;
  }
}

run();