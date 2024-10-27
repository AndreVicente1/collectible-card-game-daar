/*
    * Script de migration des images des cartes Hearthstone vers Pinata
    * Les URLs de l'API Hearthstone sont directement téléchargées, il faut les migrer sur une base de données
    * Ce script télécharge les images des cartes depuis les URLs actuelles, les upload sur Pinata
    * Il doit être lancé tout seul si il y a des nouvelles images à migrer
*/

require('dotenv').config();
const mongoose = require('mongoose');
const HearthstoneCard = require('./models/HearthstoneCard');
const uploadImageToPinata= require('./pinata/upload');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("L'URI MongoDB n'est pas défini dans le fichier .env");
  process.exit(1)
}

// migration des images vers la db pinata
const migrateImages = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connecté à MongoDB');

    const cards = await HearthstoneCard.find();
    console.log(`Total de cartes récupérées: ${cards.length}`);

    for (const card of cards) {
      // Vérifier si l'image est déjà sur Pinata
      if (card.pinataHash) {
        console.log(`Carte "${card.name}" déjà migrée`);
        continue;
      }

      // Télécharger l'image depuis l'URL actuelle
      const imageUrl = card.image;
      if (!imageUrl) {
        console.log(`Carte "${card.name}" n'a pas d'URL d'image`);
        continue;
      }

      try {
        const response = await axios({
          method: 'GET',
          url: imageUrl,
          responseType: 'stream',
        });

        const tempFilePath = path.join(os.tmpdir(), path.basename(imageUrl));
        const writer = fs.createWriteStream(tempFilePath);

        response.data.pipe(writer);

        // Attendre la fin du téléchargement
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        console.log(`Image téléchargée pour la carte "${card.name}"`);

        // Upload l'image sur Pinata
        const pinataResult = await uploadImageToPinata(tempFilePath, card.name);
        console.log(`Image uploadée sur Pinata pour la carte "${card.name}": ${pinataResult.IpfsHash}`);

        // Mettre à jour la carte dans la base de données
        card.image = `https://gateway.pinata.cloud/ipfs/${pinataResult.IpfsHash}`;
        card.pinataHash = pinataResult.IpfsHash;
        await card.save();

        console.log(`Base de données mise à jour pour la carte "${card.name}"`);

        // Supprimer le fichier temporaire
        fs.unlinkSync(tempFilePath);
      } catch (error) {
        console.error(`Erreur lors de la migration de la carte "${card.name}":`, error.message);
      }
    }

    console.log('Migration done');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    process.exit(1);
  }
};

migrateImages();