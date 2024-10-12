import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './styles.module.css'
import * as ethereum from '@/lib/ethereum'
import * as main from '@/lib/main'
import { ethers, BigNumber, Contract } from 'ethers';
import collectionAbi from '@/abis/Collection.json';
import mainAbi from '@/abis/Main.json';

type Canceler = () => void
console.log('test');
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
  console.log('test');
  const [details, setDetails] = useState<ethereum.Details>()
  const [contract, setContract] = useState<ethers.Contract>()
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
  console.log('test');
  const wallet = useWallet();
  const [nfts, setNfts] = useState<any[]>([]);
  // owner du contrat
  const [isOwner, setIsOwner] = useState(false);

  // admins
  const [isAdmin, setIsAdmin] = useState(false);

  // maj des collections
  const [collections, setCollections] = useState<any[]>([]);

  useEffect(() => {
    if (!wallet) return;

    const fetchNFTs = async () => {
      const { details, contract } = wallet;
      const { account, signer } = details;

      const checkOwner = async () => {
        const { details, contract } = wallet;
        const ownerAddress = await contract.owner();
    
        console.log('Owner address of Main contract:', ownerAddress);
        console.log('Connected account:', details.account);
    
        if (details.account) {
            setIsOwner(details.account.toLowerCase() === ownerAddress.toLowerCase());
        }
    };
    

      checkOwner().catch(console.error);

      // Récupérer le nombre de collections
      const collectionCountBN: BigNumber = await contract.getCollectionCount();
      const collectionCount = collectionCountBN.toNumber();

      const allNFTs = [];

      for (let i = 0; i < collectionCount; i++) {
        const [collectionName, , collectionAddress] = await contract.getCollection(i);
        const collectionContract = new ethers.Contract(collectionAddress, collectionAbi, signer);

        // Récupérer le nombre de tokens que l'utilisateur possède dans cette collection
        const balanceBN: BigNumber = await collectionContract.balanceOf(account);
        const balance = balanceBN.toNumber();

        // Récupérer les token IDs et les métadonnées
        for (let j = 0; j < balance; j++) {
          const tokenIdBN: BigNumber = await collectionContract.tokenOfOwnerByIndex(account, j);
          const tokenId = tokenIdBN.toNumber();

          const tokenURI = await collectionContract.tokenURI(tokenId);

          // Récupérer les métadonnées depuis le tokenURI
          const response = await fetch(tokenURI);
          const metadata = await response.json();

          allNFTs.push({
            collectionName,
            tokenId,
            metadata,
          });
        }
      }

      setNfts(allNFTs);
    };

    fetchNFTs().catch(console.error);
    
    const fetchCollections = async () => {
      const { contract } = wallet;
      const collectionCountBN = await contract.getCollectionCount();
      const collectionCount = collectionCountBN.toNumber();
  
      const allCollections = [];
  
      for (let i = 0; i < collectionCount; i++) {
        const [name, cardCount, collectionAddress] = await contract.getCollection(i);
        allCollections.push({ id: i, name, cardCount: cardCount.toNumber(), collectionAddress });
      }
  
      setCollections(allCollections);
    };
  
    fetchCollections().catch(console.error);
    
    }, [wallet]);

    // Fonction pour créer une nouvelle collection
    const createCollection = async (name: string, cardCount: number) => {
    if (!wallet) return;
    const { contract } = wallet;
    try {
      console.log('Creating collection with name:', name, 'and card count:', cardCount);
      const tx = await contract.createCollection(name, cardCount);
      console.log('Transaction sent:', tx.hash);
      await tx.wait();
      console.log('Transaction confirmed:', tx.hash);
      alert('Collection créée avec succès');
    } catch (error) {
      console.error('Erreur lors de la création de la collection :', error);
      alert('Erreur lors de la création de la collection.');
    }
  };

  // Fonction pour minter une carte pour un utilisateur
  const mintCard = async (collectionId: number, toAddress: string, cardNumber: number, imgURI: string) => {
    if (!wallet) return;
    const { contract } = wallet;
    try {
      const tx = await contract.mintCard(collectionId, toAddress, cardNumber, imgURI);
      await tx.wait();
      alert('Card minted successfully');
    } catch (error) {
      console.error('Error minting card:', error);
    }
  };

  const [collectionName, setCollectionName] = useState('');
  const [cardCount, setCardCount] = useState(0);

  const [collectionId, setCollectionId] = useState(0);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [cardNumber, setCardNumber] = useState(0);
  const [imgURI, setImgURI] = useState('');

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
                {col.name} - {col.cardCount} cards - Address: {col.collectionAddress}
              </li>
            ))}
          </ul>
        </div>
        
      )}
      
      {wallet && isOwner && (
        <>
          <div>

            <h2>Create a New Collection</h2>
            <input
              type="text"
              placeholder="Collection Name"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)} />
            <input
              type="number"
              placeholder="Card Count"
              value={cardCount}
              onChange={(e) => setCardCount(Number(e.target.value))} />
            <button onClick={() => createCollection(collectionName, cardCount)}>Create Collection</button>
          </div><div>
              <h2>Mint a New Card</h2>
              <input
                type="number"
                name= "Collection ID"
                placeholder="Collection ID"
                value={collectionId}
                onChange={(e) => setCollectionId(Number(e.target.value))} />
              <input
                type="text"
                placeholder="Recipient Address"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)} />
              <input
                type="number"
                name = "Card Number"
                placeholder="Card Number"
                value={cardNumber}
                onChange={(e) => setCardNumber(Number(e.target.value))} />
              <input
                type="text"
                placeholder="Image URI"
                value={imgURI}
                onChange={(e) => setImgURI(e.target.value)} />
              <button onClick={() => mintCard(collectionId, recipientAddress, cardNumber, imgURI)}>Mint Card</button>
            </div></>
        )}
    </div>
  );
};