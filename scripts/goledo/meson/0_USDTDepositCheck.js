const Web3 = require('web3');
const fs = require('fs');
const axios = require('axios');
const { BigNumber } = require("@ethersproject/bignumber");
const config = require('../../../config.js');
const specs = config.specs;
const w3 = new Web3(specs.nodeUrl);
let addresses;
if (specs.network == 'espacetestnet') {
  addresses = require('../testnetConfig.json');
}else{
  addresses = require('../espaceConfig.json');
}
let contract = require(`../../../ABIs/goledo/UiPoolDataProvider.sol/UiPoolDataProvider.json`);
const resultAddressesFile = './scripts/goledo/meson/resultsAddresses.txt';
contract.instance = new w3.eth.Contract(contract.abi);
contract.instance.options.address = addresses.UiPoolDataProvider;
const POKEPERIOD = 86400; // 1 day 86400s
const CHECKPERIOD = 3600*1000; // 1 hour 3600s
const THRESHOLD = 100; // 100 USDT
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
  let failflag = false;
  let mesonAccountsAddressesList = [];
  let mesonAccountsAddressesListAboveThreshold = [];
  // try {
    await axios.get('https://explorer.meson.fi/api/v1/swap/cashBack')
    .then((response) => {
      mesonAccountsAddressesList = response.data.result.map(item => item.fromTo[0]);
    })
    .catch((error) => {
      // handle error
      console.log(error);
      return;
    })
    fs.appendFileSync(resultAddressesFile,  '========' + currentTime.toString() + '========' + '\r\n');
    let assetInfo = await contract.instance.methods.getSimpleReservesData(addresses.LendingPoolAddressesProvider).call();
    let USDTliquidityIndex = '';
    for (let i = 0; i < assetInfo['0'].length; i++) {
      if (assetInfo['0'][i][2] == "USDT") {
        USDTliquidityIndex = assetInfo['0'][i][13];
        break;
      }
    }
    if (USDTliquidityIndex == '') {
      console.log("❌ Cannot find USDT", assetInfo['0']);
      return;
    }
    console.log('USDT liquidity Index', USDTliquidityIndex);
    let halfLQI = BigNumber.from(USDTliquidityIndex).div(2);
    let scaledThreshold = BigNumber.from(THRESHOLD).mul(w3.utils.toWei('1')).mul(w3.utils.toWei('1000000000')).add(halfLQI).div(USDTliquidityIndex);
    console.log("👉 Now Scaled Threshold:", scaledThreshold.toString());
    for (let i = 0; i < mesonAccountsAddressesList.length; i++) {
      console.log("👉 Checking address balance:", mesonAccountsAddressesList[i]);
      let userInfo = await contract.instance.methods.getUserReservesData(addresses.LendingPoolAddressesProvider, mesonAccountsAddressesList[i]).call();
      let userBalance = '';
      for (let j = 0; j < userInfo['0'].length; j++) {
        // console.log("Checking", userInfo['0'][j][0].toLowerCase(), addresses.Markets.USDT.token.toLowerCase());
        if (userInfo['0'][j][0].toLowerCase() == addresses.Markets.USDT.token.toLowerCase()) {
          userBalance= userInfo['0'][j][1];
          break;
        }
      }
      if (userBalance == '') {
        console.log("❌ Cannot find USDT info from user", userInfo['0']);
        return;
      }
      console.log("👉 User Scaled Balance:", userBalance);
      if (scaledThreshold.lte(BigNumber.from(userBalance))) {
        mesonAccountsAddressesListAboveThreshold.push(mesonAccountsAddressesList[i]);
        console.log("👉 Above threshold:", mesonAccountsAddressesList[i]);
        fs.appendFileSync(resultAddressesFile,  '"' + mesonAccountsAddressesList[i].toString() + '",' + '\r\n');
      }
    }
    if (mesonAccountsAddressesListAboveThreshold.length !== 0) {
      console.log("👉 Try to submit");
      await axios.post("https://galxe-sync.herokuapp.com/api/v1/update/goledo", {
        rawList: mesonAccountsAddressesListAboveThreshold
      }).then((response) => {
        console.log(response);
      })
      .catch((error) => {
        console.log(error);
      });
      mesonAccountsAddressesListAboveThreshold = [];
    }
    mesonAccountsAddressesList = [];
    failflag = false;
  // } catch (error) {
  //   console.log(">> Capture Failed. Resume next cycle.");
  //   failflag = true;
  // }
  if (failflag == false){
    nonce = nonce + 1;
    console.log(">> ✅ Capture Done.");
    lastTime = currentTime;
  }
  while (1) {
    if (currentTime - lastTime > POKEPERIOD) {
      try {
        await axios.get('https://explorer.meson.fi/api/v1/swap/cashBack')
        .then((response) => {
          mesonAccountsAddressesList = response.data.result.map(item => item.fromTo[0]);
        })
        .catch((error) => {
          // handle error
          console.log(error);
          return;
        })
        fs.appendFileSync(resultAddressesFile,  '========' + currentTime.toString() + '========' + '\r\n');
        let assetInfo = await contract.instance.methods.getSimpleReservesData(addresses.LendingPoolAddressesProvider).call();
        let USDTliquidityIndex = '';
        for (let i = 0; i < assetInfo['0'].length; i++) {
          if (assetInfo['0'][i][2] == "USDT") {
            USDTliquidityIndex = assetInfo['0'][i][13];
            break;
          }
        }
        if (USDTliquidityIndex == '') {
          console.log("❌ Cannot find USDT", assetInfo['0']);
          return;
        }
        console.log('USDT liquidity Index', USDTliquidityIndex);
        let halfLQI = BigNumber.from(USDTliquidityIndex).div(2);
        let scaledThreshold = BigNumber.from(THRESHOLD).mul(w3.utils.toWei('1')).mul(w3.utils.toWei('1000000000')).add(halfLQI).div(USDTliquidityIndex);
        console.log("👉 Now Scaled Threshold:", scaledThreshold.toString());
        for (let i = 0; i < mesonAccountsAddressesList.length; i++) {
          console.log("👉 Checking address balance:", mesonAccountsAddressesList[i]);
          let userInfo = await contract.instance.methods.getUserReservesData(addresses.LendingPoolAddressesProvider, mesonAccountsAddressesList[i]).call();
          let userBalance = '';
          for (let j = 0; j < userInfo['0'].length; j++) {
            // console.log("Checking", userInfo['0'][j][0].toLowerCase(), addresses.Markets.USDT.token.toLowerCase());
            if (userInfo['0'][j][0].toLowerCase() == addresses.Markets.USDT.token.toLowerCase()) {
              userBalance= userInfo['0'][j][1];
              break;
            }
          }
          if (userBalance == '') {
            console.log("❌ Cannot find USDT info from user", userInfo['0']);
            return;
          }
          console.log("👉 User Scaled Balance:", userBalance);
          if (scaledThreshold.lte(BigNumber.from(userBalance))) {
            mesonAccountsAddressesListAboveThreshold.push(mesonAccountsAddressesList[i]);
            console.log("👉 Above threshold:", mesonAccountsAddressesList[i]);
            fs.appendFileSync(resultAddressesFile,  '"' + mesonAccountsAddressesList[i].toString() + '",' + '\r\n');
          }
        }
        if (mesonAccountsAddressesListAboveThreshold.length !== 0) {
          console.log("👉 Try to submit");
          await axios.post("https://galxe-sync.herokuapp.com/api/v1/update/goledo", {
            rawList: mesonAccountsAddressesListAboveThreshold
          }).then((response) => {
            console.log(response);
          })
          .catch((error) => {
            console.log(error);
          });
          mesonAccountsAddressesListAboveThreshold = [];
        }
        mesonAccountsAddressesList = [];
        failflag = false;
      } catch (error) {
        console.log(">> Capture Failed. Resume next cycle.");
        failflag = true;
      }
      if (failflag == false){
        nonce = nonce + 1;
        console.log(">> ✅ Capture Done.");
        lastTime = currentTime;
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