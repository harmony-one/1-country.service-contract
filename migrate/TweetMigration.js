const { ethers } = require("hardhat");
const config = require("../config");

const deployMigration = async (hre) => {
    const { deploy } = hre.deployments;
    const { deployer } = await hre.getNamedAccounts();

    const domains = []; // domain list here
    
    const tweetContract = await ethers.getContractAt("Tweet", config.tweetAddress);
    const postContract = await ethers.getContract("Post");

    const tweetCount = 0;
    for (let i = 0; i < domains.length; i++) {
        let domain = domains[i];

        // get tweet list
        const tweetList = await tweetContract.getAllUrls(domain);
        
        // migrate data
        await postContract.migrate(domain, tweetList);
    }

    console.log('migrate done');

};
module.exports = deployMigration;
deployMigration.tags = ["migration"];
