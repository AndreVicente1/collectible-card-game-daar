const { ethers } = require('ethers');
const Listing = require('../models/Listing');
const MarketplaceABI = require('../../../contracts/artifacts/src/Marketplace.sol/Marketplace.json'); 
require('dotenv').config();

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545'); 
const marketplaceContract = new ethers.Contract(process.env.ADDRESSE_MARKETPLACE, MarketplaceABI.abi, provider);

// Connexion à MongoDB
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connecté à MongoDB pour les listings Marketplace.');
}).catch(err => {
    console.error('Erreur de connexion à MongoDB:', err);
});

// Écouter les événements ItemListed
marketplaceContract.on('ItemListed', async (nftAddress, tokenId, seller, price) => {
    try {
        // Ajouter ou mettre à jour le listing dans la base de données
        await Listing.findOneAndUpdate(
            { nftAddress, tokenId },
            { price: price, seller },
            { upsert: true, new: true }
        );
        console.log(`Item Listed: ${nftAddress} TokenID: ${tokenId} Price: ${ethers.utils.formatEther(price)} ETH Seller: ${seller}`);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du listing après ItemListed:', error);
    }
});

// Écouter les événements ItemCancelled
marketplaceContract.on('ItemCancelled', async (nftAddress, tokenId, seller) => {
    try {
        // Supprimer le listing de la base de données
        await Listing.deleteOne({ nftAddress, tokenId });
        console.log(`Item Cancelled: ${nftAddress} TokenID: ${tokenId} Seller: ${seller}`);
    } catch (error) {
        console.error('Erreur lors de la suppression du listing après ItemCancelled:', error);
    }
});

// Écouter les événements ItemSold
marketplaceContract.on('ItemSold', async (nftAddress, tokenId, buyer, price) => {
    try {
        // Supprimer le listing de la base de données
        await Listing.deleteOne({ nftAddress, tokenId });
        console.log(`Item Sold: ${nftAddress} TokenID: ${tokenId} Buyer: ${buyer} Price: ${ethers.utils.formatEther(price)} ETH`);
    } catch (error) {
        console.error('Erreur lors de la suppression du listing après ItemSold:', error);
    }
});
