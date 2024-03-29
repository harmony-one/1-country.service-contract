const { expect } = require("chai");
const { ethers, upgrades, network } = require("hardhat");
const { BigNumber } = require("ethers");

const dotName = "test.country";
const tokenId = ethers.utils.id(dotName);
const postAddPrice = ethers.utils.parseEther("1");

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

    describe("setPostAddPrice", () => {
        it("Should be able set the post addition price", async () => {
            expect(await post.postAddPrice()).to.equal(0);

            await post.setPostAddPrice(postAddPrice.add(1));

            expect(await post.postAddPrice()).to.equal(postAddPrice.add(1));
        });

        it("Should revert if the caller is not owner", async () => {
            await expect(post.connect(alice).setPostAddPrice(postAddPrice)).to.be.reverted;
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

            // set new post
            await post.setPostAddPrice(postAddPrice);
            await post.connect(alice).addNewPost(dotName, urls, nameSpace, { value: postAddPrice });

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

        it("Should revert if the payment amount is not correct", async () => {
            // add a new post
            await post.setPostAddPrice(postAddPrice);
            await expect(
                post
                    .connect(alice)
                    .addNewPost(dotName, urls, nameSpace, { value: postAddPrice.sub(1) })
            ).to.be.revertedWith("Post: incorrect payment");
        });

        it("Should be able to set new posts after the domain ownership was changed but not expired", async () => {
            // set new posts
            await post.connect(alice).addNewPost(dotName, urls, nameSpace);

            // transfer the ownership
            await post.connect(alice).transferPostOwnership(dotName, bob.address, true, "");
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
            await post.connect(bob).transferPostOwnership(dotName, john.address, false, nameSpace);
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

        it("Should revert if the caller is not the name owner", async () => {
            await expect(
                post.connect(alice).addNewPost(dotName, [""], nameSpace)
            ).to.be.revertedWith("Post: empty url");
        });
    });

    describe("deletePost", () => {
        const urls = ["url1", "url2", "url3"];
        const nameSpace = "nameSpace";

        beforeEach(async () => {
            await mockDC.connect(alice).register(dotName);
            await post.connect(alice).addNewPost(dotName, urls, nameSpace);
        });

        it("Should be able to delete the posts", async () => {
            expect(await post.getPostCount(dotName)).to.equal(urls.length);

            // delete the posts
            await post.connect(alice).deletePost(dotName, [0, 2]);

            expect(await post.getPostCount(dotName)).to.equal(urls.length - 2);
            expect((await post.getPosts(dotName))[0]).to.deep.equal([
                1,
                urls[1],
                nameSpace,
                alice.address,
            ]);
        });

        it("Should be able to delete the posts after both the domain and post ownerships are changed but not expired", async () => {
            expect(await post.getPostCount(dotName)).to.equal(urls.length);

            // transfer the ownership
            await post.connect(alice).transferPostOwnership(dotName, bob.address, true, "");
            await mockDC.connect(bob).trasnferDomain(dotName);

            // delete the URL
            await post.connect(bob).deletePost(dotName, [1, 2]);

            expect(await post.getPostCount(dotName)).to.equal(urls.length - 2);
            expect((await post.getPosts(dotName))[0]).to.deep.equal([
                0,
                urls[0],
                nameSpace,
                bob.address,
            ]);
        });

        it("Should be able to delete the owner's posts", async () => {
            expect(await post.getPostCount(dotName)).to.equal(urls.length);

            // transfer the ownership
            await post.connect(alice).transferPostOwnership(dotName, bob.address, true, "");

            // set new posts
            const newURLs = ["newURL1", "newURL2", "newURL3"];
            const newNameSpace = "newNameSpace";

            await post.connect(alice).addNewPost(dotName, newURLs, newNameSpace);

            // delete the URL
            await post.connect(alice).deletePost(dotName, [3, 5]);

            expect(await post.getPostCount(dotName)).to.equal(urls.length + newURLs.length - 2);
            expect((await post.getPosts(dotName))[3]).to.deep.equal([
                4,
                newURLs[1],
                newNameSpace,
                alice.address,
            ]);
        });

        it("Should not be able to delete the posts after the domain ownership is changed but the post ownership is not changed", async () => {
            // transfer the ownership
            await post.connect(alice).transferPostOwnership(dotName, bob.address, true, "");

            // delete the URL
            await expect(post.connect(alice).deletePost(dotName, [1, 2])).to.be.revertedWith(
                "Post: only post owner"
            );
        });

        it("Should revert if the caller is not the name owner", async () => {
            await expect(post.deletePost(dotName, [1, 2])).to.be.revertedWith(
                "Post: only DC owner"
            );
        });
    });

    describe("updatePost", () => {
        const urls = ["url1", "url2", "url3"];
        const nameSpace = "nameSpace";

        beforeEach(async () => {
            await mockDC.connect(alice).register(dotName);
            await post.connect(alice).addNewPost(dotName, urls, nameSpace);
        });

        it("Should be able to update the existing post", async () => {
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

            // update the post
            const postId = 1;
            const newURL = "newURL";

            await post.connect(alice).updatePost(dotName, postId, newURL);

            expect(await post.getPostCount(dotName)).to.equal(urls.length);
            expect((await post.getPosts(dotName))[0]).to.deep.equal([
                0,
                urls[0],
                nameSpace,
                alice.address,
            ]);
            expect((await post.getPosts(dotName))[1]).to.deep.equal([
                1,
                newURL,
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

        it("Should be able to update after both the domain and the post ownerships are changed but not expired", async () => {
            expect(await post.getPostCount(dotName)).to.equal(urls.length);

            // transfer the ownership
            await post.connect(alice).transferPostOwnership(dotName, bob.address, true, "");
            await mockDC.connect(bob).trasnferDomain(dotName);

            // update the post
            const postId = 1;
            const newURL = "newURL";

            await post.connect(bob).updatePost(dotName, postId, newURL);

            expect(await post.getPostCount(dotName)).to.equal(urls.length);
            expect((await post.getPosts(dotName))[0]).to.deep.equal([
                0,
                urls[0],
                nameSpace,
                bob.address,
            ]);
            expect((await post.getPosts(dotName))[1]).to.deep.equal([
                1,
                newURL,
                nameSpace,
                bob.address,
            ]);
            expect((await post.getPosts(dotName))[2]).to.deep.equal([
                2,
                urls[2],
                nameSpace,
                bob.address,
            ]);
        });

        it("Should revert if the domain ownership is changed but the post ownership is not changed", async () => {
            // transfer the ownership
            await post.connect(alice).transferPostOwnership(dotName, bob.address, true, "");

            // update the post
            const postId = 1;
            const newURL = "newURL";

            await expect(
                post.connect(alice).updatePost(dotName, postId, newURL)
            ).to.be.revertedWith("Post: only post owner");
        });

        it("Should revert if the caller is not the name owner", async () => {
            // update the post
            const postId = 1;
            const newURL = "newURL";

            await expect(post.updatePost(dotName, postId, newURL)).to.be.revertedWith(
                "Post: only DC owner"
            );
        });

        it("Should revert if the domain is expired", async () => {
            // increase time
            const duration = await mockDC.duration();
            await increaseTime(Number(duration.add(1)));

            // update the post
            const postId = 1;
            const newURL = "newURL";

            await expect(
                post.connect(alice).updatePost(dotName, postId, newURL)
            ).to.be.revertedWith("Post: expired domain");
        });

        it("Should revert if the postId is invalid", async () => {
            // update the post
            const postId = 10;
            const newURL = "";

            await expect(
                post.connect(alice).updatePost(dotName, postId, newURL)
            ).to.be.revertedWith("Post: invalid post Id");
        });

        it("Should revert if the post does not exist", async () => {
            // delete the posts
            await post.connect(alice).deletePost(dotName, [1]);

            // update the post
            const postId = 1;
            const newURL = "newURL";

            await expect(
                post.connect(alice).updatePost(dotName, postId, newURL)
            ).to.be.revertedWith("Post: not exist");
        });

        it("Should revert if the url is empty", async () => {
            // update the post
            const postId = 1;
            const newURL = "";

            await expect(
                post.connect(alice).updatePost(dotName, postId, newURL)
            ).to.be.revertedWith("Post: empty url");
        });
    });

    describe("transferPostOwnership", () => {
        const urls = ["url1", "url2", "url3"];
        const nameSpace = "nameSpace";

        beforeEach(async () => {
            await mockDC.connect(alice).register(dotName);
            await post.connect(alice).addNewPost(dotName, urls, nameSpace);
        });

        it("Should be able to transfer the post owenrship", async () => {
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

            // delete the post
            await post.connect(alice).deletePost(dotName, [1]);

            // transfer the ownership
            await post.connect(alice).transferPostOwnership(dotName, bob.address, true, "");

            expect(await post.getPostCount(dotName)).to.equal(urls.length - 1);
            expect((await post.getPosts(dotName))[0]).to.deep.equal([
                0,
                urls[0],
                nameSpace,
                bob.address,
            ]);
            expect((await post.getPosts(dotName))[1]).to.deep.equal([
                2,
                urls[2],
                nameSpace,
                bob.address,
            ]);

            // transfer the ownership again - nothing happens
            await post.connect(alice).transferPostOwnership(dotName, bob.address, true, "");

            expect(await post.getPostCount(dotName)).to.equal(urls.length - 1);
            expect((await post.getPosts(dotName))[0]).to.deep.equal([
                0,
                urls[0],
                nameSpace,
                bob.address,
            ]);
            expect((await post.getPosts(dotName))[1]).to.deep.equal([
                2,
                urls[2],
                nameSpace,
                bob.address,
            ]);
        });

        it("Should revert if the domain is expired", async () => {
            // increase time
            const duration = await mockDC.duration();
            await increaseTime(Number(duration.add(1)));

            // transfer the ownership
            await expect(
                post.connect(alice).transferPostOwnership(dotName, bob.address, true, "")
            ).to.be.revertedWith("Post: expired domain");
        });

        it("Should revert if the caller is not the domain owner", async () => {
            // transfer the ownership
            await expect(post.transferPostOwnership(dotName, bob.address, true, "")).to.be.reverted;
        });
    });

    describe("pinPost", () => {
        const urls = ["url1", "url2", "url3"];
        const nameSpace = "nameSpace";

        beforeEach(async () => {
            await mockDC.connect(alice).register(dotName);
            await post.connect(alice).addNewPost(dotName, urls, nameSpace);
        });

        it("Should be able to pin the post", async () => {
            expect(await post.pinnedPostId(tokenId, alice.address, nameSpace)).to.equal(0);

            // pin the post
            const postId = 1;
            await post.connect(alice).pinPost(dotName, nameSpace, postId);

            expect(await post.pinnedPostId(tokenId, alice.address, nameSpace)).to.equal(postId);
        });

        it("Should revert if the post to pin was already deleted", async () => {
            // delete the posts
            await post.connect(alice).deletePost(dotName, [0, 1]);

            // pin the post
            const postId = 1;
            await expect(
                post.connect(alice).pinPost(dotName, nameSpace, postId)
            ).to.be.revertedWith("Post: not exist");
        });

        it("Should revert if the namespace is not matched", async () => {
            // pin the post
            const postId = 1;
            await expect(
                post.connect(alice).pinPost(dotName, "anotherNameSpace", postId)
            ).to.be.revertedWith("Post: mismatched namespace");
        });

        it("Should revert if the post owner is not matched", async () => {
            // pin the post
            let postId = 0;
            await post.connect(alice).pinPost(dotName, nameSpace, postId);

            expect(await post.pinnedPostId(tokenId, alice.address, nameSpace)).to.equal(
                ethers.constants.MaxUint256
            );
            expect(await post.pinnedPostId(tokenId, bob.address, nameSpace)).to.equal(0);

            // transfer the post ownership
            await post.connect(alice).transferPostOwnership(dotName, bob.address, true, "");

            expect(await post.pinnedPostId(tokenId, alice.address, nameSpace)).to.equal(0);
            expect(await post.pinnedPostId(tokenId, bob.address, nameSpace)).to.equal(0);

            await expect(
                post.connect(alice).pinPost(dotName, nameSpace, postId)
            ).to.be.revertedWith("Post: invalid post owner");

            // transfer the domain ownership
            await mockDC.connect(bob).trasnferDomain(dotName);

            // pin the post
            postId = 1;
            await post.connect(bob).pinPost(dotName, nameSpace, postId);

            expect(await post.pinnedPostId(tokenId, alice.address, nameSpace)).to.equal(0);
            expect(await post.pinnedPostId(tokenId, bob.address, nameSpace)).to.equal(postId);

            // transfer the ownership
            await post.connect(bob).transferPostOwnership(dotName, alice.address, false, nameSpace);

            expect(await post.pinnedPostId(tokenId, alice.address, nameSpace)).to.equal(0);
            expect(await post.pinnedPostId(tokenId, bob.address, nameSpace)).to.equal(0);

            await expect(post.connect(bob).pinPost(dotName, nameSpace, postId)).to.be.revertedWith(
                "Post: invalid post owner"
            );
        });

        it("Should revert if the pinned post already exists", async () => {
            // pin the post
            const postId = 1;
            await post.connect(alice).pinPost(dotName, nameSpace, postId);

            // pin the post again
            const newPostId = 0;
            await expect(
                post.connect(alice).pinPost(dotName, nameSpace, newPostId)
            ).to.be.revertedWith("Post: pinned post already exists");
        });

        it("Should revert if the domain is expired", async () => {
            // increase time
            const duration = await mockDC.duration();
            await increaseTime(Number(duration.add(1)));

            // pin the post
            const postId = 1;
            await expect(
                post.connect(alice).pinPost(dotName, nameSpace, postId)
            ).to.be.revertedWith("Post: expired domain");
        });

        it("Should revert if the caller is not the name owner", async () => {
            // pin the post
            const postId = 1;
            await expect(post.pinPost(dotName, nameSpace, postId)).to.be.revertedWith(
                "Post: only DC owner"
            );
        });
    });

    describe("unpinPost", () => {
        const urls = ["url1", "url2", "url3"];
        const nameSpace = "nameSpace";
        const postId = 1;

        beforeEach(async () => {
            await mockDC.connect(alice).register(dotName);
            await post.connect(alice).addNewPost(dotName, urls, nameSpace);

            await post.connect(alice).pinPost(dotName, nameSpace, postId);
        });

        it("Should be able to unpin the post", async () => {
            expect(await post.pinnedPostId(tokenId, alice.address, nameSpace)).to.equal(postId);

            // unpin the post
            await post.connect(alice).unpinPost(dotName, nameSpace);

            expect(await post.pinnedPostId(tokenId, alice.address, nameSpace)).to.equal(0);
        });

        it("Should revert if the pinned post does not exist", async () => {
            // unpin the post
            await post.connect(alice).unpinPost(dotName, nameSpace);

            // unpin the post again
            await expect(post.connect(alice).unpinPost(dotName, nameSpace)).to.be.revertedWith(
                "Post: pinned post not exist"
            );
        });

        it("Should revert if the domain is expired", async () => {
            // increase time
            const duration = await mockDC.duration();
            await increaseTime(Number(duration.add(1)));

            // unpin the post
            await expect(post.connect(alice).unpinPost(dotName, nameSpace)).to.be.revertedWith(
                "Post: expired domain"
            );
        });

        it("Should revert if the caller is not the name owner", async () => {
            // unpin the post
            await expect(post.unpinPost(dotName, nameSpace)).to.be.revertedWith(
                "Post: only DC owner"
            );
        });
    });

    describe("withdraw", () => {
        const urls = ["url1", "url2", "url3"];
        const nameSpace = "nameSpace";

        beforeEach(async () => {
            await mockDC.connect(alice).register(dotName);
            await post.setPostAddPrice(postAddPrice);
            await post.connect(alice).addNewPost(dotName, urls, nameSpace, { value: postAddPrice });
        });

        it("Should be able to withdraw tokens by the owner", async () => {
            const revenueAccountBalanceBefore = await ethers.provider.getBalance(
                revenueAccount.address
            );

            // withdraw ONE tokens
            await post.withdraw();

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
            await post.connect(revenueAccount).withdraw();

            const revenueAccountBalanceAfter = await ethers.provider.getBalance(
                revenueAccount.address
            );
            expect(revenueAccountBalanceAfter).gt(revenueAccountBalanceBefore);
        });

        it("Should revert if the caller is not the owner or revenue account", async () => {
            await expect(post.connect(alice).withdraw()).to.be.revertedWith(
                "Post: must be owner or revenue account"
            );
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
