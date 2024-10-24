// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Collection is ERC721URIStorage, Ownable {
    struct Card {
        uint256 cardNumber;
        string cardName;
        string metadataURI;
    }

    string public collectionName;
    uint256 public cardCount; // The total number of cards in the collection
    uint256 public nextTokenId;

    mapping(uint256 => Card) public cards; // Mapping tokenId to the card details

    // TODO: changer le nom
    constructor(string memory _name, uint256 _cardCount, Card[] memory _cards) 
      ERC721(_name, "NFTC") 
      Ownable(msg.sender)
    {
        collectionName = _name;
        cardCount = _cardCount;

        for (uint256 i =0; i < _cards.length; i++) {
            cards[i] = _cards[i];
        }
    }

    // Mint a new card (NFT) with a card number and image URI
    function mint(address _to, uint256 _cardNumber, string memory _cardName, string memory _metadataURI) external onlyOwner {
        require(nextTokenId < uint256(cardCount), "Card limit reached for this collection");

        uint256 tokenId = nextTokenId;
        nextTokenId++;

        // Mint the NFT to the specified address
        _safeMint(_to, tokenId);

        // Store card details in the mapping
        cards[tokenId] = Card({
            cardNumber: _cardNumber,
            cardName: _cardName,
            metadataURI: _metadataURI
        });

        _setTokenURI(tokenId, _metadataURI);
    }

    // Retrieve card details by tokenId
    function getCardDetails(uint256 tokenId) external view returns (uint256, string memory, string memory) {
        Card memory card = cards[tokenId];
        return (card.cardNumber, card.cardName, card.metadataURI);
    }
}