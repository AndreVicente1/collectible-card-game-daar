const axios = require('axios');
const HearthstoneCard = require('./models/HearthstoneCard');
const HearthstoneSet = require('./models/HearthstoneSet');
const dotenv = require('dotenv');
const { ethers } = require('ethers');

dotenv.config();

const clientId = process.env.BLIZZARD_CLIENT_ID;
const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;

const contract = require('../../contracts/artifacts/src/Main.sol/Main.json');

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
const contractAdd = '0xA748471B4a65567BE67976C62787040D62D335af'
const wallet = new ethers.Wallet(process.env.ADDRESSE_CONTRAT, provider);

const mainContract = new ethers.Contract(contractAdd, contract.abi, wallet);

let accessToken = '';
let tokenExpiresAt = 0;

// obtenir un nouveau token
const getAccessToken = async () => {
  const currentTime = Date.now();

  if (accessToken && currentTime < tokenExpiresAt) {
    return accessToken;
  }

  try {
    const response = await axios.post(
      'https://oauth.battle.net/token',
      'grant_type=client_credentials',
      {
        auth: {
          username: clientId,
          password: clientSecret,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    accessToken = response.data.access_token;
    tokenExpiresAt = currentTime + (response.data.expires_in - 60) * 1000;

    console.log('Access token obtained successfully: ', accessToken);
    return accessToken;
  } catch (error) {
    console.error('Error obtaining access token:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Fonction pour récupérer les métadonnées des sets avec leurs slugs
const fetchSetMetadata = async (accessToken) => {
    try {
        const setsResponse = await axios.get('https://eu.api.blizzard.com/hearthstone/metadata/sets', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            params: {
                locale: 'en_GB',
            },
        });

        console.log('Sets:', setsResponse.data);

        const sets = setsResponse.data;

        // Stocker les sets dans MongoDB
        for (const set of sets) {
            //if (!setsToInclude.includes(set.name)) continue;
    
            // Vérifier si le set existe déjà
            const existingSet = await HearthstoneSet.findOne({ id: set.id });
    
            if (!existingSet) {
            const newSet = new HearthstoneSet({
                id: set.id,
                name: set.name,
                slug: set.slug,
                hyped: set.hyped || false,
                type: set.type,
                collectibleCount: set.collectibleCount || 0,
                collectibleRevealedCount: set.collectibleRevealedCount || 0,
                nonCollectibleCount: set.nonCollectibleCount || 0,
                nonCollectibleRevealedCount: set.nonCollectibleRevealedCount || 0,
            });
    
            await newSet.save();
            console.log(`Saved set: ${set.name}`);
            }
        }

        return sets;

    } catch (error) {
        console.error('Error fetching set metadata:', error.response ? error.response.data : error.message);
        throw error;
    }
};
  
// Fonction pour récupérer et enregistrer les cartes d'un set donné
const fetchAndSaveCardsForSet = async (setSlug, setName, accessToken) => {
    try {
        let page = 1;
        let totalPages = 1;

        while (page <= totalPages) {
            const cardsResponse = await axios.get('https://eu.api.blizzard.com/hearthstone/cards', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                params: {
                    set: setSlug,
                    locale: 'en_GB',
                    page: page,
                    page_size: 100, // Maximum allowed
                },
            });

            const cards = cardsResponse.data.cards;
            totalPages = cardsResponse.data.pageCount;
            
            console.log(`Fetched ${cards.length} cards for set: ${setName} (Page ${page} of ${totalPages})`);

            for (const card of cards) {
                // ignorer les héros
                if (card.type === 'HERO') continue;

                const cardType = mapCardTypeIdToType(card.cardTypeId) || 'UNKNOWN'; // Assurer que cardType est toujours défini
                const cardRarity = mapRarityIdToRarity(card.rarityId) || 'UNKNOWN';

                const attributes = [];
                if (cardType) attributes.push({ trait_type: 'Type', value: cardType });
                if (cardRarity) attributes.push({ trait_type: 'Rarity', value: cardRarity });
                if (card.manaCost !== undefined) attributes.push({ trait_type: 'Cost', value: card.manaCost.toString() });
                if (card.attack !== undefined) attributes.push({ trait_type: 'Attack', value: card.attack.toString() });
                if (card.health !== undefined) attributes.push({ trait_type: 'Health', value: card.health.toString() });

                // Vérifier si la carte existe déjà
                const existingCard = await HearthstoneCard.findOne({ id: card.id });
                if (!existingCard) {
                    // TODO: que les attributs qu'on veut (id, nom, image)?
                    const newCard = new HearthstoneCard({
                        id: card.id,
                        name: card.name,
                        type: cardType,
                        set: setName,
                        rarity: cardRarity,
                        description: card.text || '',
                        image: card.image || '',
                        attributes: attributes,
                    });

                    await newCard.save();
                    console.log(`Saved card: ${card.name}`);
                }
            }

            page += 1;
        }
    } catch (error) {
        console.error(`Error fetching cards for set: ${setName}`, error.response ? error.response.data : error.message);
        throw error;
    }
};

// Mapper les IDs des types de carte à des valeurs lisibles
const mapCardTypeIdToType = (cardTypeId) => {
    const cardTypeMap = {
        4: 'MINION',
        5: 'SPELL',
        7: 'WEAPON',
    };
    return cardTypeMap[cardTypeId] || 'UNKNOWN';
};

// Mapper les IDs de rareté à des valeurs lisibles
const mapRarityIdToRarity = (rarityId) => {
    const rarityMap = {
        1: 'COMMON',
        3: 'RARE',
        4: 'EPIC',
        5: 'LEGENDARY',
    };
    return rarityMap[rarityId] || 'UNKNOWN';
};

// Fonction principale pour synchroniser les cartes Hearthstone
const syncHearthstoneCards = async () => {
    try {
        const accessToken = await getAccessToken();

        const sets = await fetchSetMetadata(accessToken);
        console.log('Fetched sets metadata:', sets);

        // Récupérer les cartes pour chaque set
        for (const set of sets) {
            const setSlug = set.slug; // le slug est différent du nom du set
            const setName = set.name;
            console.log(`Processing set: ${setName} (Slug: ${setSlug})`);

            await fetchAndSaveCardsForSet(setSlug, setName, accessToken);
        }

        console.log('Hearthstone cards synchronized successfully');
    } catch (error) {
        console.error('Error synchronizing Hearthstone cards:', error.message);
    }
};


/* --------------------------------------------------------------- */

// creer des collections
const createCollection = async (req, res) => {
    try {
        console.log('and cards...');

        const allSets = await HearthstoneSet.find({});
        for (const set of allSets) {
            const cards = await HearthstoneCard.find({ set: set.name });
            const cardsForContract = cards.map((card, index) => ({
                cardNumber: card.id,
                cardName: card.name,
                metadataURI: card.image,
            }));

            // Créer la collection sur la blockchain
            
            const tx = await mainContract.createCollection(set.name, cardsForContract.length, cardsForContract);
            const receipt = await tx.wait();

            console.log(`Collection ${set.name} créée avec succès. Transaction hash: ${receipt.transactionHash}`);
        }

        res.json({ message: 'Collections créées avec succès sur la blockchain' });
    } catch (err) {
        console.error('Erreur lors de la création des collections et des cartes: ', err);
        res.status(500).json({ error: 'Erreur lors de la création des collections et des cartes' });
    }
};

module.exports = {syncHearthstoneCards, createCollection};