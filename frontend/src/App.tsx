// src/App.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './css/App.module.css'
import * as ethereum from '@/lib/ethereum'
import * as main from '@/lib/main'
import { ethers, BigNumber } from 'ethers'
import collectionAbi from '@/abis/Collection.json'
import mainAbi from '@/abis/Main.json'
import axios from 'axios'
import Card from './components/Card'
import HomePage from './components/HomePage';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar'
import AdminPage from './components/AdminPage'
import SetsPage from './components/SetsPage';
import SetsPageCards from './components/SetsPageCards'


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
    if (!details || !contract) return
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
  //const [loading, setLoading] = useState<boolean>(true);
  const [loadingCount, setLoadingCount] = useState<number>(0);
  const stopLoading = () => setLoadingCount(prev => Math.max(prev - 1, 0));
  const [error, setError] = useState<string | null>(null);


  // Function to fetch and log balance
  const fetchAndLogBalance = async (provider: ethers.providers.Provider, address: string) => {
    try {
      const balanceBN = await provider.getBalance(address)
      const balance = ethers.utils.formatEther(balanceBN)
      console.log(`Balance of ${address}: ${balance} ETH`)
      setBalance(balance) // Met à jour l'état
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }

  const fetchNFTs = async () => {
    
    if (!wallet) return
    const { details, contract } = wallet
    const { account, provider } = details

    if (account) {
      await fetchAndLogBalance(provider, account)
    }
    
    const checkOwner = async () => {
      try {
        const ownerAddress = await contract.owner()
        console.log('Owner address of Main contract:', ownerAddress)
        console.log('Connected account:', account)

        //debug
        if (contract) {
          console.log('Contract functions:', Object.keys(contract.functions));
        }

        if (account) {
          setIsOwner(account.toLowerCase() === ownerAddress.toLowerCase())
        }
      } catch (error) {
        console.error('Error fetching owner:', error)
      }
    }

    await checkOwner()

    try {
      // Fetch the number of collections
      const collectionCountBN: BigNumber = await contract.getCollectionCount()
      const collectionCount = collectionCountBN.toNumber()

      console.log('Number of collections:', collectionCount)
      console.log('Fetching all NFTs...')
      const allNFTs = []

      for (let i = 0; i < collectionCount; i++) {
        const [collectionName, , collectionAddress] = await contract.getCollection(i)
        const collectionContract = new ethers.Contract(collectionAddress, collectionAbi, provider)

        // Fetch the total number of tokens minted in this collection
        const nextTokenIdBN: BigNumber = await collectionContract.nextTokenId()
        const nextTokenId = nextTokenIdBN.toNumber()

        // Iterate through all token IDs and check ownership
        for (let tokenId = 0; tokenId < nextTokenId; tokenId++) {
          try {
              console.log(`Fetching token ID ${tokenId} in collection ${collectionName}...`)
              const ownerOf = await collectionContract.ownerOf(tokenId)
              var tokenURI = '';
              if (account && ownerOf.toLowerCase() === account.toLowerCase()) {
                tokenURI = await collectionContract.tokenURI(tokenId)
              }
              // Fetch metadata from tokenURI
              const response = await fetch(tokenURI)
              const metadata = await response.json()
              console.log('Metadata:', metadata)
              console.log('Image:', metadata.image)
              allNFTs.push({
                collectionId: i,
                collectionName,
                tokenId,
                metadata,
              })
            
              if (!account) return;
              // Afficher si le token appartient à l'utilisateur connecté
              if (ownerOf.toLowerCase() === account.toLowerCase()) {
                console.log(`Le token ID ${tokenId} vous appartient.`)
              } else {
                console.log(`Le token ID ${tokenId} appartient à l'adresse ${ownerOf}.`)
              }
          } catch (error) {
            // Handle cases where the token might not exist or other errors
            console.warn(`Erreur lors de la récupération du Token ID ${tokenId} dans la collection ${collectionName}:`, error)
          }
        }
      }

      console.log('nfts fetched nice');
      setNfts(allNFTs)
    } catch (error) {
      console.error('Error fetching NFTs:', error)
    } finally {
      stopLoading();
    }
  }

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
          const [name, cardCount, collectionAddress] = await contract.getCollection(i)
          allCollections.push({ id: i, name, cardCount: cardCount.toNumber(), collectionAddress })
        }

        setCollections(allCollections)
      } catch (error) {
        console.error('Error fetching collections:', error)
      }
    }

    const fetchCards = async () => {
      try {
        const response = await axios.get('http://localhost:5000/hearthstone/cards');
        setCardsAPI(response.data.cards);
        console.log('Cards fetched:', response.data.cards);
        //setLoading(false);
      } catch (err: any) {
        console.error('Error fetching cards:', err);
        setError(err.response?.data?.message || 'Error fetching cards');
        //setLoading(false);
      }
    }

    const fetchData = async () => {
      try {
        await Promise.all([fetchNFTs(), fetchCollections()]);
        //await createCollectionsAPI();
        //setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Erreur lors du chargement des données.');
        //setLoading(false);
      }
    };

    fetchData().catch(console.error);

  }, [wallet, refreshData])

  // Function to create a new collection
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

      // refresh les données
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
    alert('Erreur lors de la création de la collection.')
    }
  }

  const [imageFile, setImageFile] = useState<File | null>(null)

  // Function to mint a card for a user
  const mintCard = async (collectionId: number, toAddress: string, cardName: string) => {
    if (!wallet) {
      alert('Wallet not connected.');
      return;
    }
    if (!isValidAddress(toAddress)) {
      alert('Invalid recipient address.');
      return;
    }
  
    const { contract } = wallet;
  
    try {
      // Récupérer les métadonnées de la carte depuis l'API via le nom
      const response = await axios.get(`http://localhost:5000/hearthstone/cards/name/${encodeURIComponent(cardName)}`);
      const card = response.data.card;
  
      if (!card) {
        alert('Carte non trouvée dans la base de données.');
        return;
      }
  
      // Construire le metadataURI en utilisant l'API existante
      const metadataURI = `http://localhost:5000/hearthstone/cards/${card.id}`;
  
      // Mint la carte en utilisant le metadataURI
      const tx = await contract.mintCard(collectionId, toAddress, card.id, card.name, metadataURI);
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);
      alert('Card minted successfully');
  
      // Rafraîchir les données
      setRefreshData((prev) => !prev);
      await fetchNFTs();
    } catch (error: any) {
      console.error('Error minting card:', error);
      alert('Error minting card.');
    }
  };

  const loading = loadingCount > 0;

  const createCollectionsAPI = async () => {
    try {
      const response = await axios.get('http://localhost:5000/hearthstone/sets')
      const apiSets: Set[] = response.data.sets

      // Récupérer les collections existantes sur la blockchain
      const existingCollections = collections.map(col => col.name.toLowerCase())

      // Filtrer les sets qui n'ont pas encore été créés comme collections
      const setsToCreate = apiSets.filter(set => !existingCollections.includes(set.name.toLowerCase()))

      // Créer les collections manquantes
      for (const set of setsToCreate) {
        await createCollection(set.name, set.collectibleCount)
      }

      if (setsToCreate.length === 0) {
        console.log('Toutes les collections de l\'API sont déjà créées sur la blockchain')
      } else {
        console.log(`Créé ${setsToCreate.length} nouvelles collections depuis l'API`)
      }
      
    } catch (error: any) {
      console.error('Error synchronizing collections with API:', error)
      setError('Erreur lors de la synchronisation des collections avec l\'API.')
    }
  }

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
              element={<HomePage nfts={nfts} balance={balance} isOwner={isOwner} loading={loading} error={error} />}
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
              path="/admin"
              element={
                isOwner ? (
                  <AdminPage createCollection={createCollection} mintCard={mintCard} />
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
