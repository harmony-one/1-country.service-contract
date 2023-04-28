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

    describe("addNewPost", () => {
        const urls = ["url1", "url2", "url3"];
        const nameSpace = "nameSpace";

        beforeEach(async () => {
            await mockDC.connect(alice).register(dotName);
        });

        it("Should be able to add new posts", async () => {
            expect(await post.getPostCount(dotName)).to.equal(0);
            expect(await post.getPosts(dotName)).to.be.empty;

            // set new posts
            await post.connect(alice).addNewPost(dotName, urls, nameSpace);

            expect(await post.getPostCount(dotName)).to.equal(urls.length);
            expect((await post.getPosts(dotName))[0]).to.deep.equal([
                0,
                urls[0],
                nameSpace,
                alice.address,
            ]);
            expect((await post.getPosts(dotName))[1]).to.deep.equal([
                1,
                urls[1],
                nameSpace,
                alice.address,
            ]);
            expect((await post.getPosts(dotName))[2]).to.deep.equal([
                2,
                urls[2],
                nameSpace,
                alice.address,
            ]);
        });

        it("Should be able to set new posts after the domain ownership was changed but not expired", async () => {
            // set new posts
            await post.connect(alice).addNewPost(dotName, urls, nameSpace);

            // transfer the ownership
            await post.connect(alice).trasnferPostOwnership(dotName, bob.address, true, "");
            await mockDC.connect(bob).trasnferDomain(dotName);

            expect(await post.getPostCount(dotName)).to.equal(urls.length);
            expect(await post.getPosts(dotName)).not.to.empty;

            // set new posts
            const newURLs = ["newURL1", "newURL2", "newURL3"];
            const newNameSpace = "newNameSpace";

            await post.connect(bob).addNewPost(dotName, newURLs, newNameSpace);

            expect(await post.getPostCount(dotName)).to.equal(urls.length + newURLs.length);
            expect((await post.getPosts(dotName))[0]).to.deep.equal([
                0,
                urls[0],
                nameSpace,
                bob.address,
            ]);
            expect((await post.getPosts(dotName))[1]).to.deep.equal([
                1,
                urls[1],
                nameSpace,
                bob.address,
            ]);
            expect((await post.getPosts(dotName))[2]).to.deep.equal([
                2,
                urls[2],
                nameSpace,
                bob.address,
            ]);
            expect((await post.getPosts(dotName))[3]).to.deep.equal([
                3,
                newURLs[0],
                newNameSpace,
                bob.address,
            ]);
            expect((await post.getPosts(dotName))[4]).to.deep.equal([
                4,
                newURLs[1],
                newNameSpace,
                bob.address,
            ]);
            expect((await post.getPosts(dotName))[5]).to.deep.equal([
                5,
                newURLs[2],
                newNameSpace,
                bob.address,
            ]);

            // transfer the ownership
            await post.connect(bob).trasnferPostOwnership(dotName, john.address, false, nameSpace);
            await mockDC.connect(john).trasnferDomain(dotName);

            expect(await post.getPostCount(dotName)).to.equal(urls.length + newURLs.length);
            expect((await post.getPosts(dotName))[0]).to.deep.equal([
                0,
                urls[0],
                nameSpace,
                john.address,
            ]);
            expect((await post.getPosts(dotName))[1]).to.deep.equal([
                1,
                urls[1],
                nameSpace,
                john.address,
            ]);
            expect((await post.getPosts(dotName))[2]).to.deep.equal([
                2,
                urls[2],
                nameSpace,
                john.address,
            ]);
            expect((await post.getPosts(dotName))[3]).to.deep.equal([
                3,
                newURLs[0],
                newNameSpace,
                bob.address,
            ]);
            expect((await post.getPosts(dotName))[4]).to.deep.equal([
                4,
                newURLs[1],
                newNameSpace,
                bob.address,
            ]);
            expect((await post.getPosts(dotName))[5]).to.deep.equal([
                5,
                newURLs[2],
                newNameSpace,
                bob.address,
            ]);

            // set new posts
            await post.connect(john).addNewPost(dotName, urls, nameSpace);

            expect(await post.getPostCount(dotName)).to.equal(
                urls.length + newURLs.length + urls.length
            );
            expect((await post.getPosts(dotName))[0]).to.deep.equal([
                0,
                urls[0],
                nameSpace,
                john.address,
            ]);
            expect((await post.getPosts(dotName))[1]).to.deep.equal([
                1,
                urls[1],
                nameSpace,
                john.address,
            ]);
            expect((await post.getPosts(dotName))[2]).to.deep.equal([
                2,
                urls[2],
                nameSpace,
                john.address,
            ]);
            expect((await post.getPosts(dotName))[3]).to.deep.equal([
                3,
                newURLs[0],
                newNameSpace,
                bob.address,
            ]);
            expect((await post.getPosts(dotName))[4]).to.deep.equal([
                4,
                newURLs[1],
                newNameSpace,
                bob.address,
            ]);
            expect((await post.getPosts(dotName))[5]).to.deep.equal([
                5,
                newURLs[2],
                newNameSpace,
                bob.address,
            ]);
            expect((await post.getPosts(dotName))[6]).to.deep.equal([
                6,
                urls[0],
                nameSpace,
                john.address,
            ]);
            expect((await post.getPosts(dotName))[7]).to.deep.equal([
                7,
                urls[1],
                nameSpace,
                john.address,
            ]);
            expect((await post.getPosts(dotName))[8]).to.deep.equal([
                8,
                urls[2],
                nameSpace,
                john.address,
            ]);
        });

        it("Should revert if the caller is not the name owner", async () => {
            await expect(post.connect(bob).addNewPost(dotName, urls, nameSpace)).to.be.revertedWith(
                "Post: only DC owner"
            );
        });

        it("Should revert if the domain is expired", async () => {
            // increase time
            const duration = await mockDC.duration();
            await increaseTime(Number(duration.add(1)));

            // set new posts
            const newURLs = ["newURL1", "newURL2", "newURL3"];
            const newNameSpace = "newNameSpace";

            await expect(
                post.connect(alice).addNewPost(dotName, newURLs, newNameSpace)
            ).to.be.revertedWith("Post: expired domain");
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
