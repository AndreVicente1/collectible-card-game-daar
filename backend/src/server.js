// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const syncHearthstoneCards = require('./hearthstoneAPI');
const hearthstoneRouter = require('./routes/hearthstone');
const marketplaceListener = require('./listeners/marketplaceListener');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/hearthstone', hearthstoneRouter);

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connecté à MongoDB');

  // sets + cartes dans db, plus besoin, on a déjà tout récupéré
  //syncHearthstoneCards(); 

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
