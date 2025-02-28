const prompts = require("prompts");
const displayHeader = require("./src/displayHeader.js");

displayHeader();

const scripts = {
  rubic: "./scripts/RubicStaking.js",
  magma: "./scripts/MagmaStaking.js",
  izumi: "./scripts/IzumiStaking.js",
  apriori: "./scripts/AprioriStaking.js",
};

const availableScripts = Object.keys(scripts).map((key) => ({
  title: key.charAt(0).toUpperCase() + key.slice(1) + " Script",
  value: key,
}));

availableScripts.push({ title: "Exit", value: "exit" });

async function run() {
  const { script } = await prompts({
    type: "select",
    name: "script",
    message: "Select the script to run:",
    choices: availableScripts,
  });

  if (!script || script === "exit") {
    console.log("Exiting bot...");
    process.exit(0);
  }

  console.log(`Running ${script.charAt(0).toUpperCase() + script.slice(1)}...`);
  require(scripts[script]);
}

run().catch((error) => console.error("Error occurred:", error));
