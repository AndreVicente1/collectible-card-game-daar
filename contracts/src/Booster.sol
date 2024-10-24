pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Collection.sol";

contract Booster is ERC721URIStorage, Ownable {

    struct BoosterInfo {
        Collection.Card[5] cards;
        bool redeemed;
    }

    uint256 public nextBoosterId;

    mapping(uint256 => BoosterInfo) public boosters;

    event BoosterCreated(uint256 boosterId, address to);
    event BoosterRedeemed(uint256 boosterId, address to);

    constructor() ERC721("Booster", "BST") Ownable(msg.sender){
    }

    // TODO: fix Fonction pour créer un booster. Seul le propriétaire peut créer.
    /*function createBooster(address _to, Collection.Card[5] _cards, string memory _tokenURI) external onlyOwner {
        uint256 boosterId = nextBoosterId;
        nextBoosterId++;

        boosters[boosterId] = BoosterInfo({
            cards: _cards,
            redeemed: false
        });

        _safeMint(_to, boosterId);
        _setTokenURI(boosterId, _tokenURI);

        emit BoosterCreated(boosterId, _to);
    }*/

    // Fonction pour rédemption le booster
    //TODO: payer un prix
    function redeemBooster(uint256 _boosterId) external {
        require(ownerOf(_boosterId) == msg.sender, "Vous ne possedez pas ce booster");
        BoosterInfo memory booster = boosters[_boosterId];
        require(!booster.redeemed, "Booster deja pris");

        booster.redeemed = true;

        emit BoosterRedeemed(_boosterId, msg.sender);
    }

    function openBooster(uint256 _boosterId, Collection collection) external {
        require(ownerOf(_boosterId) == msg.sender, "Vous ne possedez pas ce booster");
        BoosterInfo memory booster = boosters[_boosterId];

        // Mint chaque carte à l'utilisateur via le contrat Main
        for (uint8 i = 0; i < 5; i++) {
            Collection.Card memory card = booster.cards[i];
            collection.mint(msg.sender, card.cardNumber, card.cardName, card.metadataURI);
        }

        _burn(_boosterId);
    }
}