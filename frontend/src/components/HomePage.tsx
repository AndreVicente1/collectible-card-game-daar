import React, { useEffect, useState } from 'react';
import styles from '../css/HomePage.module.css';

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
  loading: boolean;
  error: string | null;
}

const HomePage: React.FC<HomePageProps> = ({ nfts, balance, loading, error }) => {
  return (
    <div className={styles.homePage}>
      <h1>Bienvenue sur HearthStone TCG</h1>
      <div className={styles.balanceContainer}>
        <h2>Votre Solde: {balance} ETH</h2>
      </div>
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