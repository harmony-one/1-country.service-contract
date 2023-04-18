const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { BigNumber } = require("ethers");

const dotName = "test.country";
const emojiReactionPrices = [
    ethers.utils.parseEther("1"),
    ethers.utils.parseEther("10"),
    ethers.utils.parseEther("100"),
];

const ZERO_ADDRESS = ethers.constants.AddressZero;

const increaseTime = async (sec) => {
    await network.provider.send("evm_increaseTime", [sec]);
    await network.provider.send("evm_mine");
};

describe("Emoji", () => {
    let deployer, alice, bob, john, revenueAccount;
    let mockDC, emoji;

    beforeEach(async () => {
        [deployer, alice, bob, john, revenueAccount] = await ethers.getSigners();

        // Deploy MockDC contract
        const MockDC = await ethers.getContractFactory("MockDC");
        mockDC = await MockDC.deploy();

        // Deploy Emoji contract
        const Emoji = await ethers.getContractFactory("Emoji");
        emoji = await upgrades.deployProxy(Emoji, [mockDC.address, revenueAccount.address]);

        // Set the emoji reaction prices
        for (let i = 0; i < emojiReactionPrices.length; i++) {
            await emoji.setEmojiReactionPrice(i, emojiReactionPrices[i]);
        }
    });

    describe("setDCAddress", () => {
        it("Should be able set the DC contract", async () => {
            expect(await emoji.dc()).to.equal(mockDC.address);

            await emoji.setDCAddress(alice.address);

            expect(await emoji.dc()).to.equal(alice.address);
        });

        it("Should revert if the caller is not owner", async () => {
            await expect(emoji.connect(alice).setDCAddress(alice.address)).to.be.reverted;
        });
    });

    describe("setEmojiReactionPrice", () => {
        it("Should be able set the emoji reaction price", async () => {
            const emojiType = 1;

            expect(await emoji.emojiReactionPrices(emojiType)).to.equal(
                emojiReactionPrices[emojiType]
            );

            await emoji.setEmojiReactionPrice(emojiType, emojiReactionPrices[emojiType].add(1));

            expect(await emoji.emojiReactionPrices(emojiType)).to.deep.equal(
                emojiReactionPrices[emojiType].add(1)
            );
        });

        it("Should revert if the caller is not owner", async () => {
            const emojiType = 1;
            await expect(
                emoji
                    .connect(alice)
                    .setEmojiReactionPrice(emojiType, emojiReactionPrices[emojiType])
            ).to.be.reverted;
        });
    });

    describe("setRevenueAccount", () => {
        it("Should be able set the revenue account", async () => {
            expect(await emoji.revenueAccount()).to.equal(revenueAccount.address);

            await emoji.setRevenueAccount(alice.address);

            expect(await emoji.revenueAccount()).to.equal(alice.address);
        });

        it("Should revert if the caller is not owner", async () => {
            await expect(emoji.connect(alice).setRevenueAccount(alice.address)).to.be.reverted;
        });
    });

    describe("addEmojiReaction", () => {
        const emojiType = 1;

        beforeEach(async () => {
            await mockDC.connect(alice).register(dotName);
        });

        it("Should be able add the emoji reaction", async () => {
            expect(await emoji.getEmojiReactions(dotName)).to.be.empty;

            await emoji
                .connect(alice)
                .addEmojiReaction(dotName, emojiType, { value: emojiReactionPrices[emojiType] });

            expect(await emoji.getEmojiReactions(dotName)).to.deep.members([
                [emojiType, alice.address],
            ]);
        });

        it("Should revert if the payment amount is not correct", async () => {
            await expect(
                emoji.connect(alice).addEmojiReaction(dotName, emojiType, {
                    value: emojiReactionPrices[emojiType].sub(1),
                })
            ).to.be.revertedWith("Emoji: incorrect payment");
        });

        it("Should revert if the domain is expired", async () => {
            // increase time
            const duration = await mockDC.duration();
            await increaseTime(Number(duration.add(1)));

            await expect(
                emoji.connect(alice).addEmojiReaction(dotName, emojiType, {
                    value: emojiReactionPrices[emojiType].sub(1),
                })
            ).to.be.revertedWith("Emoji: expired domain");
        });
    });

    describe("withdraw", () => {
        const tokenId = ethers.utils.id(dotName);
        const emojiType = 1;

        beforeEach(async () => {
            await mockDC.connect(alice).register(dotName);
            await emoji
                .connect(alice)
                .addEmojiReaction(dotName, emojiType, { value: emojiReactionPrices[emojiType] });
        });

        it("Should be able to withdraw tokens by the owner", async () => {
            const revenueAccountBalanceBefore = await ethers.provider.getBalance(
                revenueAccount.address
            );

            // withdraw ONE tokens
            await emoji.withdraw();

            const revenueAccountBalanceAfter = await ethers.provider.getBalance(
                revenueAccount.address
            );
            expect(revenueAccountBalanceAfter).gt(revenueAccountBalanceBefore);
        });

        it("Should be able to withdraw tokens by revenue account", async () => {
            const revenueAccountBalanceBefore = await ethers.provider.getBalance(
                revenueAccount.address
            );

            // withdraw ONE tokens
            await emoji.connect(revenueAccount).withdraw();

            const revenueAccountBalanceAfter = await ethers.provider.getBalance(
                revenueAccount.address
            );
            expect(revenueAccountBalanceAfter).gt(revenueAccountBalanceBefore);
        });

        it("Should revert if the caller is not the owner or revenue account", async () => {
            await expect(emoji.connect(alice).withdraw()).to.be.revertedWith(
                "Emoji: must be owner or revenue account"
            );
        });
    });

    describe("pause/unpause", () => {
        it("Pause", async () => {
            expect(await emoji.paused()).to.be.false;

            // Pause the contract
            await emoji.pause();

            // check pause status
            expect(await emoji.paused()).to.be.true;
        });

        it("Unpause", async () => {
            // Pause the contract
            await emoji.pause();

            // Unpause the contract
            await emoji.unpause();

            // check pause status
            expect(await emoji.paused()).to.be.false;
        });

        it("Should revert if the caller is not the owner", async () => {
            await expect(emoji.connect(alice).pause()).to.be.reverted;
            await expect(emoji.connect(alice).unpause()).to.be.reverted;
        });
    });
});
