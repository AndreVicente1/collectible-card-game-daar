// backend/models/Image.js
const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  uri: { type: String, required: true, unique: true },
  pinataHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Image', ImageSchema);
