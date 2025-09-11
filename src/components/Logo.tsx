import React from 'react';
import styles from './Logo.module.css';

const Logo = () => {
  return (
    <div className={styles.logo}>
      <span className={styles.ortho}>Ortho</span>
      <span>Life</span>
    </div>
  );
};

export default Logo;
