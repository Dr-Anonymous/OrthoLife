import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  const location = useLocation();
  
  // Auto-generate breadcrumbs from path if items not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathnames = location.pathname.split('/').filter(x => x);
    const breadcrumbs: BreadcrumbItem[] = [];
    
    let href = '';
    pathnames.forEach((name, index) => {
      href += `/${name}`;
      
      // Convert path segments to readable labels
      let label = name;
      switch (name) {
        case 'blog':
          label = 'Blog';
          break;
        case 'guides':
          label = 'Patient Guides';
          break;
        case 'appointment':
          label = 'Book Appointment';
          break;
        case 'pharmacy':
          label = 'Pharmacy';
          break;
        case 'diagnostics':
          label = 'Diagnostics';
          break;
        case 'faqs':
          label = 'FAQs';
          break;
        case 'resources':
          label = 'Resources';
          break;
        case 'legal':
          label = 'Legal & Policies';
          break;
        default:
          // Capitalize and replace hyphens with spaces
          label = name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');
      }
      
      breadcrumbs.push({ label, href });
    });
    
    return breadcrumbs;
  };

  const breadcrumbItems = items || generateBreadcrumbs();
  
  // Don't show breadcrumbs on homepage
  if (location.pathname === '/' || breadcrumbItems.length === 0) {
    return null;
  }

  // Generate structured data for breadcrumbs
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://ortho.life"
      },
      ...breadcrumbItems.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 2,
        "name": item.label,
        "item": `https://ortho.life${item.href}`
      }))
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <nav 
        className={`bg-muted/30 py-3 ${className}`}
        aria-label="Breadcrumb"
      >
        <div className="container mx-auto px-4">
          <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
            <li>
              <Link 
                to="/" 
                className="flex items-center hover:text-primary transition-colors"
                aria-label="Home"
              >
                <Home size={16} />
                <span className="sr-only">Home</span>
              </Link>
            </li>
            {breadcrumbItems.map((item, index) => (
              <li key={item.href} className="flex items-center">
                <ChevronRight size={16} className="mx-2" />
                {index === breadcrumbItems.length - 1 ? (
                  <span className="text-foreground font-medium" aria-current="page">
                    {item.label}
                  </span>
                ) : (
                  <Link 
                    to={item.href} 
                    className="hover:text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </div>
      </nav>
    </>
  );
};