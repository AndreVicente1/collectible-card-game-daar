// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const syncHearthstoneCards = require('./hearthstoneAPI');
const hearthstoneRouter = require('./routes/hearthstone');
const marketplaceListener = require('./listeners/marketplaceListener');
const Listing = require('./models/Listing')

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/hearthstone', hearthstoneRouter);

// Connexion à MongoDB
// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('Connecté à MongoDB');

  // Supprimer tous les documents de la collection 'listings'
  try {
    await Listing.deleteMany({});
    console.log('Tous les documents de la collection "listings" ont été supprimés.');
  } catch (err) {
    console.error('Erreur lors de la suppression des documents de "listings":', err);
  }

  // Démarrer le serveur
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
  });

})
.catch((err) => {
  console.error('Erreur de connexion à MongoDB:', err);
});

console.log('cc');

// Routes
app.get('/', (req, res) => {
  res.send('Hello World!');
});

/*const imagesRouter = require('./routes/images');
app.use('/images', imagesRouter);
*/
