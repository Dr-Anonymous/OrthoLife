import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Phone, Menu, X, MessageCircle, ChevronDown, User, LogOut } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { cn } from '@/lib/utils';
import Logo from './Logo';
import { useAuth } from '@/hooks/useAuth';
import { LanguageSwitcher } from './LanguageSwitcher';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { t, i18n } = useTranslation();

  const withLang = (path: string) => {
    // Prefix /te only for blog and guides when Telugu is active
    if (i18n.language === 'te' && (path.startsWith('/blog') || path.startsWith('/guides'))) {
        return `/te${path}`;
    }
    return path;
  };

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

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'}`}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Logo lineColor="white" />
          </div>

          <nav className="hidden md:flex items-center">
            <NavigationMenu>
              <NavigationMenuList className="space-x-6">
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <a href="/#home" className="font-medium hover:text-primary transition-colors px-3 py-2">
                      {t('nav.home')}
                    </a>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <a href="/#services" className="font-medium hover:text-primary transition-colors px-3 py-2">
                      {t('nav.services')}
                    </a>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <a href="/#about" className="font-medium hover:text-primary transition-colors px-3 py-2">
                      {t('nav.about')}
                    </a>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="font-medium">{t('nav.pharmacy')}</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[400px] gap-3 p-4 bg-popover">
                      <NavigationMenuLink asChild>
                        <Link
                          to={withLang("/pharmacy")}
                          className={cn(
                            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          )}
                        >
                          <div className="text-sm font-medium leading-none">{t('nav.order-medicines')}</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {t('pharmacy.orderDescription')}
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
                          <div className="text-sm font-medium leading-none">{t('nav.upload-prescription')}</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {t('pharmacy.uploadDescription')}
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="font-medium">{t('nav.diagnostics')}</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[400px] gap-3 p-4 bg-popover">
                      <NavigationMenuLink asChild>
                        <Link
                          to={withLang("/diagnostics")}
                          className={cn(
                            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          )}
                        >
                          <div className="text-sm font-medium leading-none">{t('nav.book-lab-tests')}</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {t('diagnostics.bookDescription')}
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
                          <div className="text-sm font-medium leading-none">{t('nav.track-test-results')}</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {t('diagnostics.trackDescription')}
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="font-medium">{t('nav.learn')}</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[500px] grid-cols-2 gap-3 p-4 bg-popover">
                      <div className="col-span-2 mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">{t('nav.health-education')}</span>
                      </div>
                      <NavigationMenuLink asChild>
                        <Link
                          to={withLang("/blog")}
                          className={cn(
                            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          )}
                        >
                          <div className="text-sm font-medium leading-none">{t('nav.blog')}</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {t('blog.subtitle')}
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
                          <div className="text-sm font-medium leading-none">{t('nav.patient-guides')}</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {t('guides.subtitle')}
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
                          <div className="text-sm font-medium leading-none">{t('nav.faqs')}</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {t('faq.subtitle')}
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
                          <div className="text-sm font-medium leading-none">{t('nav.resources')}</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {t('resources.subtitle')}
                          </p>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link
                          to={withLang("/symptom-checker")}
                          className={cn(
                            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          )}
                        >
                          <div className="text-sm font-medium leading-none">{t('nav.symptom-checker')}</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {t('symptomChecker.subtitle')}
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <a href="/#contact" className="font-medium hover:text-primary transition-colors px-3 py-2">
                      {t('nav.contact')}
                    </a>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </nav>

          <div className="flex items-center space-x-2">
            <Button onClick={(e) => { e.preventDefault(); window.location.href = 'tel:+919983849838'; }} variant="outline" className="hidden md:flex items-center gap-2">
              <Phone size={16} />
            </Button>
            <Button onClick={(e) => { e.preventDefault(); window.location.href = 'https://wa.me/919983849838?text=Hi.%20I%27d%20like%20to%20book%20an%20appointment%20today'; }} className="bg-primary hover:bg-primary/90 transition-colors">
              <MessageCircle />
            </Button>
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            {/* User Menu */}
            {user ? (
              <Link to="/my">
                <Button variant="ghost" className="hidden md:flex items-center gap-2">
                  <User size={16} />
                  <span>{t('nav.my-space')}</span>
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button variant="ghost" className="hidden md:flex items-center gap-2">
                  <User size={16} />
                  <span>{t('nav.login')}</span>
                </Button>
              </Link>
            )}

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
            <div className="flex justify-center sm:hidden pb-2 border-b">
              <LanguageSwitcher />
            </div>
            <a href="/#home" className="block font-medium hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.home')}</a>
            <a href="/#services" className="block font-medium hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.services')}</a>
            <a href="/#about" className="block font-medium hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.about')}</a>

            {/* Pharmacy Dropdown */}
            <div className="space-y-2">
              <span className="block font-medium text-primary">{t('nav.pharmacy')}</span>
              <Link to={withLang("/pharmacy")} className="block pl-4 text-sm hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.order-medicines')}</Link>
              <Link to={withLang("/upload-prescription")} className="block pl-4 text-sm hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.upload-prescription')}</Link>
            </div>

            {/* Diagnostics Dropdown */}
            <div className="space-y-2">
              <span className="block font-medium text-primary">{t('nav.diagnostics')}</span>
              <Link to={withLang("/diagnostics")} className="block pl-4 text-sm hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.book-lab-tests')}</Link>
              <Link to={withLang("/track-test-results")} className="block pl-4 text-sm hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.track-test-results')}</Link>
            </div>

            {/* Learn Dropdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="block font-medium text-primary">{t('nav.learn')}</span>
              </div>
              <Link to={withLang("/blog")} className="block pl-4 text-sm hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.blog')}</Link>
              <Link to={withLang("/guides")} className="block pl-4 text-sm hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.patient-guides')}</Link>
              <Link to={withLang("/faqs")} className="block pl-4 text-sm hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.faqs')}</Link>
              <Link to={withLang("/resources")} className="block pl-4 text-sm hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.resources')}</Link>
              <Link to={withLang("/symptom-checker")} className="block pl-4 text-sm hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.symptom-checker')}</Link>
            </div>

            <a href="/#contact" className="block font-medium hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.contact')}</a>

            {/* Mobile Login/Logout */}
            {user ? (
              <Link to="/my">
                <Button onClick={() => setIsMobileMenuOpen(false)} variant="outline" className="w-full flex items-center justify-center gap-2">
                  <User size={16} />
                  <span>{t('nav.my-space')}</span>
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button onClick={() => setIsMobileMenuOpen(false)} variant="outline" className="w-full flex items-center justify-center gap-2">
                  <User size={16} />
                  <span>{t('nav.login')}</span>
                </Button>
              </Link>
            )}

            <Button onClick={(e) => { e.preventDefault(); window.location.href = 'tel:+919983849838'; setIsMobileMenuOpen(false); }} variant="outline" className="w-full flex items-center justify-center gap-2">
              <Phone size={16} />
              <span>99 838 49 838</span>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
