// backend/upload.js
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration de stockage avec multer (stockage en mémoire)
const storage = multer.memoryStorage();

// Filtre pour accepter uniquement les fichiers image
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Erreur : les seuls fichiers autorisés sont les images !'));
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
  fileFilter,
});

module.exports = upload;
