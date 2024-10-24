import React, { useEffect, useState } from 'react';
import styles from '../css/HomePage.module.css';
import axios from 'axios';

interface NFT {
  collectionName: string;
  tokenId: number;
  metadata: {
    name: string;
    image: string;
    [key: string]: any;
  };
}

interface HomePageProps {
  nfts: NFT[];
  balance: string;
  isOwner: boolean;
  loading: boolean;
  error: string | null;
}

interface Collection {
  name: string;
  address: string;
  cardCount: number;
}

const HomePage: React.FC<HomePageProps> = ({ nfts, balance, isOwner, loading, error }) => {
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<boolean | null>(null);
  const [hasSynced, setHasSynced] = useState(false);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState<boolean>(true);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(10);

  const handleSyncCollections = async () => {
    setSyncing(true);
    setSyncSuccess(false);
    setSyncError(false);
  
    try {
  
      const response = await axios.post('http://localhost:5000/hearthstone/create-collections');
      
      console.log(response.data);
      setHasSynced(true);
      setSyncSuccess(true);
    } catch (err: any) {
      console.error('Erreur lors de la synchronisation:', err);
      setSyncError(true);
      setCountdown(10);
    } finally {
      setSyncing(false);
    }
  };

  const fetchCollections = async () => {
    try {
        setCollectionsLoading(true);
        const response = await axios.get('http://localhost:5000/hearthstone/get-collections'); // Requête au backend
        const { collections } = response.data;
        setCollections(collections);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des collections:', err);
      setCollectionsError('Erreur lors de la récupération des collections.');
    } finally {
      setCollectionsLoading(false);
    }
  }
  
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      handleSyncCollections();
    }

    return () => clearTimeout(timer);
  }, [hasSynced, countdown]);

  useEffect(() => {
    if (isOwner) {
      setCountdown(5);
    }
    
    if (syncSuccess) {
      fetchCollections();
    }
  }, [isOwner, syncSuccess]);

  return (
    <div className={styles.homePage}>
      <h1>Bienvenue sur HearthStone TCG</h1>
      <div className={styles.balanceContainer}>
        <h2>Votre Solde: {balance} ETH</h2>
      </div>
      {isOwner && (
        <div className={styles.syncContainer}>
          <button
            className={styles.syncButton}
            onClick={() => setCountdown(2)}
            disabled={syncing || countdown > 0}
          >
            {syncing ? 'Synchronisation en cours...' : 'Synchroniser avec la Blockchain'}
          </button>
          {countdown > 0 && (
            <p className={styles.countdownMessage}>Synchronisation dans: {countdown} seconde{countdown > 1 ? 's' : ''}</p>
          )}
          {syncSuccess && <p className={styles.successMessage}>Synchronisation réussie !</p>}
          {syncError && <p className={styles.errorMessage}>{syncError}</p>}
        </div>
      )}
      
      {loading ? (
        <div className={styles.loading}>Chargement de vos NFTs...</div>
      ) : error ? (
        <div className={styles.error}>Erreur: {error}</div>
      ) : (
        <div className={styles.nftsContainer}>
          {nfts.map((nft, index) => (
            <div key={index} className={styles.nftCard}>
              <img src={nft.metadata.image || '/images/default.png'} alt={nft.metadata.name} className={styles.nftImage} />
              <h3>{nft.metadata.name}</h3>
              <p>Collection: {nft.collectionName}</p>
              <p>Token ID: {nft.tokenId}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chargement et affichage des collections */}
      <div className={styles.collectionsContainer}>
        <h2>Collections disponibles</h2>
        {collectionsLoading ? (
          <div className={styles.loading}>Chargement des collections...</div>
        ) : collectionsError ? (
          <div className={styles.error}>{collectionsError}</div>
        ) : (
          <ul className={styles.collectionsList}>
            {collections.map((collection, index) => (
              <li key={index} className={styles.collectionItem}>
                <strong>{collection.name}</strong> - {collection.cardCount.toString()} cartes - {collection.address.toString()}
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  )};

export default HomePage;