// src/App.tsx
import { useEffect, useMemo, useRef, useState } from 'react'

// Extend the Window interface to include the ethereum property
declare global {
  interface Window {
    ethereum: any;
  }
}
import styles from './css/App.module.css'
import * as ethereum from '@/lib/ethereum'
import * as main from '@/lib/main'
import { ethers } from 'ethers'
import collectionAbi from '@/abis/Collection.json'
import mainAbi from '@/abis/Main.json'
import axios from 'axios'
import HomePage from './components/HomePage';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar'
import AdminPage from './components/AdminPage'
import SetsPage from './components/SetsPage';
import SetsPageCards from './components/SetsPageCards'
import Booster from './components/Booster';
import Marketplace from './components/MarketPlace'; // Assurez-vous que le chemin est correct

interface CardAPI {
  _id: string;
  id: number;
  name: string;
  type: string;
  set: {
    _id: string;
    name: string;
    slug: string;
  };
  rarity: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Set {
  name: string;
  collectibleCount: number;
}

type Canceler = () => void

const useAffect = (
  asyncEffect: () => Promise<Canceler | void>,
  dependencies: any[] = []
) => {
  const cancelerRef = useRef<Canceler | void>()
  useEffect(() => {
    asyncEffect()
      .then(canceler => (cancelerRef.current = canceler))
      .catch(error => console.warn('Uncatched error', error))
    return () => {
      if (cancelerRef.current) {
        cancelerRef.current()
        cancelerRef.current = undefined
      }
    }
  }, dependencies)
}

const useWallet = () => {
  const [details, setDetails] = useState<ethereum.Details>()
  const [contract, setContract] = useState<main.Main>()

  useAffect(async () => {
    const details_ = await ethereum.connect('metamask')
    if (!details_) return
    setDetails(details_)
    const contract_ = await main.init(details_)
    if (!contract_) return
    setContract(contract_)
  }, [])

  return useMemo(() => {
    if (!details || !contract) return undefined
    return { details, contract }
  }, [details, contract])
}

export const App = () => {
  const wallet = useWallet()
  const [nfts, setNfts] = useState<any[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [collections, setCollections] = useState<any[]>([])
  const [balance, setBalance] = useState<string>('0')
  const [refreshData, setRefreshData] = useState(false)

  const [collectionsAPI, setCollectionsAPI] = useState<any[]>([])
  const [cardsAPI, setCardsAPI] = useState<CardAPI[]>([])
  const [loadingCount, setLoadingCount] = useState<number>(0);
  const stopLoading = () => setLoadingCount(prev => Math.max(prev - 1, 0));
  const [error, setError] = useState<string | null>(null);

  // Fonction pour récupérer et enregistrer le solde
  const fetchAndLogBalance = async (provider: ethers.providers.Provider, address: string) => {
    try {
      const balanceBN = await provider.getBalance(address)
      const balance = ethers.utils.formatEther(balanceBN)
      console.log(`Balance of ${address}: ${balance} ETH`)
      setBalance(balance)
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }

  const checkOwner = async () => {
    if (!wallet) return;
    const { details, contract } = wallet;
    const { account, provider } = details;
    try {
      const ownerAddress = await contract.owner();
      console.log("Owner address of Main contract:", ownerAddress);
      console.log("Connected account:", account);

      if (account) {
        setIsOwner(account.toLowerCase() === ownerAddress.toLowerCase());
      }
    } catch (error) {
      console.error("Error fetching owner:", error);
    }
  };

  async function fetchTokenMetadata(tokenURI: string): Promise<any | null> {
    try {
      return { image: tokenURI };
    } catch (error) {
      console.error(`Erreur lors de la récupération des métadonnées pour ${tokenURI}`, error);
      return null;
    }
  }
  
  // src/App.tsx

const fetchNFTs = async () => {
  if (!wallet) return;
  const { details, contract } = wallet;
  const { account, provider } = details;

  try {
    // 1. Vérification du réseau actif
    const network = await provider.getNetwork();
    if (network.chainId !== 31337) { // 31337 est le chainId par défaut pour Hardhat
      alert('Veuillez connecter votre portefeuille au réseau Hardhat Localhost (chainId: 31337).');
      
      // Tenter de changer le réseau automatiquement via Metamask
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x7A69' }], // 31337 en hexadécimal
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          // Si le réseau n'est pas ajouté, tenter de l'ajouter
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x7A69', // 31337
                chainName: 'Hardhat Localhost',
                rpcUrls: ['http://localhost:8545'],
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
              }],
            });
          } catch (addError) {
            console.error('Erreur lors de l\'ajout du réseau Hardhat à Metamask:', addError);
            alert('Veuillez ajouter manuellement le réseau Hardhat à Metamask.');
            return;
          }
        } else {
          console.error('Erreur lors du changement de réseau:', switchError);
          alert('Impossible de changer le réseau automatiquement. Veuillez le faire manuellement.');
          return;
        }
      }

      // Attendre quelques secondes pour que Metamask change de réseau
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // 2. Vérification des Adresses des Contrats
    // Assurez-vous que les adresses sont correctes. Utilisez des variables d'environnement.
    const MARKETPLACE_ADDRESS = '0x715d5Fe8c17D243683FE836a0738bE5e2f9854A0';
    if (!MARKETPLACE_ADDRESS) {
      console.error('Adresse du contrat Marketplace manquante dans les variables d\'environnement.');
      alert('Erreur de configuration: Adresse du contrat Marketplace manquante.');
      return;
    }

    // 3. Fetch des NFTs
    if (account) {
      await fetchAndLogBalance(provider, account);
    }

    await checkOwner();

    const collectionCountBN = await contract.getCollectionCount();
    const collectionCount = collectionCountBN.toNumber();

    console.log("Number of collections:", collectionCount);
    console.log("Fetching all NFTs...");
    const allNFTs = [];

    for (let i = 0; i < collectionCount; i++) {
      const [collectionName, collectionAddress, cardCount] = await contract.getCollectionInfo(i);
      console.log(`Collection ${i}: ${collectionName} at ${collectionAddress} with ${cardCount} cards`);

      // Vérifiez si l'adresse de la collection est correcte
      if (!ethers.utils.isAddress(collectionAddress)) {
        console.warn(`Adresse de collection invalide: ${collectionAddress}`);
        continue; // Passer à la collection suivante
      }

      const collectionContract = new ethers.Contract(collectionAddress.toString(), collectionAbi, provider);

      // Récupérer le nombre total de tokens dans cette collection
      let nextTokenId: number;
      try {
        const nextTokenIdBN = await collectionContract.nextTokenId();
        nextTokenId = nextTokenIdBN.toNumber();
        console.log(`Next Token ID for collection ${collectionName}: ${nextTokenId}`);
      } catch (error) {
        console.warn(`Erreur lors de la récupération de nextTokenId pour la collection ${collectionName}:`, error);
        continue; // Passer à la collection suivante
      }

      for (let tokenId = 0; tokenId < nextTokenId; tokenId++) {
        try {
          const ownerOf = await collectionContract.ownerOf(tokenId);
          console.log(`Token ID ${tokenId} owned by ${ownerOf}`);

          if (account && ownerOf.toLowerCase() === account.toLowerCase()) {
            const tokenURI = await collectionContract.tokenURI(tokenId);
            const metadata = { image: tokenURI };

            allNFTs.push({
              collectionId: i,
              collectionName,
              tokenId,
              metadata,
              collectionAddress, // Inclusion de l'adresse de la collection
            });

            console.log(`Le token ID ${tokenId} vous appartient dans la collection ${collectionName}.`);
          }
        } catch (error) {
          console.warn(`Erreur lors de la récupération du Token ID ${tokenId} dans la collection ${collectionName}:`, error);
        }
      }
    }

    console.log("NFTs fetched successfully.", allNFTs);
    setNfts(allNFTs);
  } catch (error) {
    console.error("Error fetching NFTs:", error);
  } finally {
    stopLoading();
  }
};



  const isValidAddress = (address: string) => {
    try {
      return ethers.utils.isAddress(address);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!wallet) return

    const { details, contract } = wallet
    const { account, provider } = details
    
    const fetchCollections = async () => {
      try {
        const collectionCountBN = await contract.getCollectionCount()
        const collectionCount = collectionCountBN.toNumber()

        const allCollections = []

        for (let i = 0; i < collectionCount; i++) {
          const [name, collectionAddress, cardCount] = await contract.getCollectionInfo(i)
          allCollections.push({ id: i, name, cardCount: cardCount.toNumber(), collectionAddress })
        }

        setCollections(allCollections)
      } catch (error) {
        console.error('Error fetching collections:', error)
      }
    }

    const fetchData = async () => {
      try {
        await Promise.all([fetchNFTs(), fetchCollections()]);
      } catch (err) {
        console.error(err);
        setError('Erreur lors du chargement des données.');
      }
    };

    fetchData().catch(console.error);

  }, [wallet, refreshData])

  // Fonction pour créer une nouvelle collection
  const createCollection = async (name: string, cardCount: number) => {
    if (!wallet) return
    const { contract } = wallet
    try {
      const gasEstimate = await contract.estimateGas.createCollection(name, cardCount, []);
      console.log('Gas estimate:', gasEstimate.toString());
      console.log('Creating collection with name:', name, 'and card count:', cardCount)
      const tx = await contract.createCollection(name, cardCount, [], {
        gasLimit: gasEstimate.mul(2), // Double le gas limit
      });
      console.log('Transaction sent:', tx.hash)
      await tx.wait()
      console.log('Transaction confirmed:', tx.hash)
      alert('Collection créée avec succès')

      // Rafraîchir les données
      setRefreshData(prev => !prev)

    } catch (error: any) {
      console.error('Erreur lors de la création de la collection :', error)
      let message = 'Erreur lors de la création de la collection.';
      if (error.code === 'CALL_EXCEPTION' && error.reason) {
        message += ` Raison: ${error.reason}`;
      } else if (error.data && error.data.message) {
        message += ` Raison: ${error.data.message}`;
      } else if (error.error && error.error.data && error.error.data.message) {
        message += ` Raison: ${error.error.data.message}`;
      }
      alert(message);
    }
  }

  const loading = loadingCount > 0;

  // Récupérer le signer depuis le provider du wallet
  const signer = wallet?.details.provider ? (wallet.details.provider as ethers.providers.Web3Provider).getSigner() : undefined;

  return (
    <div className={styles.appContainer}>
      {/* Sidebar */}
      <Sidebar isOwner={isOwner} />

      {/* Contenu Principal */}
      <div className={styles.mainContent}>
        {!wallet ? (
          <p>Connexion au portefeuille en cours...</p>
        ) : (
          <Routes>
            <Route
              path="/"
              element={<HomePage nfts={nfts} balance={balance} isOwner={isOwner} loading={loading} error={error} fetchNFTs={fetchNFTs}/>}
            />

            <Route
              path="/sets"
              element={<SetsPage />}
            />
            <Route
              path="/sets/:slug"
              element={<SetsPageCards />}
            />

            <Route
              path="/booster"
              element={<Booster />}
            />
            <Route
              path="/marketplace"
              element={
                <Marketplace 
                  userAddress={wallet.details.account || ''} 
                  userNfts={nfts} 
                  signer={signer} 
                  fetchNFTs={fetchNFTs} // Passage de la fonction fetchNFTs
                />
              } 
            />

            <Route
              path="/admin"
              element={
                isOwner ? (
                  <AdminPage createCollection={createCollection} />
                ) : (
                  <p>Accès refusé. Vous n'êtes pas le propriétaire.</p>
                )
              }
            />
          </Routes>
        )}
      </div>
    </div>
  )
}

export default App
