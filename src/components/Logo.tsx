import React from 'react';
import styles from './Logo.module.css';

interface LogoProps {
  lineColor?: string;
}

const Logo: React.FC<LogoProps> = ({ lineColor = 'white' }) => {
  return (
    <div className={styles.logo}>
      <span className={styles.ortho}>
        Ortho
        <span className={styles.line} style={{ backgroundColor: lineColor }}></span>
      </span>
      <span>Life</span>
    </div>
  );
};

export default Logo;
