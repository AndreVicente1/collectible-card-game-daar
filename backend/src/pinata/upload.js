const pinataSDK = require('@pinata/sdk');
const fs = require('fs');
const path = require('path');

const pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_API_KEY);

// Fonction pour uploader un fichier image à Pinata
const uploadImageToPinata = async (filePath, cardName) => {
  try {
    const fileName = cardName + path.extname(filePath); // ex: dragon.png
    const readableStreamForFile = fs.createReadStream(filePath);

    const options = {
      pinataMetadata: {
        name: fileName,
      },
      pinataOptions: {
        cidVersion: 0,
      },
    };

    const result = await pinata.pinFileToIPFS(readableStreamForFile, options);
    return result;
  } catch (error) {
    console.error('Erreur lors de upload à Pinata:', error);
    throw error;
  }
};

module.exports = uploadImageToPinata;