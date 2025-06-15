import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [logoError, setLogoError] = useState(false);
  
  // Use absolute path from public directory
  const logoUrl = "/logo.png";
  const logoAlt = "OrthoLife Logo";
  const fallbackText = "OrthoLife";
  
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogoError = () => {
    console.log('Logo failed to load, showing fallback text');
    setLogoError(true);
  };

  const handleLogoLoad = () => {
    console.log('Logo loaded successfully');
    setLogoError(false);
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'}`}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {!logoError ? (
              <img 
                src={logoUrl} 
                alt={logoAlt}
                className="h-18 max-h-18 md:h-22 md:max-h-22 w-auto align-middle object-contain p-0 m-0"
                onError={handleLogoError}
                onLoad={handleLogoLoad}
              />
            ) : (
              <h1 className="text-primary font-heading font-bold text-2xl">
                {fallbackText}
              </h1>
            )}
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#home" className="font-medium hover:text-primary transition-colors">Home</a>
            <a href="#services" className="font-medium hover:text-primary transition-colors">Services</a>
            <a href="#about" className="font-medium hover:text-primary transition-colors">About</a>
            <a href="#contact" className="font-medium hover:text-primary transition-colors">Contact</a>
          </nav>
          
          <div className="flex items-center space-x-2">
            <Button onClick={(e) => {e.preventDefault();window.location.href='tel:+919866812555';}} variant="outline" className="hidden md:flex items-center gap-2">
              <Phone size={16} />
              <span>9866812555</span>
            </Button>
            <Button onClick={(e) => {e.preventDefault();window.location.href='https://wa.me/919866812555?text=Hi.%20I%27d%20like%20to%20book%20an%20appointment%20today';}} className="bg-primary hover:bg-primary/90 transition-colors">
              WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
