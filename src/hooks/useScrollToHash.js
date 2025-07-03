// src/hooks/useScrollToHash.js
import { useEffect } from 'react';

export function useScrollToHash(offset = 0, smooth = true) {
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.substring(1); // remove #
        const element = document.getElementById(id);
        if (element) {
          const yOffset = -offset;
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
        }
      }
    };

    // Run on page load
    scrollToHash();

    // Run on hash change
    window.addEventListener('hashchange', scrollToHash);

    return () => {
      window.removeEventListener('hashchange', scrollToHash);
    };
  }, [offset, smooth]);
}
