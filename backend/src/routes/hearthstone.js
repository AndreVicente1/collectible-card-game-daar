const express = require('express');
const HearthstoneCard = require('../models/HearthstoneCard');

const router = express.Router();

// Route pour récupérer la liste des sets intégrés
router.get('/sets', async (req, res) => {
  try {
    const sets = await HearthstoneCard.distinct('set');
    res.status(200).json({ sets });
  } catch (error) {
    console.error('Error fetching sets:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;