import React, { useEffect, useState } from 'react';
import axios from 'axios';
import styles from '../css/SetsPage.module.css';
import { Link } from 'react-router-dom';
import setImages from '../utils/setImages';

interface Set {
  id: number;
  name: string;
  slug: string;
  image: string; // URL
}

const SetsPage: React.FC = () => {
  const [sets, setSets] = useState<Set[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSets = async () => {
      try {
        const response = await axios.get('http://localhost:5000/hearthstone/sets');
        setSets(response.data.sets);
      } catch (err: any) {
        console.error('Error fetching sets:', err);
        setError('Erreur lors de la récupération des sets.');
      } finally {
        setLoading(false);
      }
    };

    fetchSets();
  }, []);

  if (loading) {
    return <div className="loading">Chargement des sets...</div>;
  }

  if (error) {
    return <div className="error">Erreur: {error}</div>;
  }

  return (
    <div className={styles.setsPage}>
      <h2>Tous les Sets</h2>
      {sets.length === 0 ? (
        <p>Aucun set trouvé.</p>
      ) : (
        <div className={styles.setsGrid}>
          {sets.map((set) => (
            <Link className={styles.setLink} to={`/sets/${encodeURIComponent(set.slug)}`}>
              <div className={styles.setCard}>
                <img
                  src={setImages[set.name] || '/images/sets/classic.png'}
                  alt={set.name}
                  className={styles.setImage}
                />
                <p>{set.name}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default SetsPage;