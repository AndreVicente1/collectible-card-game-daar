import React from 'react';
import styles from '../css/BoosterModal.module.css';

// Composant que pour l'affichage lors de l'ouverture d'un booster

interface Card {
  cardNumber: number;
  cardName: string;
  metadataURI: string;
}

interface BoosterModalProps {
  cards: Card[];
  onClose: () => void;
}

const BoosterModal: React.FC<BoosterModalProps> = ({ cards, onClose }) => {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Boosters Ouvert!</h2>
        <div className={styles.cardsContainer}>
          {cards.map((card) => (
            <div key={card.cardNumber} className={styles.card}>
              <img src={card.metadataURI} alt={card.cardName} className={styles.cardImage} />
              <p>{card.cardName}</p>
            </div>
          ))}
        </div>
        <button onClick={onClose} className={styles.closeButton}>
          Fermer
        </button>
      </div>
    </div>
  );
};

export default BoosterModal;