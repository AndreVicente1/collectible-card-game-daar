// src/App.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './styles.module.css'
import * as ethereum from '@/lib/ethereum'
import * as main from '@/lib/main'
import { ethers, BigNumber } from 'ethers'
import collectionAbi from '@/abis/Collection.json'
import mainAbi from '@/abis/Main.json'
import axios from 'axios'
import Card from './components/Card'
import './css/App.css'
import React from 'react'


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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);


  // Function to fetch and log balance
  const fetchAndLogBalance = async (provider: ethers.providers.Provider, address: string) => {
    try {
      const balanceBN = await provider.getBalance(address)
      const balance = ethers.utils.formatEther(balanceBN)
      console.log(`Balance of ${address}: ${balance} ETH`)
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

      setNfts(allNFTs)
    } catch (error) {
      console.error('Error fetching NFTs:', error)
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

    const fetchAndLogBalance = async (provider: ethers.providers.Provider, address: string) => {
      try {
        const balanceBN = await provider.getBalance(address)
        const balance = ethers.utils.formatEther(balanceBN)
        console.log(`Balance of ${address}: ${balance} ETH`)
        setBalance(balance) // Update state
      } catch (error) {
        console.error('Error fetching balance:', error)
      }
    }
    
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
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching cards:', err);
        setError(err.response?.data?.message || 'Error fetching cards');
        setLoading(false);
      }
    }

    fetchCards().catch(console.error);

    fetchNFTs().catch(console.error)
    fetchCollections().catch(console.error)
  }, [wallet, refreshData])

  if (loading) {
    return <div className="loading">Chargement des cartes...</div>;
  }

  if (error) {
    return <div className="error">Erreur: {error}</div>;
  }

  // Function to create a new collection
  const createCollection = async (name: string, cardCount: number) => {
    if (!wallet) return
    const { contract } = wallet
    try {
      const gasEstimate = await contract.estimateGas.createCollection(name, cardCount);
      console.log('Gas estimate:', gasEstimate.toString());
      console.log('Creating collection with name:', name, 'and card count:', cardCount)
      const tx = await contract.createCollection(name, cardCount, {
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
  const mintCard = async (collectionId: number, toAddress: string, cardNumber: number) => {
    if (!wallet) {
      alert('Wallet not connected.');
      return;
    }
    if (!isValidAddress(toAddress)) {
      alert('Invalid recipient address.');
      return;
    }
    if (!imageFile) {
      alert('Please upload an image.');
      return;
    }
    
    const { contract } = wallet;

    try {
      // Step 1: Upload the image and get metadata URI
      const formData = new FormData();
      formData.append('image', imageFile);

      const uploadResponse = await axios.post('http://localhost:5000/images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { metadataURI } = uploadResponse.data;
      console.log('Metadata URI:', metadataURI);

      // Step 2: Fetch metadata to get image URI from the metadata
      const metadataResponse = await axios.get(metadataURI);
      const imageURI = metadataResponse.data.image;
      console.log('Image URI:', imageURI);

      // Step 3: Mint the card using the imageURI
      const tx = await contract.mintCard(collectionId, toAddress, cardNumber, imageURI);
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);
      alert('Card minted successfully');
      
      setRefreshData(prev => !prev);
      await fetchNFTs();
    } catch (error) {
      console.error('Error minting card:', error);
      alert('Error minting card.');
    }
  };

  const [collectionName, setCollectionName] = useState('')
  const [cardCount, setCardCount] = useState(0)

  const [collectionId, setCollectionId] = useState(0)
  const [recipientAddress, setRecipientAddress] = useState('')
  const [cardNumber, setCardNumber] = useState(0)

  return (
    <div className={styles.body}>
      <h1>Bienvenue dans votre TCG</h1>
      {!wallet ? (
        <p>Connexion au portefeuille en cours...</p>
      ) : (
        <div>
          <h2>Vos NFTs</h2>
          <div className={styles.grid}>
            {nfts.map((nft, index) => (
              <div key={index} className={styles.cell}>
                <h3>{nft.collectionName}</h3>
                <p>ID du Token: {nft.tokenId}</p>
                {nft.metadata.image && (
                  <img src={nft.metadata.image} alt={nft.metadata.name} />
                )}
                <p>{nft.metadata.name}</p>
              </div>
            ))}
          </div>

          <h2>All Collections</h2>
          <ul>
            {collections.map((col) => (
              <li key={col.id}>
                {col.name} - {col.cardCount} cards - ID: {col.id} - Address: {col.collectionAddress}
              </li>
            ))}
          </ul>

          <div className="app">
            <h1>Liste des Cartes Hearthstone</h1>
            <div className="cards-container">
              {cardsAPI.map((card) => (
                <Card key={card.id} card={card} />
              ))}
            </div>
          </div>

        </div>
        
      )}
      

      {wallet && isOwner && (
        <>
          <div>
            <h2>Wallet Balance</h2>
            <p>{balance} ETH</p>
            <h2>Create a New Collection</h2>
            <input
              type="text"
              placeholder="Collection Name"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
            />
            <input
              type="number"
              placeholder="Card Count"
              value={cardCount}
              onChange={(e) => setCardCount(Number(e.target.value))}
            />
            <button onClick={() => createCollection(collectionName, cardCount)}>Create Collection</button>
          </div>
          <div>
                <h2>Mint a New Card</h2>
                <input
                  type="number"
                  placeholder="Collection ID"
                  value={collectionId}
                  onChange={(e) => setCollectionId(Number(e.target.value))}
                />
                <input
                  type="text"
                  placeholder="User Address"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Card Number"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(Number(e.target.value))}
                />
                {/* File input for image upload */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
                />
                <button onClick={() => mintCard(collectionId, recipientAddress, cardNumber)}>
                  Mint Card
                </button>
              </div>
        </>
      )}
    </div>
  )
}
