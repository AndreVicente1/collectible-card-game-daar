import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import styles from '../css/Mint.module.css';

interface Collection {
  name: string;
  address: string;
  cardCount: number;
}

interface Card {
  id: number;
  name: string;
  image: string;
}

const Mint: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [sets, setSets] = useState<{ [name: string]: string }>({});
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [cardName, setCardName] = useState<string>('');
  const [cardImage, setCardImage] = useState<string>('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [minting, setMinting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Récupérer les collections depuis le backend
        const collectionsResponse = await axios.get('http://localhost:5000/hearthstone/get-collections');
        setCollections(collectionsResponse.data.collections);

        // Récupérer les sets pour mapper le nom au slug
        const setsResponse = await axios.get('http://localhost:5000/hearthstone/sets');
        const setsData: any[] = setsResponse.data.sets;
        const setMap: { [name: string]: string } = {};
        setsData.forEach(set => {
          setMap[set.name] = set.slug;
        });
        setSets(setMap);
      } catch (error: any) {
        console.error('Error fetching collections or sets:', error);
        setErrorMessage('Erreur lors de la récupération des collections ou des sets.');
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchCards = async () => {
      if (selectedCollection) {
        try {
          const setSlug = sets[selectedCollection.name];
          if (!setSlug) {
            setErrorMessage(`Slug non trouvé pour le set ${selectedCollection.name}`);
            setCards([]);
            return;
          }

          const response = await axios.get(`http://localhost:5000/hearthstone/sets/slug/${setSlug}/cards`);
          setCards(response.data.cards);
          if (response.data.cards.length > 0) {
            setSelectedCard(response.data.cards[0]);
            setCardName(response.data.cards[0].name);
            setCardImage(response.data.cards[0].image);
          } else {
            setSelectedCard(null);
            setCardName('');
            setCardImage('');
          }
        } catch (error: any) {
          console.error(`Error fetching cards for set ${selectedCollection.name}:`, error);
          setErrorMessage(`Erreur lors de la récupération des cartes pour le set ${selectedCollection.name}`);
          setCards([]);
        }
      } else {
        setCards([]);
        setSelectedCard(null);
      }
    };

    fetchCards();
  }, [selectedCollection, sets]);

  // Fonction pour gérer le minting
  const handleMint = async () => {
    if (!selectedCollection || !selectedCard) {
      setErrorMessage('Veuillez sélectionner une collection et une carte');
      return;
    }

    if (!ethers.utils.isAddress(recipientAddress)) {
      setErrorMessage('Adresse du destinataire invalide');
      return;
    }

    setMinting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await axios.post('http://localhost:5000/hearthstone/mint', {
        collectionAddress: selectedCollection.address,
        toAddress: recipientAddress,
        cardNumber: selectedCard.id,
        cardName: selectedCard.name,
        metadataURI: selectedCard.image
      });

      setSuccessMessage(`Carte mintée avec succès, Transaction hash: ${response.data.transactionHash}`);
      setRecipientAddress('');
    } catch (error: any) {
      console.error('Error minting card:', error);
      setErrorMessage(error.response?.data?.error || 'Erreur lors du minting de la carte');
    } finally {
      setMinting(false);
    }
  };
  
  return (
    <div className={styles.mintCardForm}>
      <h3>Mint une Nouvelle Carte</h3>
      <div className={styles.formGroup}>
        <label>Collection :</label>
        <select
          value={selectedCollection ? selectedCollection.name : ''}
          onChange={(e) => {
            const collection = collections.find(c => c.name === e.target.value) || null;
            setSelectedCollection(collection);
          }}
        >
          <option value="">Sélectionnez une Collection</option>
          {collections.map(collection => (
            <option key={collection.address} value={collection.name}>
              {collection.name}
            </option>
          ))}
        </select>
      </div>

      {selectedCollection && (
        <div className={styles.formGroup}>
          <label>Carte :</label>
          <select
            value={selectedCard ? selectedCard.id : ''}
            onChange={(e) => {
              const card = cards.find(c => c.id === Number(e.target.value)) || null;
              setSelectedCard(card);
              setCardName(card ? card.name : '')
            }}
          >
            <option value="">Sélectionnez une Carte</option>
            {cards.map(card => (
              <option key={card.id} value={card.id}>
                {card.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedCollection && selectedCard && (
        <div className={styles.formGroup}>
          <label>Nom de la Carte :</label>
          <input
            type="text"
            value={cardName}
            readOnly // Empêche la modification manuelle
          />
        </div>
      )}

      {selectedCollection && selectedCard && (
        <div className={styles.formGroup}>
          <label>Adresse du Destinataire :</label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="0x..."
          />
        </div>
      )}

      {selectedCollection && selectedCard && (
        <button onClick={handleMint} disabled={minting}>
          {minting ? 'Mint en cours...' : 'Mint Carte'}
        </button>
      )}

      {successMessage && <p className={styles.successMessage}>{successMessage}</p>}
      {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}
    </div>
  );
};


export default Mint;