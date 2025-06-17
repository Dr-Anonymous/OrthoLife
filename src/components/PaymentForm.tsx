// Load Cashfree SDK with proper initialization
  const loadCashfreeScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      // Check if already loaded
      if ((window as any).Cashfree) {
        console.log('Cashfree SDK already loaded');
        resolve(true);
        return;
      }
      
      // Remove any existing script tags
      const existingScript = document.querySelector('script[src*="cashfree"]');
      if (existingScript) {
        existingScript.remove();
      }
      
      const script = document.createElement('script');
      // Try the latest version first, fallback to your current version
      script.src = 'https://sdk.cashfree.com/js/ui/2.0.0/cashfree.prod.js';
      script.async = true;
      
      script.onload = () => {
        console.log('Cashfree script loaded');
        
        // Wait for SDK to initialize properly
        let attempts = 0;
        const maxAttempts = 10;
        
        const checkCashfree = () => {
          attempts++;
          const cashfree = (window as any).Cashfree;
          
          console.log(`Attempt ${attempts}: Checking Cashfree...`);
          console.log('Cashfree object:', cashfree);
          console.log('Type of Cashfree:', typeof cashfree);
          
          if (cashfree) {
            console.log('✓ Cashfree SDK ready');
            console.log('Available methods:', Object.getOwnPropertyNames(cashfree));
            
            // Log available methods for debugging
            if (typeof cashfree === 'object') {
              for (const key in cashfree) {
                console.log(`Cashfree.${key}:`, typeof cashfree[key]);
              }
            }
            
            resolve(true);
            return;
          }
          
          if (attempts < maxAttempts) {
            setTimeout(checkCashfree, 200);
          } else {
            console.error('Cashfree SDK failed to initialize after', maxAttempts, 'attempts');
            resolve(false);
          }
        };
        
        // Start checking immediately
        checkCashfree();
      };
      
      script.onerror = (error) => {
        console.error('Failed to load Cashfree SDK:', error);
        resolve(false);
      };
      
      document.head.appendChild(script);
    });
  };
