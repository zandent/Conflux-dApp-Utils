const express = require('express');
const app = express();
// Define your REST API endpoints here
// ...

const { BigNumber } = require("@ethersproject/bignumber");
const config = require('../../config.js');
const specs = config.specs;

const Web3 = require('web3');

const web3 = new Web3(specs.nodeUrl);

let erc20 = require(`../../ABIs/IERC20.sol/IERC20.json`);

// Contract address of the ERC20 token
const contractAddress = '0xa4b59aa3de2af57959c23e2c9c89a2fcb408ce6a';
const vaults = ["0xe97331a4f26615b7697480f88a0ce5e40e395bbd", "0x8f166C625B37B81627546cCF3D02A9caf0176Df6", "0x4bEac46B98bfCb25d9B4F7B3Eebb7D68a9DcfbB6", "0x645Ba643625983700793931eA54cba873A321c30", "0xe48bfBE83dADEdda294f43eF387dd6c72f1fD3cE"];
const MAXTOTALSUPPLY = web3.utils.toWei("100000000");

// Create a new instance of the ERC20 token contract
const erc20Contract = new web3.eth.Contract(erc20.abi, contractAddress);

// Function to get the total supply of the ERC20 token
const getTotalSupply = async () => {
  const totalSupply = await erc20Contract.methods.totalSupply().call();
  return totalSupply;
};

const getCirculatingSupply = async () => {
    const totalSupply = await erc20Contract.methods.totalSupply().call();
    var circulatingSupply = BigNumber.from(totalSupply).sub(BigNumber.from(MAXTOTALSUPPLY).mul(4).div(10));
    return circulatingSupply.toString();
  };

// REST endpoint to get the total supply of the ERC20 token
app.get('/api/v:version/gol_supplies', async (req, res) => {
    if(req.params.version == 1) {
    const queryType = req.query.q;
    if (queryType == "circulating") {
        const circulatingSupply = await getCirculatingSupply();
        res.json({circulatingSupply});
        return;
    }else if(queryType == "totalsupply"){
        const totalSupply = await getTotalSupply();
        res.json({totalSupply});
        return;
    }
    }
    return res.json("GET: invalid version");
});

// Start the server
app.listen(3000, () => {
    console.log('Server started on port 3000');
  });

// http://localhost:3000/api/v1/gol_supplies?q=totalsupply
// http://localhost:3000/api/v1/gol_supplies?q=circulating