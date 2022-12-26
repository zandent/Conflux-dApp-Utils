const Web3 = require('web3');
const fs = require('fs');
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
let contract = require(`../../ABIs/IERC20.sol/IERC20.json`);
contract.instance = new w3.eth.Contract(contract.abi);
contract.instance.options.address = addresses.GoledoToken;
let balanceExpected = w3.utils.toWei('2416666');
let recvInfos = [['0x8f166C625B37B81627546cCF3D02A9caf0176Df6',w3.utils.toWei('1166666')],['0x645Ba643625983700793931eA54cba873A321c30',w3.utils.toWei('1250000')]];

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
  let senderBalance = await contract.instance.methods.balanceOf(account).call();
  console.log("👉 Sender balance is:", senderBalance.toString());
  if (senderBalance.toString() != balanceExpected) {
    console.log("❌ Balance is not correct", balanceExpected);
    return;
  }
  for (var i=0; i < recvInfos.length; i++) {
    data = contract.instance.methods.transfer(recvInfos[i][0], recvInfos[i][1]).encodeABI();
    try {
      await ethTransact(data, contract.instance.options.address, nonce, specs.privateKey, account);
    } catch (error) {
      console.log(error.toString());
      console.log(">> ❌ Transfer failed!");
      return;
    }
    console.log(">> ✅ Transfer success!");
    nonce = nonce + 1;
  }
  for (var i=0; i < recvInfos.length; i++) {
    let receiverBalance = await contract.instance.methods.balanceOf(recvInfos[i][0]).call();
    console.log("👉 Receiver:", recvInfos[i][0], "balance is", receiverBalance.toString());
  }
}

run();