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

  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSets = async () => {
      try {
        const response = await axios.get('http://localhost:5000/hearthstone/sets');
        setSets(response.data.sets);

        handleSyncCollections();
      } catch (err: any) {
        console.error('Error fetching sets:', err);
        setError('Erreur lors de la récupération des sets.');
      } finally {
        setLoading(false);
      }
    };

    fetchSets();
  }, []);

  const handleSyncCollections = async () => {
    setSyncing(true);
    setSyncSuccess(false);
    setSyncError(null);

    try {

      const response = await axios.post('http://localhost:5000/hearthstone/create-collections');

      console.log(response.data);
      setSyncSuccess(true);
    } catch (err: any) {
      console.error('Erreur lors de la synchronisation:', err);
      setSyncError('Erreur lors de la synchronisation avec la blockchain');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="loading">Chargement des sets...</div>;
  }

  if (error) {
    return <div className="error">Erreur: {error}</div>;
  }

  return (
    <div className={styles.setsPage}>
      <h2>Tous les Sets</h2>

      <div className={styles.syncContainer}>
        <button
          className={styles.syncButton}
          onClick={handleSyncCollections}
          disabled={syncing}
        >
          {syncing ? 'Synchronisation en cours...' : 'Synchroniser avec la Blockchain'}
        </button>
        {syncSuccess && <p className={styles.successMessage}>Synchronisation réussie !</p>}
        {syncError && <p className={styles.errorMessage}>{syncError}</p>}
      </div>
      
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