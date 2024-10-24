const express = require('express');
const HearthstoneSet = require('../models/HearthstoneSet');
const HearthstoneCard = require('../models/HearthstoneCard');
const {createCollection} = require('../hearthstoneAPI');

const router = express.Router();

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

router.post('/create-collections', createCollection);

module.exports = router;