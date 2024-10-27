import React, { useState } from 'react';
import styles from '../css/AdminPage.module.css';
import Mint from './Mint';

interface AdminPageProps {
  createCollection: (name: string, cardCount: number) => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ createCollection}) => {
  const [collectionName, setCollectionName] = useState('');
  const [cardCount, setCardCount] = useState<number>(0);

  return (
    <div className={styles.adminPage}>
      <h2>Créer une Nouvelle Collection</h2>
      <div className={styles.formGroup}>
        <input
          type="text"
          placeholder="Nom de la Collection"
          value={collectionName}
          onChange={(e) => setCollectionName(e.target.value)}
        />
        <input
          type="number"
          placeholder="Nombre de Cartes"
          value={cardCount}
          onChange={(e) => setCardCount(Number(e.target.value))}
        />
        <button onClick={() => createCollection(collectionName, cardCount)}>
          Créer Collection
        </button>
      </div>

      <h2>Mint une Nouvelle Carte</h2>
      <Mint />
    </div>
  );
};

export default AdminPage;