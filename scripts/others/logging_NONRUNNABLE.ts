import { BigNumber, constants } from "ethers";
import { ethers, network } from "hardhat";
async function main() {
  const [deployer] = await ethers.getSigners();
  // let _gasPrice = await ethers.provider.getGasPrice();
  // console.log(deployer.address);
  // console.log(_gasPrice.mul(11).div(10));
  // for(var i =0 ; i < 20; i++){
  // const tx = await deployer.sendTransaction({
  //   to: '0xc6e865c213c89ca42a622c5572d19f00d84d7a16',
  //   value:0,
  //   gasPrice: _gasPrice.mul(11).div(10),
  //   gasLimit: 300000,
  // });
  // await tx.wait();
  // console.log(`✅ ${i} executeTransaction:`, tx.hash);
  // }
  const contract = "0xc6e865c213c89ca42a622c5572d19f00d84d7a16";
  const eventSignature: string = 'CFXsCreated(uint256,address,uint256,string)';
  const eventTopic: string = ethers.utils.id(eventSignature);
  console.log(eventTopic);
  let from = 85383170;
  let to = 	 85388330;
  const searchPattern = deployer.address.toLowerCase().slice(-40);
  console.log(searchPattern);
  for(var i = from; i < to; i = i + 100){
    let logs = await ethers.provider.getLogs(
      {
        address: contract,
        topics: [eventTopic],
        fromBlock: i, 
        toBlock: i+99
      }
    );
    // console.log(logs);
    for(var log of logs){
      // console.log(log);
      let startIndex = log.data.toLowerCase().indexOf(searchPattern);
      // If the pattern is found, extract the substring and convert it to decimal
      if (startIndex !== -1) {
        const substring = log.data.substring(0, 66);
        const decimalValue = BigInt(substring).toString(); 
        // console.log('Substring:', substring);
        // console.log('Decimal Value:', decimalValue);
        console.log(decimalValue);
      } else {
        // console.log('Pattern not found in the input string.');
      }
    }
  }
  // ids:
  // 811355
  // 812406
  // 814998
  // 815726
  // 817702
  // 855271
  // 857535
  // 858694
  // 861643
  // 862406
  // 863290
  // 864800
  // 865582
  // 870003
  // 872890
  // 887862
  // 889392
  // 890087
  // 891743
  // 892146
  // 894111
  // 895092
  // 895702
  // 896181
  // 898135
  // 900839
  // 901946
  // 903141
  // 903745
  // 905665
  // 907195
  // 908489
  // 908923
  // 909460
  // 910005
  // 933257
  // 933782
  // 934654
  // 937148
  // 941755
  // 942436
  // 942863
  // 943231
  // 945018
  // 945568
  // 945967
  // 948654
  // 949623
  // 952702
  // 954462
  // 954903
  // 955952
  // 957263
  // 957747
  // 958003
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
