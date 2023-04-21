const config = require("../config");

const deployEmoji = async (hre) => {
    const { deploy } = hre.deployments;
    const { deployer } = await hre.getNamedAccounts();

    const dcAddress = config.dc;
    const revenueAccount = config.revenueAccount;

    await deploy("Emoji", {
        from: deployer,
        args: [],
        log: true,
        proxy: {
            proxyContract: "OpenZeppelinTransparentProxy",
            viaAdminContract: "DefaultProxyAdmin",
            execute: {
                init: {
                    methodName: "initialize",
                    args: [dcAddress, revenueAccount],
                },
            },
        },
    });
};
module.exports = deployEmoji;
deployEmoji.tags = ["Emoji"];
