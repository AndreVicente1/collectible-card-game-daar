// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Collection is ERC721URIStorage, Ownable {
    struct Card {
        uint256 cardNumber;
        string metadataURI;
    }

    string public collectionName;
    uint256 public cardCount; // The total number of cards in the collection
    uint256 public nextTokenId;

    mapping(uint256 => Card) public cards; // Mapping tokenId to the card details

    // TODO: changer le nom
    constructor(string memory _name, uint256 _cardCount) 
      ERC721(_name, "NFTC") 
      Ownable(msg.sender)
    {
        collectionName = _name;
        cardCount = _cardCount;
    }

    // Mint a new card (NFT) with a card number and image URI
    function mint(address _to, uint256 _cardNumber, string memory _metadataURI) external onlyOwner {
        require(nextTokenId < uint256(cardCount), "Card limit reached for this collection");

        uint256 tokenId = nextTokenId;
        nextTokenId++;

        // Mint the NFT to the specified address
        _safeMint(_to, tokenId);

        // Store card details in the mapping
        cards[tokenId] = Card({
            cardNumber: _cardNumber,
            metadataURI: _metadataURI
        });

        _setTokenURI(tokenId, _metadataURI);
    }

    // Helper function to convert uint256 to string
    function uint2str(uint256 _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }

    // Retrieve card details by tokenId
    function getCardDetails(uint256 tokenId) external view returns (uint256, string memory) {
        Card memory card = cards[tokenId];
        return (card.cardNumber, card.metadataURI);
    }
}