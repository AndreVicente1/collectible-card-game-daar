const mongoose = require('mongoose');

const HearthstoneSetSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  slug: { type: String, required: true },
  hyped: { type: Boolean, default: false },
  type: { type: String, required: false },
  collectibleCount: { type: Number, default: 0 },
  collectibleRevealedCount: { type: Number, default: 0 },
  nonCollectibleCount: { type: Number, default: 0 },
  nonCollectibleRevealedCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('HearthstoneSet', HearthstoneSetSchema);