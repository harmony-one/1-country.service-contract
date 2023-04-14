const config = require("../config");

const deployVanityURL = async (hre) => {
    const { deploy } = hre.deployments;
    const { deployer } = await hre.getNamedAccounts();

    const dcAddress = config.dc;
    const urlUpdatePrice = 0;
    const revenueAccount = config.revenueAccount;

    await deploy("VanityURL", {
        from: deployer,
        args: [],
        log: true,
        proxy: {
            proxyContract: "OpenZeppelinTransparentProxy",
            viaAdminContract: "DefaultProxyAdmin",
            execute: {
                init: {
                    methodName: "initialize",
                    args: [dcAddress, urlUpdatePrice, revenueAccount],
                },
            },
        },
    });
};
module.exports = deployVanityURL;
deployVanityURL.tags = ["VanityURL"];
