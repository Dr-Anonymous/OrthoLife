import { useEffect } from 'react';

export function useScrollToHash(offset = 0, smooth = true) {
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) {
          const yOffset = offset * -1;
          const y =
            element.getBoundingClientRect().top + window.pageYOffset + yOffset;

          window.scrollTo({
            top: y,
            behavior: smooth ? 'smooth' : 'auto',
          });
        }
      }
    };

    // Scroll on first load
    scrollToHash();

    // Listen to changes in hash
    window.addEventListener('hashchange', scrollToHash);

    return () => {
      window.removeEventListener('hashchange', scrollToHash);
    };
  }, [offset, smooth]);
}
