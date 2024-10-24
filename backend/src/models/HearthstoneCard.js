const mongoose = require('mongoose');

const HearthstoneCardSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  set: { type: String, required: true },
  rarity: { type: String, required: true },
  description: { type: String },
  image: { type: String },
  pinataHash: String,
  attributes: [
    {
      trait_type: { type: String },
      value: { type: String },
    },
  ],
});

module.exports = mongoose.model('HearthstoneCard', HearthstoneCardSchema);