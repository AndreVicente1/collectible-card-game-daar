const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
    nftAddress: { type: String, required: true },
    tokenId: { type: Number, required: true },
    price: { type: String, required: true }, // Stocker le prix en ETH sous forme de chaîne
    seller: { type: String, required: true },
});

module.exports = mongoose.model('Listing', listingSchema);
