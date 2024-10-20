// backend/models/Metadata.js
const mongoose = require('mongoose');

const MetadataSchema = new mongoose.Schema({
  uri: { type: String, required: true, unique: true },
  metadata: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Metadata', MetadataSchema);
