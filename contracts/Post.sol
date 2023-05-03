// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import "./interfaces/IDC.sol";

contract Post is OwnableUpgradeable, PausableUpgradeable {
    struct PostInfo {
        uint256 postId; // starts from 0
        string url;
        string nameSpace;
        address owner;
    }

    /// @dev DC contract
    address public dc;

    /// @dev DC TokenId -> PostInfo list
    mapping(bytes32 => PostInfo[]) public posts;

    /// @dev DC TokenId -> PostId -> Bool
    mapping(bytes32 => mapping(uint256 => bool)) public isPostDeleted;

    /// @dev Fee withdrawal address
    address public revenueAccount;

    /// @dev DC TokenId -> NameSpace -> PostId pinned
    mapping(bytes32 => mapping(string => uint256)) public pinnedPostId;

    event NewPostAdded(address indexed by, string indexed name, PostInfo post);
    event PostDeleted(address indexed by, string indexed name, PostInfo post);
    event PostUpdated(
        address by,
        string indexed name,
        uint256 indexed postId,
        string oldURL,
        string newURL,
        string indexed nameSpace,
        address owner
    );
    event RevenueAccountChanged(address indexed from, address indexed to);

    modifier onlyDCOwner(string memory _name) {
        address dcOwner = IDC(dc).ownerOf(_name);
        require(msg.sender == dcOwner, "Post: only DC owner");
        _;
    }

    modifier whenDomainNotExpired(string memory _name) {
        uint256 domainExpireAt = IDC(dc).nameExpires(_name);
        require(block.timestamp < domainExpireAt, "Post: expired domain");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _dc, address _revenueAccount) external initializer {
        __Pausable_init();
        __Ownable_init();

        require(_dc != address(0), "Post: zero address");

        dc = _dc;
        revenueAccount = _revenueAccount;
    }

    /// @notice Set the DC contract address
    /// @param _dc DC contract address
    function setDCAddress(address _dc) external onlyOwner {
        dc = _dc;
    }

    /// @notice Set the revenue account
    /// @param _revenueAccount revenue account address
    function setRevenueAccount(address _revenueAccount) public onlyOwner {
        emit RevenueAccountChanged(revenueAccount, _revenueAccount);

        revenueAccount = _revenueAccount;
    }

    /// @notice Add a new posts
    /// @dev All posts have the same name space
    /// @param _name domain name
    /// @param _urls URL list of the post
    /// @param _nameSpace name space of the post
    function addNewPost(
        string calldata _name,
        string[] calldata _urls,
        string calldata _nameSpace
    ) external payable whenNotPaused onlyDCOwner(_name) whenDomainNotExpired(_name) {
        bytes32 tokenId = keccak256(bytes(_name));

        require(bytes(_nameSpace).length <= 1024, "Post: alias too long");

        uint256 nextPostId = posts[tokenId].length + 1;
        for (uint256 i = 0; i < _urls.length; ) {
            string memory url = _urls[i];

            require(bytes(url).length <= 1024, "Post: url too long");
            require(bytes(url).length != 0, "Post: empty url");

            // set a new post
            address domainOwner = msg.sender;
            PostInfo memory postInfo = PostInfo({
                postId: nextPostId,
                url: url,
                nameSpace: _nameSpace,
                owner: domainOwner
            });
            posts[tokenId].push(postInfo);

            // incrase the next post Id
            ++nextPostId;

            emit NewPostAdded(msg.sender, _name, postInfo);

            unchecked {
                ++i;
            }
        }
    }

    /// @notice Delete the existing posts
    /// @dev Deleting the posts is available regardless the domain expiration
    /// @param _name domain name
    /// @param _postIds postId list to delete
    function deletePost(string calldata _name, uint256[] calldata _postIds) external whenNotPaused onlyDCOwner(_name) {
        bytes32 tokenId = keccak256(bytes(_name));
        address domainOwner = msg.sender;

        for (uint256 i = 0; i < _postIds.length; ) {
            uint256 postId = _postIds[i];
            PostInfo memory post = posts[tokenId][postId];

            require(post.owner == domainOwner, "Post: only post owner");

            isPostDeleted[tokenId][postId] = true;

            emit PostDeleted(msg.sender, _name, post);

            unchecked {
                ++i;
            }
        }
    }

    /// @notice Update the existing post
    /// @dev Updating the posts is not available after the domain is expired
    /// @param _name domain name
    /// @param _postId postId of the post
    /// @param _newURL new URL address of the post
    function updatePost(
        string calldata _name,
        uint256 _postId,
        string calldata _newURL
    ) external whenNotPaused onlyDCOwner(_name) whenDomainNotExpired(_name) {
        bytes32 tokenId = keccak256(bytes(_name));

        require(_postId < posts[tokenId].length, "Post: invalid post Id");

        PostInfo memory postInfo = posts[tokenId][_postId];
        address domainOwner = msg.sender;

        require(bytes(_newURL).length <= 1024, "Post: url too long");
        require(bytes(_newURL).length != 0, "Post: empty url");
        require(postInfo.owner == domainOwner, "Post: only post owner");
        require(!isPostDeleted[tokenId][_postId], "Post: not exist");

        emit PostUpdated(msg.sender, _name, _postId, postInfo.url, _newURL, postInfo.nameSpace, domainOwner);

        // update the post
        posts[tokenId][_postId].url = _newURL;
    }

    /// @notice Transfer the post to another address
    /// @param _name domain name to transfer posts
    /// @param _receiver address to receive the posts
    /// @param _isAllNameSpace indicate whether posts in all name spaces should be transferred or not
    /// @param _nameSpace name space of the posts to trasnfer, available only if _isAllNameSpace = false
    function trasnferPostOwnership(
        string calldata _name,
        address _receiver,
        bool _isAllNameSpace,
        string calldata _nameSpace
    ) external whenNotPaused onlyDCOwner(_name) whenDomainNotExpired(_name) {
        bytes32 tokenId = keccak256(bytes(_name));
        address sender = msg.sender;

        for (uint256 i = 0; i < posts[tokenId].length; ) {
            if (!isPostDeleted[tokenId][i]) {
                // transfer the post ownership
                PostInfo memory postInfo = posts[tokenId][i];

                if (postInfo.owner == sender) {
                    if (
                        _isAllNameSpace ||
                        keccak256(abi.encodePacked(postInfo.nameSpace)) == keccak256(abi.encodePacked(_nameSpace))
                    ) {
                        posts[tokenId][i].owner = _receiver;
                    }
                }
            }

            unchecked {
                ++i;
            }
        }
    }

    /// @notice Pin the post
    /// @dev if the postId to pin is 0, store max value of uint256 instead of 0
    /// @param _name domain name
    /// @param _nameSpace namespace
    /// @param _postId id of the post to pin
    function pinPost(string calldata _name, string calldata _nameSpace, uint256 _postId) external whenNotPaused onlyDCOwner(_name) whenDomainNotExpired(_name) {
        bytes32 tokenId = keccak256(bytes(_name));

        require(bytes(_nameSpace).length == 0, "Post: only root page is allowed");
        require(pinnedPostId[tokenId][_nameSpace] == 0, "Post: pinned post already exists");

        if (_postId == 0) {
            pinnedPostId[tokenId][_nameSpace] = type(uint256).max;
        } else {
            pinnedPostId[tokenId][_nameSpace] = _postId;
        }
    }

    /// @notice Unpin the post 
    /// @param _name domain name
    /// @param _nameSpace namespace
    function unpinPost(string calldata _name, string calldata _nameSpace) external whenNotPaused onlyDCOwner(_name) whenDomainNotExpired(_name) {
        bytes32 tokenId = keccak256(bytes(_name));

        require(pinnedPostId[tokenId][_nameSpace] != 0, "Post: pinned post not exist");
        
        delete pinnedPostId[tokenId][_nameSpace];
    }

    /// @notice Returns all the valid posts registered in the specific domain
    /// @param _name domain name
    function getPosts(string calldata _name) external view returns (PostInfo[] memory) {
        bytes32 tokenId = keccak256(bytes(_name));
        uint256 postCount = getPostCount(_name);

        PostInfo[] memory postList = new PostInfo[](postCount);
        uint256 postIndex = 0;
        for (uint256 i = 0; i < posts[tokenId].length; ) {
            if (!isPostDeleted[tokenId][i]) {
                postList[postIndex++] = posts[tokenId][i];
            }

            unchecked {
                ++i;
            }
        }

        return postList;
    }

    /// @notice Returns the number of valid posts registered in the specific domain
    /// @param _name domain name
    function getPostCount(string calldata _name) public view returns (uint256 postCount) {
        bytes32 tokenId = keccak256(bytes(_name));

        for (uint256 i = 0; i < posts[tokenId].length; ) {
            if (!isPostDeleted[tokenId][i]) {
                ++postCount;
            }

            unchecked {
                ++i;
            }
        }
    }

    /// @notice Withdraw funds
    /// @dev Only owner of the revenue account can withdraw funds
    function withdraw() external {
        require(msg.sender == owner() || msg.sender == revenueAccount, "Post: must be owner or revenue account");
        (bool success, ) = revenueAccount.call{value: address(this).balance}("");
        require(success, "Post: failed to withdraw");
    }

    /// @notice Pause the contract
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause the contract
    function unpause() external onlyOwner {
        _unpause();
    }
}
