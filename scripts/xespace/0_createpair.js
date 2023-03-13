const Web3 = require('web3');
const fs = require('fs');
const { BigNumber } = require("@ethersproject/bignumber");
const config = require('../../config.js');
const specs = config.specs;
const w3 = new Web3(specs.nodeUrl);
let addresses;
if (specs.network == 'espacetestnet') {
  fileName = './scripts/xespace/contractAddressPublicTestnet.json';
  addresses = require('./contractAddressPublicTestnet.json');
}else{
  fileName = './scripts/xespace/contractAddressMainnet.json';
  addresses = require('./contractAddressMainnet.json');
}

let contract = require(`../../ABIs/SwappiFactory.sol/SwappiFactory.json`);
contract.instance = new w3.eth.Contract(contract.abi);
contract.instance.options.address = addresses.SwappiFactory;
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
  console.log('account', account);
  let nonce = await w3.eth.getTransactionCount(account);
  data = contract.instance.methods.createPair(addresses.WCFX, addresses.NUT).encodeABI();
  success = true;
  try {
    await ethTransact(data, contract.instance.options.address, nonce, specs.privateKey, account);
  } catch (error) {
    success = false;
    console.log(error.toString());
    console.log(">> ❌ Create Pair for NUT/CFX Failed.");
  }
  if (success) {
    nonce = nonce + 1;
    console.log(">> ✅ Create Pair for NUT/CFX Done.");
  }
  lpAddr = await contract.instance.methods.getPair(addresses.WCFX, addresses.NUT).call();
  console.log(">> ✅ NUT/CFX addr:", lpAddr.toString());
  addresses.NUTWCFX = lpAddr;

  data = contract.instance.methods.createPair(addresses.WCFX, addresses.XCFX).encodeABI();
  success = true;
  try {
    await ethTransact(data, contract.instance.options.address, nonce, specs.privateKey, account);
  } catch (error) {
    success = false;
    console.log(error.toString());
    console.log(">> ❌ Create Pair for XCFX/CFX Failed.");
  }
  if (success) {
    nonce = nonce + 1;
    console.log(">> ✅ Create Pair for XCFX/CFX Done.");
  }
  lpAddr = await contract.instance.methods.getPair(addresses.WCFX, addresses.XCFX).call();
  console.log(">> ✅ XCFX/CFX addr:", lpAddr.toString());
  addresses.XCFXWCFX = lpAddr;

  data = contract.instance.methods.createPair(addresses.XCFX, addresses.NUT).encodeABI();
  success = true;
  try {
    await ethTransact(data, contract.instance.options.address, nonce, specs.privateKey, account);
  } catch (error) {
    success = false;
    console.log(error.toString());
    console.log(">> ❌ Create Pair for XCFX/NUT Failed.");
  }
  if (success) {
    nonce = nonce + 1;
    console.log(">> ✅ Create Pair for XCFX/NUT Done.");
  }
  lpAddr = await contract.instance.methods.getPair(addresses.XCFX, addresses.NUT).call();
  console.log(">> ✅ XCFX/CFX addr:", lpAddr.toString());
  addresses.XCFXNUT = lpAddr;

  //update two LP addresses
  let newAddresses = JSON.stringify(addresses, null, 2);
  fs.writeFileSync(fileName, newAddresses);
}

run();