// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "./Collection.sol";
import "./Booster.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract Main is Ownable {

    mapping(uint256 => Collection) public collections;
    mapping(uint256 => Booster) public boosters;
    uint256 public collectionCount;

    //boosters
    uint256 public boosterCount;

    event BoosterOpened(uint256 boosterId, address owner, uint256[] cardNumbers, string[] cardNames, string[] metadataURIS);
    event BoosterMinted(uint256 boosterId, string name, uint256 collectionId, address owner);

    constructor(address _owner) Ownable(_owner) {
        require(_owner != address(0), "Owner address cannot be zero");
    }

    
    // Create a new collection with a name and card count
    function createCollection(string memory _name, uint256 _cardCount, Collection.Card[] memory _cards) external onlyOwner {
        require(_cardCount >= 0, "Card count must be greater or zero");
        Collection newCollection = new Collection(_name, _cardCount, _cards);
        
        collections[collectionCount] = newCollection;
        collectionCount++;

    }

    function collectionExists(string memory _name) public view returns (bool) {
        for (uint256 i = 0; i < collectionCount; i++) {
            if (keccak256(abi.encodePacked(collections[i].collectionName())) == keccak256(abi.encodePacked(_name))) {
                return true;
            }
        }
        return false;
    }

    // Mint a card in a specific collection for a user
    function mintCard(address _collectionAddress, address _to, uint256 _cardNumber, string memory _cardName, string memory _metadataURI) external onlyOwner {
        require(_collectionAddress != address(0), "Invalid collection address");

        Collection(_collectionAddress).mint(_to, _cardNumber, _cardName, _metadataURI);

    }

    // Get the number of collections created
    function getCollectionCount() external view returns (uint256) {
        return collectionCount;
    }

    // get collection with id
    function getCollectionInfo(uint256 _collectionId) external view returns (string memory, address, uint256) {
        require(_collectionId < collectionCount, "Collection does not exist");
        Collection collection = collections[_collectionId];
        
        string memory name = collection.collectionName();
        address collectionAddress = address(collection);
        uint256 cardCount = collection.cardCount();
    
        return (name, collectionAddress, cardCount);
    }

    // all collections
    function getCollections() external view returns (string[] memory, address[] memory, uint256[] memory) {
        uint256 totalCollections = collectionCount;

        string[] memory names = new string[](totalCollections);
        address[] memory addresses = new address[](totalCollections);
        uint256[] memory cardCounts = new uint256[](totalCollections);

        for (uint256 i = 0; i < totalCollections; i++) {
            Collection collection = collections[i];
            names[i] = collection.collectionName();
            addresses[i] = address(collection);
            cardCounts[i] = collection.cardCount();
        }

        return (names, addresses, cardCounts);
    }
    
    // Obtenir le nombre total de tokens dans une collection
    function getTokensInCollection(uint256 collectionId) external view returns (uint256) {
        Collection collection = collections[collectionId];
        return collection.nextTokenId();
    }

    // Obtenir les informations d’un token spécifique dans une collection
    function getTokenInfo(uint256 collectionId, uint256 tokenId) external view returns (address owner, string memory tokenURI) {
        Collection collection = collections[collectionId];
        return (collection.ownerOf(tokenId), collection.tokenURI(tokenId));
    }

    // Nombre de cartes de la collection
    function getCardCount(uint256 collectionId) external view returns (uint256) {
        Collection collection = collections[collectionId];
        return collection.cardCount();
    }


    // Boosters

    function createBooster(string memory _name, uint256 _collectionId, uint256 _boosterId) external payable {
        require(msg.value >= 0.05 ether, "Insufficient payment");
        Booster newBooster = new Booster(_name, _collectionId, _boosterId, msg.sender, address(this));
        boosters[_boosterId] = newBooster;
        boosterCount++;
        
        emit BoosterMinted(_boosterId, _name, _collectionId, msg.sender);
    }

    function openBooster(uint256 _boosterId, address userAdd, uint256[] memory randomIndices) external {
        console.log("Opening booster ", _boosterId);
        Booster booster = boosters[_boosterId];

        Collection collection = collections[booster.collectionId()];
        booster.openBooster();
        // 5 cartes dans 1 booster
        uint256 cardCount = collection.cardCount();
        require(cardCount >= 5, "Not enough cards in collection");

        console.log('minting cards booster');
        uint256[] memory cardNumbers = new uint256[](5);
        string[] memory cardNames = new string[](5);
        string[] memory metadataURIs = new string[](5);

        // Mint les cartes tirées aléatoirement
        for (uint256 i = 0; i < randomIndices.length; i++) {
            uint256 tokenId = randomIndices[i];
            (cardNumbers[i], cardNames[i], metadataURIs[i]) = collection.getCardDetails(tokenId);
            console.log("Card Number:", cardNumbers[i]);
            console.log("Card Name:", cardNames[i]);
            console.log("Metadata URI:", metadataURIs[i]);
            collection.mint(userAdd, cardNumbers[i], cardNames[i], metadataURIs[i]);

        }
        console.log('open done!!');

        emit BoosterOpened(_boosterId, userAdd, cardNumbers, cardNames, metadataURIs);
    }

    // Function to get the collection ID by name
    function getCollectionIdByName(string memory _name) public view returns (uint256) {
        for (uint256 i = 0; i < collectionCount; i++) {
            if (keccak256(abi.encodePacked(collections[i].collectionName())) == keccak256(abi.encodePacked(_name))) {
                return i;
            }
        }
        revert("Collection not found");
    }

}