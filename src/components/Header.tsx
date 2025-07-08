import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Phone, Menu, X, MessageCircleCode } from "lucide-react";
import { Link } from "react-router-dom";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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
    //console.log('Logo loaded successfully');
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
                className="h-12"
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
            <a href="/#home" className="font-medium hover:text-primary transition-colors">Home</a>
            <a href="/#services" className="font-medium hover:text-primary transition-colors">Services</a>
            <a href="/#about" className="font-medium hover:text-primary transition-colors">About</a>
            <Link to="/pharmacy" className="font-medium hover:text-primary transition-colors">Pharmacy</Link>
            <Link to="/diagnostics" className="font-medium hover:text-primary transition-colors">Diagnostics</Link>
            <a href="/#contact" className="font-medium hover:text-primary transition-colors">Contact</a>
          </nav>
          
          <div className="flex items-center space-x-2">
            <Button onClick={(e) => {e.preventDefault();window.location.href='tel:+919866812555';}} variant="outline" className="hidden md:flex items-center gap-2">
              <Phone size={16} />
              <span>9866812555</span>
            </Button>
            <Button onClick={(e) => {e.preventDefault();window.location.href='https://wa.me/919866812555?text=Hi.%20I%27d%20like%20to%20book%20an%20appointment%20today';}} className="bg-primary hover:bg-primary/90 transition-colors">
              <MessageCircleCode />
            </Button>
            
            {/* Mobile menu button */}
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t shadow-lg">
          <nav className="container mx-auto px-4 py-4 space-y-4">
            <Link to="/#home" className="block font-medium hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
            <Link to="/pharmacy" className="block font-medium hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Pharmacy</Link>
            <Link to="/diagnostics" className="block font-medium hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Diagnostics</Link>
            <a href="/#services" className="block font-medium hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Services</a>
            <a href="/#about" className="block font-medium hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>About</a>
            <a href="/#contact" className="block font-medium hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Contact</a>
            <Button onClick={(e) => {e.preventDefault();window.location.href='tel:+919866812555';setIsMobileMenuOpen(false);}} variant="outline" className="w-full flex items-center justify-center gap-2">
              <Phone size={16} />
              <span>9866812555</span>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
