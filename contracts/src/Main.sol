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
    //uint256 public boosterPrice = 0.05 ether;

    //event CollectionCreated(string name, uint256 cardCount, address collectionAddress);
    //event CardMinted(address collectionAddress, address to, string cardName);
    event BoosterOpened(uint256 boosterId, address owner, uint256[] cardNumbers, string[] cardNames, string[] metadataURIS);
    event BoosterMinted(uint256 boosterId, string name, uint256 collectionId, address owner);

    constructor(address _owner) Ownable(_owner) {
        require(_owner != address(0), "Owner address cannot be zero");
    }

    //function fallback() external {}
    
    // Create a new collection with a name and card count
    function createCollection(string memory _name, uint256 _cardCount, Collection.Card[] memory _cards) external onlyOwner {
        // Deploy a new Collection contract for this collection
        require(_cardCount >= 0, "Card count must be greater or zero");
        //console.log("Creating collection with name:", _name);
        Collection newCollection = new Collection(_name, _cardCount, _cards);
        //console.log("Collection created, address:", address(newCollection));
        
        collections[collectionCount] = newCollection;
        collectionCount++;

        //emit CollectionCreated(_name, _cardCount, address(newCollection));
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

        // Mint une carte depuis la collection sélectionnée
        Collection(_collectionAddress).mint(_to, _cardNumber, _cardName, _metadataURI);

        //emit CardMinted(_collectionAddress, _to, _cardName);
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

        // Loop through collections and populate arrays
        for (uint256 i = 0; i < totalCollections; i++) {
            Collection collection = collections[i];
            names[i] = collection.collectionName();
            addresses[i] = address(collection);
            cardCounts[i] = collection.cardCount();
        }

        return (names, addresses, cardCounts);
    }
    

    // Boosters

    function createBooster(string memory _name, uint256 _collectionId, uint256 _boosterId) external payable {
        require(msg.value >= 0.05 ether, "Insufficient payment");
        Booster newBooster = new Booster(_name, _collectionId, _boosterId, msg.sender, address(this));
        boosters[_boosterId] = newBooster;
        boosterCount++;
        console.log("Checking if msg.sender has correct permissions", msg.sender);
        console.log("Collection ID:", _collectionId, "Payment:", msg.value);
        emit BoosterMinted(_boosterId, _name, _collectionId, msg.sender);
    }

    function _createRandomNum(uint256 _mod) internal view returns (uint256) {
        uint256 randomNum = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
        return randomNum % _mod;
    }

    function openBooster(uint256 _boosterId) external {
        console.log("Opening booster ", _boosterId);
        Booster booster = boosters[_boosterId];
        require(msg.sender == booster.owner(), "Only the owner can open this booster");
        Collection collection = collections[booster.collectionId()];
        console.log('booster opening');
        booster.openBooster();
        console.log("Booster opened by ", msg.sender);
        // 5 cartes dans 1 booster
        uint256 cardCount = collection.cardCount();
        require(cardCount >= 5, "Not enough cards in collection");

        uint256 availableCount = cardCount;
        uint256[] memory randomIndices = new uint256[](5);
 
        // 5 indices aléatoires
        for (uint256 i = 0; i < 5; i++) {
            console.log("Opening card ", i);
            uint256 randomIndex = _createRandomNum(cardCount - i); 
            randomIndices[i] = randomIndex;
            availableCount--;
        }

        console.log('minting cards booster');
        uint256[] memory cardNumbers = new uint256[](5);
        string[] memory cardNames = new string[](5);
        string[] memory metadataURIs = new string[](5);

        // Mint les cartes tirées aléatoirement
        for (uint256 i = 0; i < randomIndices.length; i++) {
            //(uint256 cardNumber, string memory cardName, string memory metadataURI) = collection.getCardDetails(randomIndices[i]);
            uint256 tokenId = randomIndices[i];
            (cardNumbers[i], cardNames[i], metadataURIs[i]) = collection.getCardDetails(tokenId);
            console.log("Card Number:", cardNumbers[i]);
            console.log("Card Name:", cardNames[i]);
            console.log("Metadata URI:", metadataURIs[i]);
            //cardNumbers[i] = cardNumber;
        
            //console.log('cardName', cardName);
            // Store each string in memory correctly
            //cardNames[i] = cardName;
            //console.log('metadataURI', metadataURI);
            //metadataURIs[i] = metadataURI;
            collection.mint(msg.sender, cardNumbers[i], cardNames[i], metadataURIs[i]);
            console.log("APRES:Card Number:", cardNumbers[i]);
            console.log("Card Name:", cardNames[i]);
            console.log("Metadata URI:", metadataURIs[i]);
        }
        console.log('open done!!');

        emit BoosterOpened(_boosterId, msg.sender, cardNumbers, cardNames, metadataURIs);
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