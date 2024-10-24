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

const HomePage: React.FC<HomePageProps> = ({ nfts, balance, isOwner, loading, error }) => {
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  const handleSyncCollections = async () => {
    setSyncing(true);
    setSyncSuccess(false);
    setSyncError(null);
  
    try {
  
      const response = await axios.post('http://localhost:5000/hearthstone/create-collections');
  
      console.log(response.data);
      setSyncSuccess(true);
    } catch (err: any) {
      console.error('Erreur lors de la synchronisation:', err);
      setSyncError('Erreur lors de la synchronisation avec la blockchain');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    handleSyncCollections();
  }, []);

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
          onClick={handleSyncCollections}
          disabled={syncing}
        >
          {syncing ? 'Synchronisation en cours...' : 'Synchroniser avec la Blockchain'}
        </button>
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
    </div>
  );
};

export default HomePage;