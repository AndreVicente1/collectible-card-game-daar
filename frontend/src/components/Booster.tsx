import React, { useEffect, useState } from 'react';
import styles from '../css/Boosters.module.css';
import BoosterABI from '../abis/Booster.json';
import { ethers } from 'ethers';
import setImagesBoosters from '@/utils/setImagesBoosters';
import BoosterModal from './BoosterModal';
import axios from 'axios';

interface BoosterType {
    name: string;
    boosterTypeId: number;
}

interface Card {
    cardNumber: number;
    cardName: string;
    metadataURI: string;
}

const Boosters: React.FC = () => {
    const [boosterTypes, setBoosterTypes] = useState<BoosterType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCards, setSelectedCards] = useState<Card[] | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [buyingBooster, setBuyingBooster] = useState<boolean>(false);

    useEffect(() => {
        const fetchBoosterSets = async () => {
          try {
            const response = await axios.get(`http://localhost:5000/hearthstone/boosters`);
            console.log('Boosters récupérés:', response.data.boosters);
            setBoosterTypes(response.data.boosters);
          } catch (err) {
            console.error('Erreur lors de la récupération des boosters:', err);
            setError('Impossible de charger les boosters.');
          } finally {
            setLoading(false);
          }
        };
    
        fetchBoosterSets();
    }, []);

    const handleBuyBooster = async (boosterName: string, boosterTypeId: number) => {
        setBuyingBooster(true);
        console.log("BoosterName passed:", boosterName, "BoosterTypeId passed:", boosterTypeId);
        try {
            // Envoyer une requête POST pour acheter et ouvrir le booster
            const response = await axios.post(`http://localhost:5000/hearthstone/boosters/buyAndRedeem`, { boosterName, boosterTypeId });
    
            console.log('Réponse de l\'achat du booster:', response.data);
            console.log('Cartes obtenues:', response.data.cards);
    
            if (response.data.success) {
                setSelectedCards(response.data.cards);
                setIsModalOpen(true);
            } else {
                setError(response.data.message || 'Erreur lors de l\'achat du booster.');
            }
        } catch (err) {
            console.error('Erreur lors de l\'achat du booster:', err);
            setError('Erreur lors de l\'achat du booster.');
        } finally {
            setBuyingBooster(false);
        }
    };

    const getImagePath = (name: string) => {
        return setImagesBoosters[name] || '/images/boosters/classic.png';
    };

    return (
        <div className={styles.boostersPage}>
          <h1>Boosters Disponibles</h1>
          {loading ? (
            <p>Chargement des boosters...</p>
          ) : error ? (
            <p className={styles.error}>{error}</p>
          ) : (
            <div className={styles.boostersContainer}>
              {boosterTypes.map((booster) => (
                <div key={booster.boosterTypeId} className={styles.boosterCard}>
                  <img
                    src={getImagePath(booster.name)}
                    alt={`Booster Set ${booster.name}`}
                    className={styles.boosterImage}
                  />
                  <h3>{booster.name}</h3>
                  <button
                    onClick={() => handleBuyBooster(booster.name, booster.boosterTypeId)}
                    className={styles.buyButton}
                  >
                    {buyingBooster ? 'Achat en cours...' : 'Acheter pour 0.05 ETH'}
                  </button>
                </div>
              ))}
            </div>
          )}
    
          {isModalOpen && selectedCards && (
            <BoosterModal cards={selectedCards} onClose={() => setIsModalOpen(false)} />
          )}
        </div>
    );
};

export default Boosters;