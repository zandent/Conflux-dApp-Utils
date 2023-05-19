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
  addresses = require('../xespace/contractAddressPublicTestnet.json');
  scanUrlPrefix = 'https://evmapi-testnet.confluxscan.net';
}else{
  fileName = './scripts/xespace/contractAddressMainnet.json';
  addresses = require('../xespace/contractAddressMainnet.json');
  scanUrlPrefix = 'https://evmapi.confluxscan.net';
}

let STARTBLOCK = 123349776; // 2023-05-19 09:00:42 -04:00
let MINTIMESTAMP = 1684501200;

let NonfungiblePositionManager = require(`../../ABIs/NonfungiblePositionManager.sol/NonfungiblePositionManager.json`);
NonfungiblePositionManager.instance = new w3.eth.Contract(NonfungiblePositionManager.abi);
NonfungiblePositionManager.instance.options.address = addresses.UniswapV3NonfungiblePositionManager;
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
  // return;
  let i = 1;
  scanUrl = `${scanUrlPrefix}/api?module=account&action=txlist&startblock=${STARTBLOCK}&address=${addresses.UniswapV3NonfungiblePositionManager}`;
  var response = await fetch(`${scanUrl}&page=${i}&sort=desc&apikey=${specs.apikey}`);
  var dataPerPage = await response.json(); //extract JSON from the http response
  accountsCaptured = [];
  var totalStaked = BigNumber.from(0);
  var stakedPerUser = new Map();
  var txhashesPerUser = new Map();
  while (dataPerPage.result.length > 0) {
    console.log(i);
    for (const entry of dataPerPage.result) {
        // console.log(entry);
        if (entry.to.toLowerCase() == addresses.UniswapV3NonfungiblePositionManager.toLowerCase()){
        if (accountsCaptured.includes(entry.from) == false) {
            // console.log(`new account is set ${entry.from}`);
            accountsCaptured.push(entry.from);
            stakedPerUser.set(entry.from, BigNumber.from(entry.value).mul(27).div(100)); 
        }else{
            // console.log(`${entry.from} repeated to stake ${entry.value}`);
            var oldVal = stakedPerUser.get(entry.from);
            // console.log(`old value is ${oldVal}`);
            stakedPerUser.set(entry.from, oldVal.add(BigNumber.from(entry.value).mul(27).div(100)));  
        }
        txhashesPerUser.set(entry.hash, 1);
        totalStaked = totalStaked.add(BigNumber.from(entry.value));
        }
    }
    i = i + 1;
   response = await fetch(`${scanUrl}&page=${i}&sort=desc&apikey=${specs.apikey}`);
   dataPerPage = await response.json(); 
  //  console.log(`total length ${dataPerPage.result.length}`);
  // console.log(dataPerPage);
}
console.log(">> Number of participents:", accountsCaptured.length);
i = 1;

for (const entryAccount of accountsCaptured) {
  i = 1;
  scanUrl = `${scanUrlPrefix}/api?module=account&action=tokentx&address=${entryAccount}&startblock=${STARTBLOCK}`;
  response = await fetch(`${scanUrl}&page=${i}&sort=desc&apikey=${specs.apikey}`);
  dataPerPage = await response.json(); 
  console.log(entryAccount);
  while (dataPerPage.result.length > 0) {
    // console.log(i);
    for (const entry of dataPerPage.result) {
        // console.log(entry);
        if (entry.from.toLowerCase() == entryAccount.toLowerCase()){
          if (txhashesPerUser.get(entry.hash) != undefined) {
            if (entry.tokenSymbol == "USDT") {
              var oldVal = stakedPerUser.get(entry.from);
              stakedPerUser.set(entry.from, oldVal.add(BigNumber.from(entry.value)));  
            }else if (entry.tokenSymbol == "BTC"){
              var oldVal = stakedPerUser.get(entry.from);
              stakedPerUser.set(entry.from, oldVal.add(BigNumber.from(entry.value).mul(27551))); 
            }else if (entry.tokenSymbol == "ETH"){
              var oldVal = stakedPerUser.get(entry.from);
              stakedPerUser.set(entry.from, oldVal.add(BigNumber.from(entry.value).mul(1842))); 
            }else if (entry.tokenSymbol == "VST"){
              var oldVal = stakedPerUser.get(entry.from);
              stakedPerUser.set(entry.from, oldVal.add(BigNumber.from(entry.value).mul(5))); 
            }else if (entry.tokenSymbol == "USDC"){
              var oldVal = stakedPerUser.get(entry.from);
              stakedPerUser.set(entry.from, oldVal.add(BigNumber.from(entry.value))); 
            }
          }
        }
    }
    i = i + 1;
   response = await fetch(`${scanUrl}&page=${i}&sort=desc&apikey=${specs.apikey}`);
   dataPerPage = await response.json(); 
  }
}
for (const entryAccount of accountsCaptured) {
  var oldVal = stakedPerUser.get(entryAccount);
  if (oldVal.gte(w3.utils.toWei('0'))) {
    console.log(`${entryAccount} added ${oldVal.div(w3.utils.toWei('1'))}`);
  }
}

//Check staker stats
i = 1;
scanUrl = `${scanUrlPrefix}/nft/transfers?contract=${addresses.UniswapV3NonfungiblePositionManager}&limit=100&minTimestamp=${MINTIMESTAMP}&to=${addresses.UniswapV3Staker}`;
var response = await fetch(`${scanUrl}&cursor=0&sort=DESC&apikey=${specs.apikey}`);
var dataPerPage = await response.json(); //extract JSON from the http response
// console.log(dataPerPage);
accountsCaptured = [];
var totalStaked = BigNumber.from(0);
stakedPerUser = new Map();
txhashesPerUser = new Map();
while (dataPerPage.result.list.length > 0) {
  console.log(i);
  for (const entry of dataPerPage.result.list) {
      // console.log(entry);
      if (entry.to.toLowerCase() == addresses.UniswapV3Staker.toLowerCase()){
        nftInfo = await NonfungiblePositionManager.instance.methods.positions(entry.tokenId).call();
        if (accountsCaptured.includes(entry.from) == false) {
            // console.log(`new account is set ${entry.from}`);
            accountsCaptured.push(entry.from);
            stakedPerUser.set(entry.from, BigNumber.from(nftInfo['7'])); 
        }else{
            // console.log(`${entry.from} repeated to stake ${entry.value}`);
            var oldVal = stakedPerUser.get(entry.from);
            // console.log(`old value is ${oldVal}`);
            stakedPerUser.set(entry.from, oldVal.add(BigNumber.from(nftInfo['7'])));
        }
        txhashesPerUser.set(entry.hash, 1);
        totalStaked = totalStaked.add(BigNumber.from(nftInfo['7']));
      }
  }
  i = i + 1;
 response = await fetch(`${scanUrl}&cursor=${dataPerPage.result.next}&sort=DESC&apikey=${specs.apikey}`);
 dataPerPage = await response.json(); 
//  console.log(`total length ${dataPerPage.result.length}`);
// console.log(dataPerPage);
}
for (const entryAccount of accountsCaptured) {
  var oldVal = stakedPerUser.get(entryAccount);
  if (oldVal.gte(w3.utils.toWei('0'))) {
    console.log(`${entryAccount} staked ${oldVal.div(w3.utils.toWei('1'))}`);
  }
}
}

run();