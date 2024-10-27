import React, { useEffect, useState } from 'react';
import axios from 'axios';
import styles from '../css/SetsPageCards.module.css';
import { useParams, Link } from 'react-router-dom';
import setImages from '../utils/setImages';

// Composant pour afficher les cartes d'un set

interface Card {
  id: number;
  name: string;
  type: string;
  rarity: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface Set {
  id: number;
  name: string;
  slug: string;
  image: string;
}

const SetsPageCards: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [set, setSet] = useState<Set | null>(null);
    const [cards, setCards] = useState<Card[]>([]);
    const [page, setPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const limit = 30; // Nombre de cartes par page

    console.log('Set slug param:', slug);  
  
    useEffect(() => {
      const fetchSetDetails = async () => {
        try {
            const response = await axios.get(`http://localhost:5000/hearthstone/sets/slug/${encodeURIComponent(slug!)}/cards`, {
            params: { page, limit },
          });
          setSet(response.data.set);
          setCards(response.data.cards);
          setTotalPages(response.data.totalPages);
        } catch (err: any) {
          console.error('Error fetching set details:', err);
          setError('Erreur lors de la récupération des détails du set.');
        } finally {
          setLoading(false);
        }
      };
  
      fetchSetDetails();
    }, [slug, page]);
  
    const handlePrevPage = () => {
        if (page > 1) setPage(page - 1);
    };

    const handleNextPage = () => {
        if (page < totalPages) setPage(page + 1);
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.src = '/images/cards/basic.png';
    };

    if (loading) {
      return <div className="loading">Chargement des détails du set...</div>;
    }
  
    if (error) {
      return <div className="error">Erreur: {error}</div>;
    }
  
    if (!set) {
      return <div className="error">Set non trouvé.</div>;
    }
    
    return (
        <div className={styles.setsPageCards}>
        <Link to="/sets" className={styles.backLink}>
          &larr; Retour aux Sets
        </Link>
        <h2>{set.name}</h2>
        <img
          src={setImages[set.name] || '/images/sets/classic.png'}
          alt={set.name}
          className={styles.setDetailImage}
        />
  
        <h3>Cartes du Set</h3>
        {cards.length === 0 ? (
          <p>Aucune carte trouvée dans ce set.</p>
        ) : (
          <div>
            <div className={styles.cardsGrid}>
            {cards.map((card) => {
                // Fonction pour attribuer la couleur en fonction de la rareté
                const getRarityColor = (rarity : string) => {
                switch (rarity) {
                    case 'COMMON':
                    return 'white';
                    case 'RARE':
                    return 'blue';
                    case 'EPIC':
                    return 'purple';
                    case 'LEGENDARY':
                    return 'orange';
                    default:
                    return 'white';
                }
                };

                return (
                <div key={card.id} className={styles.card}>
                    <img
                    src={card.image}
                    alt={card.name}
                    className={styles.cardImage}
                    loading="lazy"
                    onError={handleImageError}
                    />
                    {/* Le titre change de couleur en fonction de la rareté */}
                    <h4 style={{ color: getRarityColor(card.rarity) }}>{card.name}</h4>
                    <p>Type: {card.type}</p>
                    <p>Rareté: {card.rarity}</p>

                    {/* Gérer les balises <b> dans la description */}
                    <p dangerouslySetInnerHTML={{ __html: card.description }}></p>
                </div>
                );
            })}
            </div>
            <div className={styles.pagination}>
              <button onClick={handlePrevPage} disabled={page === 1}>
                Précédent
              </button>
              <span>Page {page} sur {totalPages}</span>
              <button onClick={handleNextPage} disabled={page === totalPages}>
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  export default SetsPageCards;