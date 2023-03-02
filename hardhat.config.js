require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');
require("hardhat-deploy");
require("solidity-docgen");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("dotenv").config();

// REQUIRED TO ENSURE METADATA IS SAVED IN DEPLOYMENTS (because solidity-coverage disable it otherwise)
const {
    TASK_COMPILE_GET_COMPILER_INPUT,
    TASK_COMPILE_SOLIDITY_COMPILE,
} = require("hardhat/builtin-tasks/task-names");
task(TASK_COMPILE_GET_COMPILER_INPUT).setAction(async (_, bre, runSuper) => {
    const input = await runSuper();
    input.settings.metadata.useLiteralContent = bre.network.name !== "coverage";
    return input;
});

module.exports = {
    defaultNetwork: "hardhat",
    gasReporter: {
        enabled: process.env.REPORT_GAS ? true : false,
        showTimeSpent: true,
        currency: "USD",
    },
    networks: {
        hardhat: {
            allowUnlimitedContractSize: true,
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200,
                },
            },
        },
        local: {
            url: "http://localhost:8545",
            saveDeployments: false
        },
        testnet: {
            url: process.env.TESTNET_URL,
            accounts: { mnemonic: process.env.TEST_MNEMONIC },
            chainId: 1666700000,
            live: true,
            gasMultiplier: 2,
            saveDeployments: true
        },
        mainnet: {
            url: process.env.MAINNET_URL,
            accounts: { mnemonic: process.env.MNEMONIC },
            chainId: 1666600000,
            live: true,
            gasPrice: 100e+9,
            gasMultiplier: 2,
            gas: 10e+6
        },
        s1: {
            url: process.env.S1_URL,
            accounts: { mnemonic: process.env.MNEMONIC },
            chainId: 1666600001,
            live: true,
            gasPrice: 100e+9,
            gasMultiplier: 2,
            gas: 10e+6
        },
        coverage: {
            url: "http://127.0.0.1:8555",
        },
    },
    solidity: {
        version: "0.8.17",
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        coverage: "./coverage",
        coverageJson: "./coverage.json",
        artifacts: "./artifacts",
    },
    mocha: {
        timeout: 50000,
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },
    docgen: {
        exclude: ["interfaces"],
        pages: "files",
    },
    contractSizer: {
        alphaSort: false,
        disambiguatePaths: false,
        runOnCompile: false,
        strict: false,
        only: [],
        except: [],
    },
};
