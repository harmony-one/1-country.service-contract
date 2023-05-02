const config = require("../config");

const deployPost = async (hre) => {
    const { deploy } = hre.deployments;
    const { deployer } = await hre.getNamedAccounts();

    const dcAddress = config.dc;
    const revenueAccount = config.revenueAccount;

    await deploy("Post", {
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
module.exports = deployPost;
deployPost.tags = ["Post"];
