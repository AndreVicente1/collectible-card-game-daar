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
  fetchNFTs: () => Promise<void>;

  refreshData: boolean;
  setRefreshData: (value: boolean) => void;
}

interface Collection {
  name: string;
  address: string;
  cardCount: number;
}

const HomePage: React.FC<HomePageProps> = ({ nfts, balance, isOwner, loading, error, fetchNFTs, refreshData, setRefreshData }) => {
  // États pour la synchronisation
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [countdown, setCountdown] = useState<number | null>(null);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState<boolean>(true);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);

  const [hasSynced, setHasSynced] = useState<boolean>(false);

  // Nouvel état pour gérer l'ouverture du menu déroulant
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Fonction pour gérer la synchronisation des collections
  const handleSyncCollections = async () => {
    setSyncing(true);
    setSyncSuccess(false);
    setSyncError(null);

    try {
      const response = await axios.post('http://localhost:5000/hearthstone/create-collections');
      console.log('Réponse de la synchronisation:', response.data);
      setSyncSuccess(true);
      setRefreshData(!refreshData);
      setHasSynced(true); 
      setCountdown(null); 
    } catch (err: any) {
      console.error('Erreur lors de la synchronisation:', err);
      setSyncError('Erreur lors de la synchronisation avec la blockchain');
      setCountdown(10); 
    } finally {
      setSyncing(false);
    }
  };

  // Fonction pour récupérer les collections depuis le backend
  const fetchCollections = async () => {
    try {
      setCollectionsLoading(true);
      const response = await axios.get('http://localhost:5000/hearthstone/get-collections');
      const { collections } = response.data;
      setCollections(collections);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des collections:', err);
      setCollectionsError('Erreur lors de la récupération des collections.');
    } finally {
      setCollectionsLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner && countdown === null && !syncing && !hasSynced) {
      setCountdown(3); 
    }
  }, [isOwner, countdown, syncing, hasSynced]);

  
  useEffect(() => {
    if (countdown === null) return; 
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer); 
    } else {
      handleSyncCollections(); 
    }
  }, [countdown]);

  useEffect(() => {
    fetchCollections();
    fetchNFTs();
  }, [refreshData]); // Récupère les collections au montage du composant

  const handleManualSync = () => {
    if (!syncing) {
      setSyncSuccess(false);
      setSyncError(null);
      setHasSynced(false); 
      setCountdown(2); 
    }
  };

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
            onClick={handleManualSync}
            disabled={syncing || (countdown !== null && countdown > 0)}
          >
            {syncing ? 'Synchronisation en cours...' : 'Synchroniser avec la Blockchain'}
          </button>
          {countdown !== null && countdown > 0 && (
            <p className={styles.countdownMessage}>
              Synchronisation dans : {countdown} seconde{countdown > 1 ? 's' : ''}
            </p>
          )}
          {syncSuccess && <p className={styles.successMessage}>Synchronisation réussie !</p>}
          {syncError && <p className={styles.errorMessage}>{syncError}</p>}
        </div>
      )}

      {/* Chargement et affichage des collections avec menu déroulant */}
      <div className={styles.collectionsContainer}>
        <h2>Collections disponibles</h2>
        <p>Total Collections: {collections.length}</p>
        <button
          className={styles.dropdownButton}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          {isDropdownOpen ? 'Masquer Collections ▲' : 'Afficher Collections ▼'}
        </button>
        {isDropdownOpen && (
          <div className={styles.dropdownContent}>
            {collectionsLoading ? (
              <div className={styles.loading}>Chargement des collections...</div>
            ) : collectionsError ? (
              <div className={styles.error}>{collectionsError}</div>
            ) : (
              <ul className={styles.collectionsList}>
                {collections.map((collection, index) => (
                  <li key={index} className={styles.collectionItem}>
                    <strong>{collection.name}</strong> - {collection.cardCount} carte{collection.cardCount > 1 ? 's' : ''} - {collection.address}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <h2 className={styles.nftsTitle}>Vos NFTs</h2>
        {loading ? (
          <div className={styles.loading}>Chargement de vos NFTs...</div>
        ) : error ? (
          <div className={styles.error}>Erreur: {error}</div>
        ) : (
          <div className={styles.nftsContainer}>
            {nfts.map((nft, index) => (
              <div key={index} className={styles.nftCard}>
                <img
                  src={nft.metadata?.image || '/images/cards/basic.png'}
                  className={styles.nftImage}
                />
                <p>Collection: {nft.collectionName}</p>
                <p>Token ID: {nft.tokenId}</p>
              </div>
            ))}
          </div>
        )}

    </div>
  );
};

export default HomePage;
