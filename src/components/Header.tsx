import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Phone, Menu, X, MessageCircle, ChevronDown } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { cn } from '@/lib/utils';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const lang = searchParams.get('lang');

  const withLang = (path: string) => {
    return lang ? `${path}?lang=${lang}` : path;
  };
  
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
                loading="lazy"
              />
            ) : (
              <h1 className="text-primary font-heading font-bold text-2xl">
                {fallbackText}
              </h1>
            )}
          </div>
          
          <nav className="hidden md:flex items-center">
            <NavigationMenu>
              <NavigationMenuList className="space-x-6">
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <a href="/#home" className="font-medium hover:text-primary transition-colors px-3 py-2">
                      Home
                    </a>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <a href="/#services" className="font-medium hover:text-primary transition-colors px-3 py-2">
                      Services
                    </a>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <a href="/#about" className="font-medium hover:text-primary transition-colors px-3 py-2">
                      About
                    </a>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="font-medium">Pharmacy</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[400px] gap-3 p-4 bg-popover">
                      <NavigationMenuLink asChild>
                        <Link
                          to={withLang("/pharmacy")}
                          className={cn(
                            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          )}
                        >
                          <div className="text-sm font-medium leading-none">Order Medicines</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Browse and order medicines online with home delivery
                          </p>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link
                          to={withLang("/upload-prescription")}
                          className={cn(
                            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          )}
                        >
                          <div className="text-sm font-medium leading-none">Upload Prescription</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Upload your prescription for quick medicine ordering
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="font-medium">Diagnostics</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[400px] gap-3 p-4 bg-popover">
                      <NavigationMenuLink asChild>
                        <Link
                          to={withLang("/diagnostics")}
                          className={cn(
                            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          )}
                        >
                          <div className="text-sm font-medium leading-none">Book Lab Tests</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Book diagnostic tests with home sample collection
                          </p>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link
                          to={withLang("/track-test-results")}
                          className={cn(
                            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          )}
                        >
                          <div className="text-sm font-medium leading-none">Track Test Results</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Check the status and download your test results
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="font-medium">Learn</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[500px] grid-cols-2 gap-3 p-4 bg-popover">
                      <div className="col-span-2 mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">Health Education</span>
                      </div>
                      <NavigationMenuLink asChild>
                        <Link
                          to={withLang("/blog")}
                          className={cn(
                            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          )}
                        >
                          <div className="text-sm font-medium leading-none">Blog</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Latest health tips and medical insights
                          </p>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link
                          to={withLang("/guides")}
                          className={cn(
                            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          )}
                        >
                          <div className="text-sm font-medium leading-none">Health Guides</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Comprehensive guides for health management
                          </p>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link
                          to={withLang("/faqs")}
                          className={cn(
                            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          )}
                        >
                          <div className="text-sm font-medium leading-none">FAQs</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Quick answers to common health questions
                          </p>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link
                          to={withLang("/resources")}
                          className={cn(
                            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          )}
                        >
                          <div className="text-sm font-medium leading-none">Resources</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Useful tools and resources for your health
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <a href="/#contact" className="font-medium hover:text-primary transition-colors px-3 py-2">
                      Contact
                    </a>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </nav>
          
          <div className="flex items-center space-x-2">
            <Button onClick={(e) => {e.preventDefault();window.location.href='tel:+919866812555';}} variant="outline" className="hidden md:flex items-center gap-2">
              <Phone size={16} />
              <span>9866812555</span>
            </Button>
            <Button onClick={(e) => {e.preventDefault();window.location.href='https://wa.me/919866812555?text=Hi.%20I%27d%20like%20to%20book%20an%20appointment%20today';}} className="bg-primary hover:bg-primary/90 transition-colors">
              <MessageCircle />
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
        <div className="md:hidden bg-popover border-t shadow-lg">
          <nav className="container mx-auto px-4 py-4 space-y-4">
            <a href="/#home" className="block font-medium hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Home</a>
            <a href="/#services" className="block font-medium hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Services</a>
            <a href="/#about" className="block font-medium hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>About</a>
            
            {/* Pharmacy Dropdown */}
            <div className="space-y-2">
              <span className="block font-medium text-primary">Pharmacy</span>
              <Link to={withLang("/pharmacy")} className="block pl-4 text-sm hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Order Medicines</Link>
              <Link to={withLang("/upload-prescription")} className="block pl-4 text-sm hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Upload Prescription</Link>
            </div>

            {/* Diagnostics Dropdown */}
            <div className="space-y-2">
              <span className="block font-medium text-primary">Diagnostics</span>
              <Link to={withLang("/diagnostics")} className="block pl-4 text-sm hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Book Lab Tests</Link>
              <Link to={withLang("/track-test-results")} className="block pl-4 text-sm hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Track Test Results</Link>
            </div>

            {/* Learn Dropdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="block font-medium text-primary">Learn</span>
              </div>
              <Link to={withLang("/blog")} className="block pl-4 text-sm hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Blog</Link>
              <Link to={withLang("/guides")} className="block pl-4 text-sm hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Health Guides</Link>
              <Link to={withLang("/faqs")} className="block pl-4 text-sm hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>FAQs</Link>
              <Link to={withLang("/resources")} className="block pl-4 text-sm hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Resources</Link>
            </div>

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
