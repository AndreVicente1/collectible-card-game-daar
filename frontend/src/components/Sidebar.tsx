import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from '../css/Sidebar.module.css';

interface SidebarProps {
  isOwner: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOwner }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button className={styles.toggleButton} onClick={toggleSidebar}>
        ☰
      </button>
      <div className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <h2>TCG Dashboard</h2>
        <nav>
          <ul>
            <li><Link to="/" onClick={closeSidebar}>Accueil</Link></li>
            <li><Link to="/sets" onClick={closeSidebar}>Tous les Sets</Link></li>
            <li><Link to="/booster" onClick={closeSidebar}>Boosters</Link></li>
            <li><Link to="/marketplace" onClick={closeSidebar}>Marketplace</Link></li>
            {isOwner && (
              <li><Link to="/admin" onClick={closeSidebar}>Admin</Link></li>
            )}
          </ul>
        </nav>
      </div>
      <div className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`} onClick={closeSidebar}></div>
    </>
  );
};

export default Sidebar;