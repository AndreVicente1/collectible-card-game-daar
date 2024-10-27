import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import styles from '../css/Marketplace.module.css';

interface Listing {
  nftAddress: string;
  tokenId: number;
  price: string; // Prix en Wei
  seller: string;
  metadata?: {
    name: string;
    image: string;
    [key: string]: any;
  };
}

interface MarketplaceProps {
  userAddress: string;
  userNfts: any[];
  signer?: ethers.providers.JsonRpcSigner;
  fetchNFTs: () => Promise<void>;
}

const ERC721_ABI = [
  "function getApproved(uint256 tokenId) view returns (address)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function setApprovalForAll(address operator, bool _approved) external",
];

const MARKETPLACE_ADDRESS = '0x3B2268EbC246d3386Cfd831E864F66081561538C';

// Fonction de validation pour vérifier si une chaîne est un nombre entier valide (Wei)
const isValidWei = (value: string) => {
  return /^\d+$/.test(value);
};

const Marketplace: React.FC<MarketplaceProps> = ({ userAddress, userNfts, signer, fetchNFTs }) => {
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
              console.log('[DEBUG] listing:', listing);
              console.log('1 [DEBUG] [DEBUG] [DEBUG] [DEBUG] [DEBUG] [DEBUG] [DEBUG] [DEBUG] [DEBUG] [DEBUG] [DEBUG] ');
              const metadataResponse = await axios.get(`http://localhost:5000/hearthstone/metadata/${listing.nftAddress}/${listing.tokenId}`);
              console.log('2 [DEBUG] [DEBUG] [DEBUG] [DEBUG] [DEBUG] [DEBUG] [DEBUG] [DEBUG] [DEBUG] [DEBUG] [DEBUG] ');
              console.log('[DEBUG] listing price:', listing.price);
              // Valider et convertir le prix
              let priceInWei: string;
              if (isValidWei(listing.price)) {
                priceInWei = listing.price;
              } else {
                priceInWei = ethers.utils.parseEther(listing.price).toString(); // Conversion en Wei
              }
              console.log('[DEBUG] priceInWei:', priceInWei);
              return {
                ...listing,
                price: priceInWei,
                metadata: metadataResponse.data.metadata,
              };
            } catch (metadataError) {
              console.error(`Erreur lors de la récupération des métadonnées pour ${listing.tokenId}:`, metadataError);
              return {
                ...listing,
                price: isValidWei(listing.price) ? listing.price : ethers.utils.parseEther("0").toString(), // Valeur par défaut en Wei
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
      // Rafraîchir les NFTs de l'utilisateur
      await fetchNFTs();
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
  
    console.log('Listing NFT:', { nftAddress, tokenId, price });

    if (!signer) {
      alert('Signer non disponible. Veuillez vous reconnecter.');
      return;
    }

    try {
      const nftContract = new ethers.Contract(nftAddress, ERC721_ABI, signer);

      // Vérifier si le Marketplace est déjà approuvé pour ce token spécifique
      const approvedAddress = await nftContract.getApproved(tokenId);
      const isApprovedForAll = await nftContract.isApprovedForAll(userAddress, MARKETPLACE_ADDRESS);

      if (approvedAddress.toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase() && !isApprovedForAll) {
        // Demander l'approbation pour tous les tokens
        const approvalTx = await nftContract.setApprovalForAll(MARKETPLACE_ADDRESS, true);
        alert('Transaction d\'approbation envoyée. En attente de confirmation...');
        await approvalTx.wait();
        alert('Marketplace approuvé pour gérer vos NFTs.');
      }

      // Convertir le prix en Wei ici
      const priceInWei = ethers.utils.parseEther(price); // Convertir en Wei

      // Envoyer la requête de listing au backend
      const listResponse = await axios.post('http://localhost:5000/hearthstone/list', {
        nftAddress,
        tokenId,
        price: priceInWei.toString(), // Envoyer le prix en Wei
      });

      alert('Carte listée avec succès! Transaction Hash: ' + listResponse.data.transactionHash);
      
      // Ajouter le listing avec le prix en Wei
      setListings([...listings, { nftAddress, tokenId, price: priceInWei.toString(), seller: userAddress }]);
      
      // Réinitialiser le prix
      setSalePrices(prev => ({ ...prev, [`${nftAddress}-${tokenId}`]: '' }));
      // Rafraîchir les NFTs de l'utilisateur
      await fetchNFTs();
    } catch (err: any) {
      console.error('Erreur lors de la liste:', err);
      if (err.response && err.response.data && err.response.data.error) {
        alert(`Erreur lors de la liste de la carte: ${err.response.data.error}`);
      } else if (err.code === 'ACTION_REJECTED') {
        alert('Transaction rejetée par l\'utilisateur.');
      } else {
        alert('Erreur lors de la liste de la carte.');
      }
    }
  };

  const userCards = userNfts.map((nft: any) => {
    console.log('Mapping NFT:', nft); // Ajout de log pour débogage
    return {
      nftAddress: nft.collectionAddress, // Utilisation de collectionAddress
      tokenId: nft.tokenId,
      price: '',
      seller: userAddress,
      metadata: nft.metadata, 
    };
  });
  console.log('User Cards:', userCards);

  const handlePriceChange = (nftAddress: string, tokenId: number, value: string) => {
    setSalePrices(prev => ({ ...prev, [`${nftAddress}-${tokenId}`]: value }));
  };

  // Fonction pour rafraîchir les listings et les NFTs
  const handleFetchNFTs = async () => {
    setLoading(true);
    setError(null);
    await fetchNFTs();
    setLoading(false);
  };

  return (
    <div className={styles.marketplace}>
      <h1>Marketplace</h1>

      {/* Bouton pour rafraîchir les NFTs */}
      <div className={styles.fetchButtonContainer}>
        <button className={styles.fetchButton} onClick={handleFetchNFTs}>
          Rafraîchir Mes NFTs
        </button>
      </div>

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
                <p>Prix: {ethers.utils.formatEther(listing.price)} ETH</p>
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
