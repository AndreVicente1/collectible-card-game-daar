const express = require('express');
const HearthstoneSet = require('../models/HearthstoneSet');
const HearthstoneCard = require('../models/HearthstoneCard');
const { ethers } = require('ethers');

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
        }));

        const gasEstimate = await mainContract.estimateGas.createCollection(set.name, cardsForContract.length, cardsForContract);
        //console.log(`Gas estimé : ${gasEstimate.toString()}`);

        // Créer la collection sur la blockchain

        const tx = await mainContract.createCollection(set.name, cardsForContract.length, cardsForContract, {
            gasLimit: gasEstimate.mul(2),
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
    const [names, addresses, cardCounts] = await mainContract.getCollections();

    const collections = names.map((name, index) => ({
      name,
      address: addresses[index],
      cardCount: cardCounts[index].toNumber()
    }));
    res.json({ collections });
  } catch (error) {
    console.error('Erreur lors de la récupération des collections:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des collections' });
  }
});

module.exports = router;