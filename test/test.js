const { expect } = require("chai");
const { ethers, upgrades, network } = require("hardhat");
const { BigNumber } = require("ethers");

const dotName = "test.country";
const urlUpdatePrice = ethers.utils.parseEther("1");

const ZERO_ADDRESS = ethers.constants.AddressZero;

const increaseTime = async (sec) => {
    await network.provider.send("evm_increaseTime", [sec]);
    await network.provider.send("evm_mine");
};

const getTimestamp = async () => {
    const blockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber);
    return BigNumber.from(block.timestamp);
};

describe("VanityURL", () => {
    let deployer, alice, bob, revenueAccount;
    let mockDC, vanityURL;

    beforeEach(async () => {
        [deployer, alice, bob, revenueAccount] = await ethers.getSigners();

        // Deploy MockDC contract
        const MockDC = await ethers.getContractFactory("MockDC");
        mockDC = await MockDC.deploy();

        // Deploy VanityURL contract
        const VanityURL = await ethers.getContractFactory("VanityURL");
        vanityURL = await upgrades.deployProxy(VanityURL, [
            mockDC.address,
            urlUpdatePrice,
            revenueAccount.address,
        ]);
    });

    describe("setRevenueAccount", () => {
        it("Should be able set the revenue account", async () => {
            expect(await vanityURL.revenueAccount()).to.equal(revenueAccount.address);

            await vanityURL.setRevenueAccount(alice.address);

            expect(await vanityURL.revenueAccount()).to.equal(alice.address);
        });

        it("Should revert if the caller is not owner", async () => {
            await expect(vanityURL.connect(alice).setRevenueAccount(alice.address)).to.be.reverted;
        });
    });

    describe("addNewURL", () => {
        const tokenId = ethers.utils.id(dotName);
        const aliasName = "aliasName";
        const url = "url";
        const price = ethers.utils.parseEther("2");

        beforeEach(async () => {
            await mockDC.connect(alice).register(dotName);
        });

        it("Should be able to set a new URL", async () => {
            expect(await vanityURL.getAliasNameCount(dotName)).to.equal(0);
            expect(await vanityURL.vanityURLs(tokenId, aliasName)).to.deep.equal([
                "",
                0,
                ZERO_ADDRESS,
            ]);

            // set a new URL
            await vanityURL
                .connect(alice)
                .addNewURL(dotName, aliasName, url, price, { value: urlUpdatePrice });

            expect(await vanityURL.getAliasNameCount(dotName)).to.equal(1);
            expect(await vanityURL.aliasNames(tokenId, 0)).to.equal(aliasName);
            expect(await vanityURL.vanityURLs(tokenId, aliasName)).to.deep.equal([
                url,
                price,
                alice.address,
            ]);
        });

        it("Should be able to set a new URL after the domain ownership was changed but not expired", async () => {
            // set a new URL
            await vanityURL
                .connect(alice)
                .addNewURL(dotName, aliasName, url, price, { value: urlUpdatePrice });

            // transfer the ownership
            await vanityURL.connect(alice).trasnferURLOwnership(dotName, bob.address);
            await mockDC.connect(bob).trasnferDomain(dotName);

            expect(await vanityURL.aliasNames(tokenId, 0)).to.equal(aliasName);
            expect(await vanityURL.vanityURLs(tokenId, aliasName)).to.deep.equal([
                url,
                price,
                bob.address,
            ]);

            // set a new URL
            const newAliasName = "newAliasName";
            const newURL = "newURL";
            const newPrice = price.add(1);

            await vanityURL
                .connect(bob)
                .addNewURL(dotName, newAliasName, newURL, newPrice, { value: urlUpdatePrice });

            expect(await vanityURL.getAliasNameCount(dotName)).to.equal(2);
            expect(await vanityURL.aliasNames(tokenId, 1)).to.equal(newAliasName);
            expect(await vanityURL.vanityURLs(tokenId, newAliasName)).to.deep.equal([
                newURL,
                newPrice,
                bob.address,
            ]);
        });

        it("Should revert if the caller is not the name owner", async () => {
            await expect(
                vanityURL.addNewURL(dotName, aliasName, url, price, { value: urlUpdatePrice })
            ).to.be.revertedWith("VanityURL: only DC owner");
        });

        it("Should revert if the URL already exists", async () => {
            // set a new URL
            await vanityURL
                .connect(alice)
                .addNewURL(dotName, aliasName, url, price, { value: urlUpdatePrice });

            // set the URL twice
            await expect(
                vanityURL
                    .connect(alice)
                    .addNewURL(dotName, aliasName, url, price, { value: urlUpdatePrice })
            ).to.be.revertedWith("VanityURL: url already exists");
        });

        it("Should revert if the payment amount is not correct", async () => {
            await expect(
                vanityURL
                    .connect(alice)
                    .addNewURL(dotName, aliasName, url, price, { value: urlUpdatePrice.sub(1) })
            ).to.be.revertedWith("VanityURL: incorrect payment");
        });

        it("Should revert if the domain is expired", async () => {
            // increase time
            const duration = await mockDC.duration();
            await increaseTime(Number(duration.add(1)));

            // set a new URL
            const newAliasName = "newAliasName";
            const newURL = "newURL";

            await expect(
                vanityURL
                    .connect(alice)
                    .addNewURL(dotName, newAliasName, newURL, price, { value: urlUpdatePrice })
            ).to.be.revertedWith("VanityURL: expired domain");
        });
    });

    describe("deleteURL", () => {
        const tokenId = ethers.utils.id(dotName);
        const aliasName = "aliasName";
        const url = "url";
        const price = ethers.utils.parseEther("2");

        beforeEach(async () => {
            await mockDC.connect(alice).register(dotName);
            await vanityURL
                .connect(alice)
                .addNewURL(dotName, aliasName, url, price, { value: urlUpdatePrice });
        });

        it("Should be able to delete the URL", async () => {
            expect(await vanityURL.getAliasNameCount(dotName)).to.equal(1);
            expect(await vanityURL.aliasNames(tokenId, 0)).to.equal(aliasName);
            expect(await vanityURL.vanityURLs(tokenId, aliasName)).to.deep.equal([
                url,
                price,
                alice.address,
            ]);

            // delete the URL
            await vanityURL.connect(alice).deleteURL(dotName, aliasName);

            expect(await vanityURL.getAliasNameCount(dotName)).to.equal(0);
            expect(await vanityURL.vanityURLs(tokenId, aliasName)).to.deep.equal([
                "",
                0,
                ZERO_ADDRESS,
            ]);
        });

        it("Should be able to delete the URL after both the domain and vanity url ownerships are changed but not expired", async () => {
            expect(await vanityURL.getAliasNameCount(dotName)).to.equal(1);
            expect(await vanityURL.aliasNames(tokenId, 0)).to.equal(aliasName);
            expect(await vanityURL.vanityURLs(tokenId, aliasName)).to.deep.equal([
                url,
                price,
                alice.address,
            ]);

            // transfer the ownership
            await vanityURL.connect(alice).trasnferURLOwnership(dotName, bob.address);
            await mockDC.connect(bob).trasnferDomain(dotName);

            // delete the URL
            await vanityURL.connect(bob).deleteURL(dotName, aliasName);

            expect(await vanityURL.getAliasNameCount(dotName)).to.equal(0);
            expect(await vanityURL.vanityURLs(tokenId, aliasName)).to.deep.equal([
                "",
                0,
                ZERO_ADDRESS,
            ]);
        });

        it("Should not be able to delete the URL after the domain ownership is changed but vanity url ownership is not changed", async () => {
            // transfer the ownership
            await mockDC.connect(bob).trasnferDomain(dotName);

            // delete the URL
            await expect(vanityURL.connect(bob).deleteURL(dotName, aliasName)).to.be.revertedWith(
                "VanityURL: only url owner"
            );
        });

        it("Should revert if the caller is not the name owner", async () => {
            await expect(vanityURL.deleteURL(dotName, aliasName)).to.be.revertedWith(
                "VanityURL: only DC owner"
            );
        });

        it("Should revert if the URL to delete doesn't exist", async () => {
            const newAliasName = "newAliasName";
            await expect(
                vanityURL.connect(alice).deleteURL(dotName, newAliasName)
            ).to.be.revertedWith("VanityURL: url does not exist");
        });
    });

    describe("updateURL", () => {
        const tokenId = ethers.utils.id(dotName);
        const aliasName = "aliasName";
        const url = "url";
        const price = ethers.utils.parseEther("2");

        beforeEach(async () => {
            await mockDC.connect(alice).register(dotName);
            await vanityURL
                .connect(alice)
                .addNewURL(dotName, aliasName, url, price, { value: urlUpdatePrice });
        });

        it("Should be able to update the existing URL", async () => {
            expect(await vanityURL.getAliasNameCount(dotName)).to.equal(1);
            expect(await vanityURL.vanityURLs(tokenId, aliasName)).to.deep.equal([
                url,
                price,
                alice.address,
            ]);

            // update the URL and price
            const newURL = "newURL";
            const newPrice = ethers.utils.parseEther("3");
            await vanityURL.connect(alice).updateURL(dotName, aliasName, newURL, newPrice);

            expect(await vanityURL.getAliasNameCount(dotName)).to.equal(1);
            expect(await vanityURL.vanityURLs(tokenId, aliasName)).to.deep.equal([
                newURL,
                newPrice,
                alice.address,
            ]);
        });

        it("Should be able to update after both the domain and vanity url ownerships are changed but not expired", async () => {
            expect(await vanityURL.getAliasNameCount(dotName)).to.equal(1);
            expect(await vanityURL.vanityURLs(tokenId, aliasName)).to.deep.equal([
                url,
                price,
                alice.address,
            ]);

            // transfer the ownership
            await vanityURL.connect(alice).trasnferURLOwnership(dotName, bob.address);
            await mockDC.connect(bob).trasnferDomain(dotName);

            // update the URL
            const newURL = "newURL";
            const newPrice = ethers.utils.parseEther("3");
            await vanityURL.connect(bob).updateURL(dotName, aliasName, newURL, newPrice);

            expect(await vanityURL.getAliasNameCount(dotName)).to.equal(1);
            expect(await vanityURL.vanityURLs(tokenId, aliasName)).to.deep.equal([
                newURL,
                newPrice,
                bob.address,
            ]);
        });

        it("Should revert if the domain ownership is changed but the vanity url ownership is not changed", async () => {
            // transfer the ownership
            await mockDC.connect(bob).trasnferDomain(dotName);

            // delete the URL
            const newURL = "newURL";
            const newPrice = ethers.utils.parseEther("3");
            await expect(
                vanityURL.connect(bob).updateURL(dotName, aliasName, newURL, newPrice)
            ).to.be.revertedWith("VanityURL: only url owner");
        });

        it("Should revert if the caller is not the name owner", async () => {
            const newURL = "newURL";
            await expect(vanityURL.updateURL(dotName, aliasName, newURL, price)).to.be.revertedWith(
                "VanityURL: only DC owner"
            );
        });

        it("Should revert if the domain is expired", async () => {
            // increase time
            const duration = await mockDC.duration();
            await increaseTime(Number(duration.add(1)));

            // set a new URL
            const newURL = "newURL";

            await expect(
                vanityURL.connect(alice).updateURL(dotName, aliasName, newURL, price)
            ).to.be.revertedWith("VanityURL: expired domain");
        });
    });

    // describe("getURL", () => {
    //     const tokenId = ethers.utils.id(dotName);
    //     const aliasName = "aliasName";
    //     const url = "url";
    //     const price = ethers.utils.parseEther("2");

    //     beforeEach(async () => {
    //         await mockDC.connect(alice).register(dotName);
    //         await vanityURL
    //             .connect(alice)
    //             .addNewURL(dotName, aliasName, url, price, { value: urlUpdatePrice });
    //     });

    //     it("Should be able to returns the price", async () => {
    //         expect(await vanityURL.getURL(dotName, aliasName)).to.equal(url);
    //     });

    //     it("Should be able to return 0 if the domain is expired", async () => {
    //         // increase time
    //         const duration = await mockDC.duration();
    //         await increaseTime(Number(duration.add(1)));

    //         expect(await vanityURL.getURL(dotName, aliasName)).to.equal("");
    //     });
    // });

    // describe("getPrice", () => {
    //     const tokenId = ethers.utils.id(dotName);
    //     const aliasName = "aliasName";
    //     const url = "url";
    //     const price = ethers.utils.parseEther("2");

    //     beforeEach(async () => {
    //         await mockDC.connect(alice).register(dotName);
    //         await vanityURL
    //             .connect(alice)
    //             .addNewURL(dotName, aliasName, url, price, { value: urlUpdatePrice });
    //     });

    //     it("Should be able to returns the price", async () => {
    //         expect(await vanityURL.getPrice(dotName, aliasName)).to.equal(price);
    //     });

    //     it("Should be able to return 0 if the domain is expired", async () => {
    //         // increase time
    //         const duration = await mockDC.duration();
    //         await increaseTime(Number(duration.add(1)));

    //         expect(await vanityURL.getPrice(dotName, aliasName)).to.equal(0);
    //     });
    // });

    describe("withdraw", () => {
        const tokenId = ethers.utils.id(dotName);
        const aliasName = "aliasName";
        const url = "url";
        const price = ethers.utils.parseEther("2");

        beforeEach(async () => {
            await mockDC.connect(alice).register(dotName);
            await vanityURL
                .connect(alice)
                .addNewURL(dotName, aliasName, url, price, { value: urlUpdatePrice });
        });

        it("Should be able to withdraw tokens", async () => {
            const revenueAccountBalanceBefore = await ethers.provider.getBalance(
                revenueAccount.address
            );

            // withdraw ONE tokens
            await vanityURL.connect(revenueAccount).withdraw();

            const revenueAccountBalanceAfter = await ethers.provider.getBalance(
                revenueAccount.address
            );
            expect(revenueAccountBalanceAfter).gt(revenueAccountBalanceBefore);
        });

        it("Should revert if the caller is not the owner or revenue account", async () => {
            await expect(vanityURL.connect(alice).withdraw()).to.be.revertedWith(
                "VanityURL: must be owner or revenue account"
            );
        });
    });
});
