// src/components/Marketplace.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import styles from '../css/Marketplace.module.css';

interface Listing {
  nftAddress: string;
  tokenId: number;
  price: string;
  seller: string;
  metadata?: {
    name: string;
    image: string;
    [key: string]: any;
  };
}

interface MarketplaceProps {
  userAddress: string;
  userNfts: any[]; // Vous pouvez définir un type plus précis si nécessaire
}

const Marketplace: React.FC<MarketplaceProps> = ({ userAddress, userNfts }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // États pour gérer les prix de vente des cartes possédées
  const [salePrices, setSalePrices] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const response = await axios.get('http://localhost:5000/hearthstone/listings');
        // Récupérer les métadonnées pour chaque listing
        const listingsWithMetadata = await Promise.all(
          response.data.listings.map(async (listing: Listing) => {
            try {
              // Remplacez cette URL par celle de votre API qui fournit les métadonnées
              const metadataResponse = await axios.get(`http://localhost:5000/hearthstone/metadata/${listing.nftAddress}/${listing.tokenId}`);
              return {
                ...listing,
                metadata: metadataResponse.data.metadata,
              };
            } catch (metadataError) {
              console.error(`Erreur lors de la récupération des métadonnées pour ${listing.tokenId}:`, metadataError);
              return {
                ...listing,
                metadata: {
                  name: `Token ${listing.tokenId}`,
                  image: '/images/cards/basic.png',
                },
              };
            }
          })
        );
        setListings(listingsWithMetadata);
      } catch (err) {
        console.error('Erreur lors de la récupération des listes:', err);
        setError('Impossible de charger les listes.');
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  const handleBuy = async (listing: Listing) => {
    try {
      const tx = await axios.post('http://localhost:5000/hearthstone/buy', {
        nftAddress: listing.nftAddress,
        tokenId: listing.tokenId,
        price: listing.price,
      });
      alert('Achat réussi! Transaction Hash: ' + tx.data.transactionHash);
      // Rafraîchir les listes
      setListings(listings.filter(l => !(l.nftAddress === listing.nftAddress && l.tokenId === listing.tokenId)));
    } catch (err) {
      console.error('Erreur lors de l\'achat:', err);
      alert('Erreur lors de l\'achat de la carte.');
    }
  };

  const handleList = async (nftAddress: string, tokenId: number) => {
    const price = salePrices[`${nftAddress}-${tokenId}`];
    if (!price) {
      alert('Veuillez entrer un prix valide.');
      return;
    }

    try {
      const tx = await axios.post('http://localhost:5000/hearthstone/list', {
        nftAddress,
        tokenId,
        price: ethers.utils.parseEther(price).toString(),
      });
      alert('Carte listée avec succès! Transaction Hash: ' + tx.data.transactionHash);
      // Rafraîchir les listes
      setListings([...listings, { nftAddress, tokenId, price, seller: userAddress }]);
      // Réinitialiser le prix
      setSalePrices(prev => ({ ...prev, [`${nftAddress}-${tokenId}`]: '' }));
    } catch (err) {
      console.error('Erreur lors de la liste:', err);
      alert('Erreur lors de la liste de la carte.');
    }
  };

  // Utiliser les NFTs passés en prop pour lister les cartes de l'utilisateur
  const userCards = userNfts.map((nft: any) => ({
    nftAddress: nft.collectionAddress,
    tokenId: nft.tokenId,
    price: '',
    seller: userAddress,
    metadata: nft.metadata, // Assurez-vous que le metadata est présent
  }));

  const handlePriceChange = (nftAddress: string, tokenId: number, value: string) => {
    setSalePrices(prev => ({ ...prev, [`${nftAddress}-${tokenId}`]: value }));
  };

  return (
    <div className={styles.marketplace}>
      <h1>Marketplace</h1>

      <div className={styles.listingsSection}>
        <h2>Cartes Disponibles</h2>
        {loading ? (
          <p className={styles.loading}>Chargement de la marketplace...</p>
        ) : error ? (
          <p className={styles.error}>{error}</p>
        ) : listings.length === 0 ? (
          <p>Aucune carte listée pour le moment.</p>
        ) : (
          <div className={styles.nftsContainer}>
            {listings.map((listing, index) => (
              <div key={index} className={styles.nftCard}>
                <img
                  src={listing.metadata?.image || '/images/cards/basic.png'}
                  alt={`Card ${listing.tokenId}`}
                  className={styles.nftImage}
                  onError={(e) => { e.currentTarget.src = '/images/cards/basic.png'; }}
                />
                <p>Prix: {listing.price} ETH</p>
                <p>Vendeur: {listing.seller}</p>
                <button className={styles.buyButton} onClick={() => handleBuy(listing)}>Acheter</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.userCardsSection}>
        <h2>Vos Cartes</h2>
        {userCards.length === 0 ? (
          <p>Vous ne possédez aucune carte.</p>
        ) : (
          <div className={styles.nftsContainer}>
            {userCards.map((card, index) => (
              <div key={index} className={styles.nftCard}>
                <img
                  src={card.metadata?.image || '/images/cards/basic.png'}
                  alt={`Card ${card.tokenId}`}
                  className={styles.nftImage}
                  onError={(e) => { e.currentTarget.src = '/images/cards/basic.png'; }}
                />
                <p>Token ID: {card.tokenId}</p>
                <div className={styles.saleContainer}>
                  <input
                    type="text"
                    placeholder="Prix en ETH"
                    value={salePrices[`${card.nftAddress}-${card.tokenId}`] || ''}
                    onChange={(e) => handlePriceChange(card.nftAddress, card.tokenId, e.target.value)}
                    className={styles.priceInput}
                  />
                  <button
                    className={styles.listButton}
                    onClick={() => handleList(card.nftAddress, card.tokenId)}
                    disabled={!salePrices[`${card.nftAddress}-${card.tokenId}`]}
                  >
                    Mettre en Vente
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
