const express = require('express');
const HearthstoneSet = require('../models/HearthstoneSet');
const HearthstoneCard = require('../models/HearthstoneCard');
const { ethers } = require('ethers');
const axios = require('axios');

const router = express.Router();

const contract = require('../../../contracts/artifacts/src/Main.sol/Main.json');

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
const wallet = new ethers.Wallet(process.env.ADDRESSE_ADMIN, provider);

const mainContract = new ethers.Contract(process.env.ADDRESSE_CONTRAT, contract.abi, wallet);


// get all sets
router.get('/sets', async (req, res) => {
  try {
    const { name, type } = req.query; // Récupérer les paramètres de requête

    console.log('try get sets');

    // Construire le filtre
    let filter = {};
    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }
    if (type) {
      filter.type = type;
    }

    console.log('filter try');

    // Récupérer les sets avec filtres appliqués
    const sets = await HearthstoneSet.find(filter)
      .select('-__v')
      .sort({ id: 1 });

    //console.log('sets fetched nice: ', sets);
    res.status(200).json({ sets });
  } catch (error) { 
    console.error('Error fetching sets:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// get all cards
router.get('/cards', async (req, res) => {
  try {
    // Récupérer toutes les cartes avec la référence au set
    const cards = await HearthstoneCard.find()
      .populate('set', 'name slug')
      .select('-__v')
      .sort({ id: 1 });

    console.log('cards fetched nice');
    res.status(200).json({ cards });
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// get cards from a set by the set slug
router.get('/sets/slug/:slug/cards', async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 30 } = req.query;

    console.log('Fetching set cards with slug:', slug);

    // Trouver le set par slug
    const set = await HearthstoneSet.findOne({ slug: slug });
    if (!set) {
      return res.status(404).json({ message: 'Set non trouvé.' });
    }

    console.log('fetching set cards with set name:', set.name);
    // Trouver les cartes appartenant à ce set
    const cards = await HearthstoneCard.find({ set: set.name })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalCards = await HearthstoneCard.countDocuments({ set: set.name });
    const totalPages = Math.ceil(totalCards / limit);

    res.status(200).json({
      set,
      cards,
      totalPages,
      currentPage: Number(page),
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des détails du set:', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

// get cards by name
router.get('/cards/name/:name', async (req, res) => {
  try {
    const cardName = req.params.name;
    const card = await HearthstoneCard.findOne({ name: cardName })
      .populate('set', 'name slug')
      .select('-__v');

    if (!card) {
      return res.status(404).json({ message: 'Carte non trouvée.' });
    }

    res.status(200).json({ card });
  } catch (error) {
    console.error('Error fetching card by name:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});


/*-----------------------------------------------------------*/


router.post('/create-collections', async (req, res) => {
  try {
    console.log('and cards...');
    
    let nonce = await provider.getTransactionCount(wallet.address, "latest");
    const allSets = await HearthstoneSet.find({});
    for (const set of allSets) {
        const exists = await mainContract.collectionExists(set.name);
        if (exists) {
            //console.log(`La collection ${set.name} existe déjà sur la blockchain. Elle ne sera pas recréée.`);
            continue;
        }

        // que 5 cartes par collections, sinon ca bug!
        const cards = await HearthstoneCard.find({ set: set.name }).limit(5);
        const cardsForContract = cards.map((card, index) => ({
            cardNumber: card.id,
            cardName: card.name,
            metadataURI: card.image,
            collectionAddress: ethers.constants.AddressZero,
        }));

        const gasEstimate = await mainContract.estimateGas.createCollection(set.name, cardsForContract.length, cardsForContract);
        //console.log(`Gas estimé : ${gasEstimate.toString()}`);

        // Créer la collection sur la blockchain

        const tx = await mainContract.createCollection(set.name, cardsForContract.length, cardsForContract, {
            //gasLimit: gasEstimate.mul(2),
            nonce: nonce
        });
        const receipt = await tx.wait();

        //console.log(`Collection ${set.name} créée avec succès. Transaction hash: ${receipt.transactionHash}`);
        nonce++;
    }

    res.json({ message: 'Collections créées avec succès sur la blockchain' });
  } catch (err) {
      console.error('Erreur lors de la création des collections et des cartes: ');
      res.status(500).json({ error: 'Erreur lors de la création des collections et des cartes' });
  }
});

router.get('/get-collections', async (req, res) => {
  try {
    console.log('Fetching collections from the blockchain');
    const collectionCount = await mainContract.getCollectionCount();
    const collections = [];

    for (let i = 0; i < collectionCount.toNumber(); i++) {
      const [name, address, cardCount] = await mainContract.getCollectionInfo(i);
      collections.push({
        name,
        address,
        cardCount: cardCount.toNumber(),
      });
    }

    res.json({ collections });
  } catch (error) {
    console.error('Erreur lors de la récupération des collections:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des collections' });
  }
});

router.post('/mint', async (req, res) => {
  try {
    const { collectionAddress, toAddress, cardNumber, cardName, metadataURI } = req.body;

      // param
      if (!collectionAddress || !ethers.utils.isAddress(collectionAddress)) {
          return res.status(400).json({ error: 'Adresse de collection invalide ou manquante' });
      }
      if (!toAddress || !ethers.utils.isAddress(toAddress)) {
          return res.status(400).json({ error: 'Adresse du destinataire invalide ou manquante' });
      }
      if (cardNumber === undefined || cardNumber === null || typeof cardNumber !== 'number') {
          return res.status(400).json({ error: 'Numéro de carte invalide ou manquant' });
      }
      if (!cardName || typeof cardName !== 'string') {
        return res.status(400).json({ error: 'Nom de la carte invalide ou manquante' });
    }
      if (!metadataURI || typeof metadataURI !== 'string') {
          return res.status(400).json({ error: 'Image URL invalide ou manquante' });
      }

      // verifier que la collection existe dans la blockchain
      const [names, addresses, cardCounts] = await mainContract.getCollections();

      let collectionId = null;
        for (let i = 0; i < addresses.length; i++) {
            if (addresses[i].toLowerCase() === collectionAddress.toLowerCase()) {
                collectionId = i;
                break;
            }
        }

      if (collectionId === null) {
          return res.status(404).json({ error: 'Collection non trouvée sur la blockchain.' });
      }

      const tx = await mainContract.mintCard(
          collectionAddress,
          toAddress,
          cardNumber,
          cardName,
          metadataURI,
      );
      
      const receipt = await tx.wait();

      console.log(`Carte mintée avec succès dans la collection ${collectionAddress}. Transaction hash: ${receipt.transactionHash}`);

      res.json({ message: 'Carte mintée avec succès sur la blockchain.', transactionHash: receipt.transactionHash });
  } catch (err) {
      console.error('Erreur lors du minting de la carte:', err);
      res.status(500).json({ error: 'Erreur lors du minting de la carte.' });
  }
});

// get boosters pour les afficher
router.get('/boosters', async (req, res) => {
  try {
    const setsResponse = await axios.get(`http://localhost:5000/hearthstone/sets`);
    const sets = setsResponse.data.sets;

    const boosters = sets.map((set, index) => ({
      name: set.name, // le nom du set est le nom du booster
      boosterTypeId: index,
    }));

    res.json({ boosters });
  } catch (error) {
    console.error("Erreur lors de la création des boosters:", error);
    res.status(500).json({ error: "Erreur lors de la création des boosters." });
  }
});

router.post('/boosters/buyAndRedeem', async (req, res) => {
  try {
    const { boosterName, boosterTypeId } = req.body;

    console.log('Achat et rédemption du booster avec le nom:', boosterName);
    // Buy the booster
    const collectionId = await mainContract.getCollectionIdByName(boosterName);
    console.log('Collection ID récup:', collectionId.toString());

    const buyTx = await mainContract.createBooster(boosterName, collectionId, boosterTypeId,
      { value: ethers.utils.parseEther("0.05"),
      });
    const buyReceipt = await buyTx.wait();
    console.log('Booster acheté avec succès. Transaction hash:', buyReceipt.transactionHash);
    // Retrieve the latest booster ID from the events in the receipt
    const boosterMintedEvent = buyReceipt.events.find(event => event.event === 'BoosterMinted');
    const boosterId = boosterMintedEvent.args.boosterId;
    console.log('Booster ID récup:', boosterId.toString());

    // Redeem the booster
    const redeemTx = await mainContract.openBooster(boosterId, { gasLimit: 2000000 });
    const redeemReceipt = await redeemTx.wait();
    console.log('Booster open: Transaction hash:', redeemTx.hash);

    // Extract redeemed cards from the BoosterRedeemed event
    const boosterOpenedEvent = redeemReceipt.events.find(event => event.event === 'BoosterOpened');
    if (!boosterOpenedEvent || !boosterOpenedEvent.args) {
      throw new Error("L'événement BoosterOpened n'a pas été trouvé");
    }

    // Extraire et combiner les informations des cartes
    const { cardNumbers, cardNames, metadataURIS } = boosterOpenedEvent.args;
    const redeemedCards = cardNumbers.map((cardNumber, index) => ({
      cardNumber: cardNumber.toNumber(),
      cardName: cardNames[index],
      metadataURI: metadataURIS[index]
    }));


    console.log("Cartes récupérées:", redeemedCards);

    // Respond with the redeemed cards
    res.json({
      success: true,
      message: 'Booster acheté et réclamé avec succès',
      cards: redeemedCards,
      transactionHash: redeemTx.hash
    });
  
  } catch (err) {
    console.error("Erreur lors de l'achat et la rédemption du booster:", err);
    res.status(500).json({ error: "Erreur lors de l'achat et la rédemption du booster" });
  }
});


module.exports = router;