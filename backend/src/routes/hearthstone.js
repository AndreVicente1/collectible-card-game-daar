const express = require('express');
const HearthstoneSet = require('../models/HearthstoneSet');
const HearthstoneCard = require('../models/HearthstoneCard');

const router = express.Router();

// Route pour récupérer la liste des sets intégrés
router.get('/sets', async (req, res) => {
  try {
    const { name, type } = req.query; // Récupérer les paramètres de requête

    // Construire un objet de filtre dynamique
    let filter = {};
    if (name) {
      filter.name = { $regex: name, $options: 'i' }; // Recherche insensible à la casse
    }
    if (type) {
      filter.type = type;
    }

    // Récupérer les sets avec filtres appliqués
    const sets = await HearthstoneSet.find(filter)
      .select('-__v')
      .sort({ id: 1 });

    res.status(200).json({ sets });
  } catch (error) {
    console.error('Error fetching sets:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.get('/cards', async (req, res) => {
  try {
    // Récupérer toutes les cartes avec la référence au set
    const cards = await HearthstoneCard.find()
      .populate('set', 'name slug')
      .select('-__v')
      .sort({ id: 1 });

    res.status(200).json({ cards });
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;