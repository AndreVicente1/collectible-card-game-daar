// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connecté à MongoDB');
})
.catch((err) => {
  console.error('Erreur de connexion à MongoDB:', err);
});

console.log('cc');

// Routes
app.get('/', (req, res) => {
  res.send('Hello World!');
});

const imagesRouter = require('./routes/images');
app.use('/images', imagesRouter);

// Démarrer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
