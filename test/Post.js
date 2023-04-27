const { expect } = require("chai");
const { ethers, upgrades, network } = require("hardhat");
const { BigNumber } = require("ethers");

const dotName = "test.country";

const ZERO_ADDRESS = ethers.constants.AddressZero;

const increaseTime = async (sec) => {
    await network.provider.send("evm_increaseTime", [sec]);
    await network.provider.send("evm_mine");
};

describe("Post", () => {
    let deployer, alice, bob, john, revenueAccount;
    let mockDC, post;

    beforeEach(async () => {
        [deployer, alice, bob, john, revenueAccount] = await ethers.getSigners();

        // Deploy MockDC contract
        const MockDC = await ethers.getContractFactory("MockDC");
        mockDC = await MockDC.deploy();

        // Deploy Post contract
        const Post = await ethers.getContractFactory("Post");
        post = await upgrades.deployProxy(Post, [mockDC.address, revenueAccount.address]);
    });

    describe("setDCAddress", () => {
        it("Should be able set the DC contract", async () => {
            expect(await post.dc()).to.equal(mockDC.address);

            await post.setDCAddress(alice.address);

            expect(await post.dc()).to.equal(alice.address);
        });

        it("Should revert if the caller is not owner", async () => {
            await expect(post.connect(alice).setDCAddress(alice.address)).to.be.reverted;
        });
    });

    describe("setRevenueAccount", () => {
        it("Should be able set the revenue account", async () => {
            expect(await post.revenueAccount()).to.equal(revenueAccount.address);

            await post.setRevenueAccount(alice.address);

            expect(await post.revenueAccount()).to.equal(alice.address);
        });

        it("Should revert if the caller is not owner", async () => {
            await expect(post.connect(alice).setRevenueAccount(alice.address)).to.be.reverted;
        });
    });

    describe("pause/unpause", () => {
        it("Pause", async () => {
            expect(await post.paused()).to.be.false;

            // Pause the contract
            await post.pause();

            // check pause status
            expect(await post.paused()).to.be.true;
        });

        it("Unpause", async () => {
            // Pause the contract
            await post.pause();

            // Unpause the contract
            await post.unpause();

            // check pause status
            expect(await post.paused()).to.be.false;
        });

        it("Should revert if the caller is not the owner", async () => {
            await expect(post.connect(alice).pause()).to.be.reverted;
            await expect(post.connect(alice).unpause()).to.be.reverted;
        });
    });
});
