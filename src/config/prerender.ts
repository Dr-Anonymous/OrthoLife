// Pre-rendering configuration for react-snap
export const prerenderConfig = {
  // Routes to pre-render
  routes: [
    '/',
    '/appointment',
    '/services',
    '/about',
    '/contact',
    '/pharmacy',
    '/diagnostics',
    '/resources',
    '/faq',
    '/legal-policies',
    '/blog',
    '/guides'
  ],
  
  // SEO-friendly meta tags for each route
  metaTags: {
    '/': {
      title: 'OrthoLife - Back to Health | Expert Orthopaedic Care',
      description: 'Expert orthopaedic care for joints, spine, and sports injuries. Personalized treatment to get you back to health. Book your appointment today.',
      keywords: 'orthopaedic, orthopedic, joint care, spine treatment, sports injury, bone health'
    },
    '/appointment': {
      title: 'Book Appointment | OrthoLife Orthopaedic Clinic',
      description: 'Schedule your orthopaedic consultation with our expert doctors. Easy online booking with flexible time slots.',
      keywords: 'book appointment, orthopaedic consultation, doctor booking'
    },
    '/services': {
      title: 'Orthopaedic Services | Joint, Spine & Sports Medicine',
      description: 'Comprehensive orthopaedic services including joint replacement, spine surgery, sports medicine, and rehabilitation.',
      keywords: 'orthopaedic services, joint replacement, spine surgery, sports medicine'
    },
    '/pharmacy': {
      title: 'Online Pharmacy | Orthopaedic Medications & Supplements',
      description: 'Order medications and health supplements online. Fast delivery of prescription drugs and orthopaedic care products.',
      keywords: 'online pharmacy, medications, supplements, prescription drugs'
    },
    '/diagnostics': {
      title: 'Diagnostic Services | X-Ray, MRI & Lab Tests',
      description: 'Complete diagnostic services including X-ray, MRI, CT scans, and laboratory tests for accurate diagnosis.',
      keywords: 'diagnostic services, x-ray, MRI, CT scan, lab tests'
    },
    '/blog': {
      title: 'Health Blog | Orthopaedic Tips & Medical Insights',
      description: 'Latest articles on orthopaedic health, injury prevention, treatment tips, and medical insights from our experts.',
      keywords: 'health blog, orthopaedic tips, medical articles, injury prevention'
    },
    '/guides': {
      title: 'Patient Guides | Orthopaedic Care Instructions',
      description: 'Comprehensive patient guides for orthopaedic procedures, recovery tips, and post-treatment care instructions.',
      keywords: 'patient guides, recovery instructions, post-treatment care'
    }
  }
};