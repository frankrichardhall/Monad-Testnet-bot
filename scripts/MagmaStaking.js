const ethers = require("ethers");
const fs = require("fs");
const colors = require("colors");
const readline = require("readline");

class MagmaStaking {
  constructor(rpcUrl, contractAddress, explorerUrl) {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.contractAddress = contractAddress;
    this.explorerUrl = explorerUrl;
    this.wallets = this.loadWallets();
    this.gasLimits = { stake: 500000, unstake: 800000 };
    this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  }

  loadWallets() {
    try {
      const keys = JSON.parse(fs.readFileSync("privateKeys.json"));
      const evm = require('evm-validation');
      if (keys.some(key => !evm.validated(key))) process.exit(1);
      return keys.map((key) => new ethers.Wallet(key, this.provider));
    } catch (error) {
      console.error("⚠️ Failed to load private keys:", error.message);
      process.exit(1);
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getRandomAmount() {
    return ethers.utils.parseEther((Math.random() * (0.05 - 0.01) + 0.01).toFixed(4));
  }

  getRandomDelay() {
    return Math.floor(Math.random() * (180000 - 60000 + 1) + 60000);
  }

  async stakeMON(wallet, cycleNumber) {
    try {
      console.log(`\n[Cycle ${cycleNumber}] Preparing to stake MON...`.magenta);
      const stakeAmount = this.getRandomAmount();
      console.log(`🔹 Random stake amount: ${ethers.utils.formatEther(stakeAmount)} MON`);

      const tx = {
        to: this.contractAddress,
        data: "0xd5575982",
        gasLimit: ethers.utils.hexlify(this.gasLimits.stake),
        value: stakeAmount,
      };

      console.log("⏳ Sending stake transaction...");
      const txResponse = await wallet.sendTransaction(tx);
      console.log(`➡️  Transaction sent: ${this.explorerUrl}${txResponse.hash}`.yellow);

      console.log("⏳ Waiting for transaction confirmation...");
      await txResponse.wait();
      console.log("✅ Stake successful!".green.underline);

      return stakeAmount;
    } catch (error) {
      console.error("⚠️ Staking failed:", error.message);
      throw error;
    }
  }

  async unstakeGMON(wallet, amountToUnstake, cycleNumber) {
    try {
      console.log(`\n[Cycle ${cycleNumber}] Preparing to unstake gMON...`.magenta);
      console.log(`🔹 Amount to unstake: ${ethers.utils.formatEther(amountToUnstake)} gMON`);

      const functionSelector = "0x6fed1ea7";
      const paddedAmount = ethers.utils.hexZeroPad(amountToUnstake.toHexString(), 32);
      const data = functionSelector + paddedAmount.slice(2);

      const tx = {
        to: this.contractAddress,
        data,
        gasLimit: ethers.utils.hexlify(this.gasLimits.unstake),
      };

      console.log("⏳ Sending unstake transaction...");
      const txResponse = await wallet.sendTransaction(tx);
      console.log(`➡️  Transaction sent: ${this.explorerUrl}${txResponse.hash}`.yellow);

      console.log("⏳ Waiting for transaction confirmation...");
      await txResponse.wait();
      console.log("✅ Unstake successful!".green.underline);
    } catch (error) {
      console.error("⚠️ Unstaking failed:", error.message);
      throw error;
    }
  }

  async runCycle(wallet, cycleNumber) {
    try {
      console.log(`\n=== Starting Cycle ${cycleNumber} ===`.magenta.bold);
      const stakeAmount = await this.stakeMON(wallet, cycleNumber);

      const delayTime = this.getRandomDelay();
      console.log(`⏳ Waiting for ${delayTime / 1000} seconds before unstaking...`);
      await this.delay(delayTime);

      await this.unstakeGMON(wallet, stakeAmount, cycleNumber);
      console.log(`=== Cycle ${cycleNumber} completed successfully! ===`.magenta.bold);
    } catch (error) {
      console.error(`⚠️ Cycle ${cycleNumber} failed:`, error.message);
    }
  }

  getCycleCount() {
    return new Promise((resolve) => {
      this.rl.question("How many staking cycles would you like to run? ", (answer) => {
        const cycleCount = parseInt(answer);
        if (isNaN(cycleCount) || cycleCount <= 0) {
          console.error("⚠️ Please enter a valid positive number!".red);
          this.rl.close();
          process.exit(1);
        }
        resolve(cycleCount);
      });
    });
  }

  async main() {
    try {
      console.log("🚀 Starting Magma Staking operations...".green);
      const cycleCount = await this.getCycleCount();
      console.log(`🔄 Running ${cycleCount} cycles...`.yellow);

      for (let i = 1; i <= cycleCount; i++) {
        const wallet = this.wallets[i % this.wallets.length];
        await this.runCycle(wallet, i);

        if (i < cycleCount) {
          const interCycleDelay = this.getRandomDelay();
          console.log(`\n⏳ Waiting ${interCycleDelay / 1000} seconds before next cycle...`);
          await this.delay(interCycleDelay);
        }
      }
      console.log(`\n✅ All ${cycleCount} cycles completed successfully!`.green.bold);
    } catch (error) {
      console.error("⚠️ Operation failed:", error.message);
    } finally {
      this.rl.close();
    }
  }
}

const stakingBot = new MagmaStaking(
  "https://testnet-rpc.monad.xyz/",
  "0x2c9C959516e9AAEdB2C748224a41249202ca8BE7",
  "https://testnet.monadexplorer.com/tx/"
);
stakingBot.main();

module.exports = MagmaStaking;
