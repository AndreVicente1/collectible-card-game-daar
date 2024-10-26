// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Marketplace is ReentrancyGuard, Ownable {
    struct Listing {
        uint256 price;
        address seller;
    }

    // Mapping : NFT contract address => tokenId => Listing
    mapping(address => mapping(uint256 => Listing)) public listings;

    event ItemListed(address indexed nftAddress, uint256 indexed tokenId, address indexed seller, uint256 price);
    event ItemCancelled(address indexed nftAddress, uint256 indexed tokenId, address indexed seller);
    event ItemSold(address indexed nftAddress, uint256 indexed tokenId, address indexed buyer, uint256 price);

    constructor(address _owner) Ownable(_owner) {}
    // Lister un NFT pour la vente
    function listItem(address nftAddress, uint256 tokenId, uint256 price) external nonReentrant {
        require(price > 0, "Price must be greater than zero");
        IERC721 nft = IERC721(nftAddress);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(nft.getApproved(tokenId) == address(this) || nft.isApprovedForAll(msg.sender, address(this)), "Marketplace not approved");

        listings[nftAddress][tokenId] = Listing(price, msg.sender);
        emit ItemListed(nftAddress, tokenId, msg.sender, price);
    }

    // Annuler une liste
    function cancelListing(address nftAddress, uint256 tokenId) external nonReentrant {
        Listing memory listedItem = listings[nftAddress][tokenId];
        require(listedItem.seller == msg.sender, "Not the seller");

        delete listings[nftAddress][tokenId];
        emit ItemCancelled(nftAddress, tokenId, msg.sender);
    }

    // Acheter un NFT listé
    function buyItem(address nftAddress, uint256 tokenId) external payable nonReentrant {
        Listing memory listedItem = listings[nftAddress][tokenId];
        require(listedItem.price > 0, "Item not listed for sale");
        require(msg.value >= listedItem.price, "Insufficient payment");

        // Supprimer la liste avant le transfert pour éviter les reentrancies
        delete listings[nftAddress][tokenId];

        // Transférer le NFT
        IERC721(nftAddress).transferFrom(listedItem.seller, msg.sender, tokenId);

        // Transférer les fonds au vendeur
        payable(listedItem.seller).transfer(msg.value);

        emit ItemSold(nftAddress, tokenId, msg.sender, listedItem.price);
    }

    // Récupérer les informations d'une liste
    function getListing(address nftAddress, uint256 tokenId) external view returns (Listing memory) {
        return listings[nftAddress][tokenId];
    }
}
