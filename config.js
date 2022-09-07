require("dotenv").config();
let _privateKey = process.env.PRIVATE_KEY;
if (typeof(_privateKey) == "undefined") {
  _privateKey = "0x1234567890123456789012345678901234567890123456789012345678901234";
}
const specs = {
    privateKey: _privateKey,
    network: 'espacetestnet',
    nodeUrl: 'http://evmtestnet.confluxrpc.com',
    // network: 'espace',
    // nodeUrl: 'http://evm.confluxrpc.com',
    MultiFeeDistributionAddress: "0x37a14Ffbad9283A3d4d5400d3bDAEDbB19664d64", //undet espacetestnet
};

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
};

module.exports = {
specs,
delay,
};