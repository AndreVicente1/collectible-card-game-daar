// backend/routes/images.js
const express = require('express');
const router = express.Router();
const upload = require('../upload'); // Multer middleware
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const PinataSDK = require('@pinata/sdk').default || require('@pinata/sdk');
const Image = require('../models/Image');
const Metadata = require('../models/Metadata');

// Initialiser Pinata
const pinata = new PinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_API_KEY);

// Route POST /images : Upload d'une image et de ses métadonnées
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { metadata } = req.body; // Les métadonnées doivent être envoyées en tant que chaîne JSON
    if (!req.file) {
      return res.status(400).json({ message: 'Image manquante' });
    }

    // Parse les métadonnées
    let parsedMetadata;
    try {
      parsedMetadata = JSON.parse(metadata);
    } catch (err) {
      return res.status(400).json({ message: 'Les métadonnées doivent être un JSON valide' });
    }

    // Générer un identifiant unique pour l'image (optionnel)
    const imageName = `${uuidv4()}_${req.file.originalname}`;

    // Uploader l'image sur Pinata (IPFS)
    const imageStream = Buffer.from(req.file.buffer);
    const imageOptions = {
      pinataMetadata: {
        name: imageName,
      },
      pinataOptions: {
        cidVersion: 0,
      },
    };

    const imageResult = await pinata.pinFileToIPFS(imageStream, imageOptions);

    const imageURI = `ipfs://${imageResult.IpfsHash}`;

    // Stocker les informations de l'image dans la collection "images"
    const imageDoc = new Image({
      uri: imageURI,
      pinataHash: imageResult.IpfsHash,
    });

    await imageDoc.save();

    // Créer les métadonnées avec l'URI de l'image
    const completeMetadata = {
      ...parsedMetadata,
      image: imageURI,
    };

    // Uploader les métadonnées sur Pinata (IPFS)
    const metadataBuffer = Buffer.from(JSON.stringify(completeMetadata));
    const metadataOptions = {
      pinataMetadata: {
        name: `${uuidv4()}_metadata.json`,
      },
      pinataOptions: {
        cidVersion: 0,
      },
    };

    const metadataResult = await pinata.pinFileToIPFS(metadataBuffer, metadataOptions);

    const metadataURI = `ipfs://${metadataResult.IpfsHash}`;

    // Stocker les métadonnées dans la collection "metadata"
    const metadataDoc = new Metadata({
      uri: metadataURI,
      metadata: completeMetadata,
    });

    await metadataDoc.save();

    res.status(201).json({
      message: 'Image et métadonnées uploadées avec succès',
      imageURI,
      metadataURI,
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload de l\'image et des métadonnées:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// Route GET /images/:uri : Récupérer une image à partir d'une URI
router.get('/:uri', async (req, res) => {
  try {
    const { uri } = req.params;
    const imageDoc = await Image.findOne({ uri: `ipfs://${uri}` });

    if (!imageDoc) {
      return res.status(404).json({ message: 'Image non trouvée' });
    }

    // Rediriger vers l'URL IPFS via une passerelle publique
    const ipfsGatewayURL = `https://gateway.pinata.cloud/ipfs/${imageDoc.pinataHash}`;
    res.redirect(ipfsGatewayURL);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'image:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// Route GET /metadata/:uri : Récupérer les métadonnées associées à une URI
router.get('/metadata/:uri', async (req, res) => {
  try {
    const { uri } = req.params;
    const metadataDoc = await Metadata.findOne({ uri: `ipfs://${uri}` });

    if (!metadataDoc) {
      return res.status(404).json({ message: 'Métadonnées non trouvées' });
    }

    res.json(metadataDoc.metadata);
  } catch (error) {
    console.error('Erreur lors de la récupération des métadonnées:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

module.exports = router;
