import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Card {
  id: number;
  name: string;
  img: string;
}

interface MintProps {
  collectionId: number;
  mintCard: (collectionId: number, toAddress: string, cardName: string) => void;
}

const Mint: React.FC<MintProps> = ({ collectionId, mintCard }) => {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [selectedCardName, setSelectedCardName] = useState('');
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCardNames = async () => {
      try {
        const response = await axios.get('http://localhost:5000/hearthstone/cards');
        setCards(response.data.cards);
        if (response.data.cards.length > 0) {
          setSelectedCardName(response.data.cards[0].name);
        }
      } catch (err: any) {
        console.error('Error fetching card names:', err);
        setError('Erreur lors de la récupération des noms des cartes.');
      } finally {
        setLoading(false);
      }
    };

    fetchCardNames();
  }, []);

  if (loading) {
    return <div className="loading">Chargement des cartes...</div>;
  }

  if (error) {
    return <div className="error">Erreur: {error}</div>;
  }

  return (
    <div className="mintCardForm">
      <h3>Mint une Nouvelle Carte</h3>
      <div>
        <label>Nom de la Carte:</label>
        <select
          value={selectedCardName}
          onChange={(e) => setSelectedCardName(e.target.value)}
        >
          {cards.map((card) => (
            <option key={card.id} value={card.name}>
              {card.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Adresse du Destinataire:</label>
        <input
          type="text"
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          placeholder="0x..."
        />
      </div>
      <button onClick={() => mintCard(collectionId, recipientAddress, selectedCardName)}>
        Mint Carte
      </button>
    </div>
  );
};

export default Mint;