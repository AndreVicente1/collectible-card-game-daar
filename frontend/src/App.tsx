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
import Booster from './components/Booster';
import Marketplace from './components/MarketPlace'

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
  
  const fetchNFTs = async () => {
    if (!wallet) return;
    const { details, contract } = wallet;
    const { account, provider } = details;
  
    if (account) {
      await fetchAndLogBalance(provider, account);
    }
  
    await checkOwner();
  
    try {
      const collectionCountBN = await contract.getCollectionCount();
      const collectionCount = collectionCountBN.toNumber();
  
      console.log("Number of collections:", collectionCount);
      console.log("Fetching all NFTs...");
      const allNFTs = [];
  
      for (let i = 0; i < collectionCount; i++) {
        const [collectionName, cardCount] = await contract.getCollectionInfo(i);

        const nextTokenIdBN = await contract.getTokensInCollection(i);
        const nextTokenId = nextTokenIdBN.toNumber();
  
        for (let tokenId = 0; tokenId < nextTokenId; tokenId++) {
          try {
            const { owner, tokenURI } = await contract.getTokenInfo(i, tokenId);
  
            if (account && owner.toLowerCase() === account.toLowerCase()) {
              allNFTs.push({
                collectionId: i,
                collectionName,
                tokenId,
                metadata: { image: tokenURI },
              });
  
              console.log(`Le token ID ${tokenId} vous appartient dans la collection ${collectionName}.`);
            }
          } catch (error) {
            console.warn(`Erreur lors de la récupération du Token ID ${tokenId} dans la collection ${collectionName}:`, error);
          }
        }
      }
  
      console.log("NFTs fetched successfully.");
      setNfts(allNFTs);
    } catch (error) {
      console.error("Error fetching NFTs:", error);
    } finally {
      stopLoading();
    }
  };


  useEffect(() => {
    if (!wallet) return

    const { details, contract } = wallet
    
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

  const loading = loadingCount > 0;

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
              element={<HomePage nfts={nfts} balance={balance} isOwner={isOwner} loading={loading} error={error} fetchNFTs={fetchNFTs} refreshData={refreshData} setRefreshData={setRefreshData}/>}
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
              element={<Booster wallet={wallet} /> }
            />
            <Route
              path="/marketplace"
              element={<Marketplace userAddress={wallet?.details.account || ''} userNfts={nfts} />} 
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
