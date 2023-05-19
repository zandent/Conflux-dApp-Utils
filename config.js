require("dotenv").config();
let _privateKey = process.env.PRIVATE_KEY;
if (typeof(_privateKey) == "undefined") {
  _privateKey = "0x1234567890123456789012345678901234567890123456789012345678901234";
}
const specs = {
    privateKey: _privateKey,
    network: 'espacetestnet',
    nodeUrl: `http://evmtestnet.confluxrpc.com/${process.env.INFURA_API_KEY}`,
    // network: 'espace',
    // nodeUrl: `http://evm.confluxrpc.com/${process.env.INFURA_API_KEY}`,
    apikey: process.env.ETHERSCAN_API_KEY,
};

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
};

module.exports = {
specs,
delay,
};