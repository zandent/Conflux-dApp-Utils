const Web3 = require('web3');
const fetch = require('node-fetch');
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

let Exchangeroom = require(`../../ABIs/Exchangeroom.sol/Exchangeroom.json`);
Exchangeroom.instance = new w3.eth.Contract(Exchangeroom.abi);
Exchangeroom.instance.options.address = "0x808f81acc4618a05c8253a7b41240468c08cd64c";
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
  summary = await Exchangeroom.instance.methods.Summary().call();
  // console.log(summary.xcfxvalues.slice(0, 5));
  let ratio = BigNumber.from(summary.xcfxvalues.slice(0, 8));
  // console.log(ratio.toString());
  let totalCFX = BigNumber.from(summary.totalxcfxs).mul(ratio).div(BigNumber.from('1000000000000000000')).div(10000000).toString();
  console.log(`-----Nucleon-----`);
  console.log(">> total CFX staked:", totalCFX);
  // return;
  let i = 1;
  scanUrl = `https://evmapi.confluxscan.net/api?module=account&action=txlist&address=0x808f81acc4618a05c8253a7b41240468c08cd64c&startblock=64352485&apikey=${specs.apikey}`;
  var response = await fetch(scanUrl+`&page=${i}&sort=desc`);
  var dataPerPage = await response.json(); //extract JSON from the http response
  // console.log(dataPerPage);
  accountsCaptured = [];
  var totalStaked = BigNumber.from(0);
  const stakedPerUser = new Map();
  while (dataPerPage.result.length > 0) {
    for (const entry of dataPerPage.result) {
        // console.log(entry);
        if (entry.value !== '0' && entry.from !== '0x374122b3c179586c704e666f11a0001ea42f33cb' && entry.from != "0xd43cef11c97ccee808224f2ccbbf73a708df6785"){
        if (accountsCaptured.includes(entry.from) == false) {
            // console.log(`new account is set ${entry.from}`);
            accountsCaptured.push(entry.from);
            stakedPerUser.set(entry.from, BigNumber.from(entry.value));  
        }else{
            // console.log(`${entry.from} repeated to stake ${entry.value}`);
            var oldVal = stakedPerUser.get(entry.from);
            // console.log(`old value is ${oldVal}`);
            stakedPerUser.set(entry.from, oldVal.add(BigNumber.from(entry.value)));  
        }
        totalStaked = totalStaked.add(BigNumber.from(entry.value));
        }
    }
    i = i + 1;
   response = await fetch(scanUrl+`&page=${i}&sort=desc`);
   dataPerPage = await response.json(); 
  //  console.log(`total length ${dataPerPage.result.length}`);
}
console.log(">> Number of stakers:", accountsCaptured.length);
i = 1;
  scanUrl = `https://evmapi.confluxscan.net/api?module=account&action=txlist&address=0xeced26633b5c2d7124b5eae794c9c32a8b8e7df2&startblock=64357340&apikey=${specs.apikey}`;
  var response = await fetch(scanUrl+`&page=${i}&sort=desc`);
  var dataPerPage = await response.json(); //extract JSON from the http response
  // console.log(dataPerPage);
  lpaccountsCaptured = [];
  while (dataPerPage.result.length > 0) {
    for (const entry of dataPerPage.result) {
        // console.log(entry);
        if (entry.input.includes('0x8dbdbe6d')){
        if (lpaccountsCaptured.includes(entry.from) == false) {
            lpaccountsCaptured.push(entry.from);
        }
        }
    }
    // console.log(`total length ${dataPerPage.result.length}`);
    i = i + 1;
    // console.log(`wait 5 seconds`);
    // await config.delay(5000);
    // console.log(`wait 5 seconds done`);
   response = await fetch(scanUrl+`&page=${i}&sort=desc`);
   dataPerPage = await response.json(); 
}
console.log(">> Number of LP stakers:", lpaccountsCaptured.length);
}

run();