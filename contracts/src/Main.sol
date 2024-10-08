// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "./Collection.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Main is Ownable {
    struct CollectionInfo {
        string name;
        address collectionAddress;  // Address of the deployed Collection contract
        int cardCount;
    }

    CollectionInfo[] public collections;

    event CollectionCreated(string name, int cardCount, address collectionAddress);
    event CardMinted(uint256 collectionId, address to, uint256 cardNumber);

    constructor() Ownable(msg.sender) {}
    
    // Create a new collection with a name and card count
    function createCollection(string memory _name, int _cardCount) external onlyOwner {
        // Deploy a new Collection contract for this collection
        Collection newCollection = new Collection(_name, _cardCount);

        collections.push(CollectionInfo({
            name: _name,
            collectionAddress: address(newCollection),
            cardCount: _cardCount
        }));

        emit CollectionCreated(_name, _cardCount, address(newCollection));
    }

    // Mint a card in a specific collection for a user
    function mintCard(uint256 _collectionId, address _to, uint256 _cardNumber, string memory _imgURI) external onlyOwner {
        require(_collectionId < collections.length, "Collection does not exist");
        CollectionInfo storage collectionInfo = collections[_collectionId];

        // Mint a card from the selected collection
        Collection(collectionInfo.collectionAddress).mint(_to, _cardNumber, _imgURI);

        emit CardMinted(_collectionId, _to, _cardNumber);
    }

    // Get the number of collections created
    function getCollectionCount() external view returns (uint256) {
        return collections.length;
    }

    // Get collection details by ID
    function getCollection(uint256 _collectionId) external view returns (string memory, int, address) {
        require(_collectionId < collections.length, "Collection does not exist");
        CollectionInfo storage collectionInfo = collections[_collectionId];
        return (collectionInfo.name, collectionInfo.cardCount, collectionInfo.collectionAddress);
    }
}