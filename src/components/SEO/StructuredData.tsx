import React from 'react';

interface OrganizationSchemaProps {
  name?: string;
  url?: string;
  logo?: string;
  telephone?: string;
  address?: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
}

interface ArticleSchemaProps {
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  url: string;
}

interface WebsiteSchemaProps {
  name?: string;
  url?: string;
  description?: string;
}

export const OrganizationSchema: React.FC<OrganizationSchemaProps> = ({
  name = "OrthoLife",
  url = "https://ortho.life",
  logo = "https://ortho.life/logo.png",
  telephone = "+91-XXXXXXXXXX",
  address = {
    streetAddress: "Medical Center Address",
    addressLocality: "City",
    addressRegion: "State",
    postalCode: "000000",
    addressCountry: "IN"
  }
}) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    "name": name,
    "url": url,
    "logo": logo,
    "telephone": telephone,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": address.streetAddress,
      "addressLocality": address.addressLocality,
      "addressRegion": address.addressRegion,
      "postalCode": address.postalCode,
      "addressCountry": address.addressCountry
    },
    "medicalSpecialty": "Orthopedics",
    "serviceArea": "India"
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

export const ArticleSchema: React.FC<ArticleSchemaProps> = ({
  headline,
  description,
  image,
  datePublished,
  dateModified,
  author,
  url
}) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": headline,
    "description": description,
    "image": image,
    "datePublished": datePublished,
    "dateModified": dateModified || datePublished,
    "author": {
      "@type": "Person",
      "name": author
    },
    "publisher": {
      "@type": "Organization",
      "name": "OrthoLife",
      "logo": {
        "@type": "ImageObject",
        "url": "https://ortho.life/logo.png"
      }
    },
    "url": url,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": url
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

export const WebsiteSchema: React.FC<WebsiteSchemaProps> = ({
  name = "OrthoLife",
  url = "https://ortho.life",
  description = "OrthoLife offers expert orthopaedic care for fractures, sports injuries, spine, joint, and orthobiologic treatments."
}) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": name,
    "url": url,
    "description": description,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${url}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

export const FAQSchema: React.FC<{ faqs: Array<{ question: string; answer: string }> }> = ({ faqs }) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};