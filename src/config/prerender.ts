// Pre-rendering configuration for route-level SEO metadata
export const prerenderConfig = {
  routes: [
    '/',
    '/appointment',
    '/pharmacy',
    '/diagnostics',
    '/resources',
    '/faqs',
    '/legal',
    '/blog',
    '/te/blog',
    '/guides',
    '/te/guides',
    '/symptom-checker',
    '/services/joint-replacement',
    '/services/arthroscopy',
    '/services/fracture-care'
  ],
  metaTags: {
    '/': {
      title: 'Orthopaedic Clinic in Kakinada | Joint Replacement, Arthroscopy, Fracture Care | OrthoLife',
      description: 'Expert orthopaedic care in Kakinada for joint replacement, arthroscopy, fracture and trauma treatment, sports injuries, and spine problems.',
      keywords: 'orthopaedic clinic kakinada, orthopedic surgeon, joint replacement, arthroscopy, fracture care'
    },
    '/appointment': {
      title: 'Book Orthopaedic Appointment in Kakinada | OrthoLife',
      description: 'Book your orthopaedic consultation online with OrthoLife for joint pain, fracture care, arthroscopy, and post-surgery follow-up.',
      keywords: 'book orthopaedic appointment, orthopedic consultation kakinada'
    },
    '/pharmacy': {
      title: 'Orthopaedic Pharmacy | Medicines & Recovery Support | OrthoLife',
      description: 'Order prescribed medicines and recovery essentials from the OrthoLife pharmacy.',
      keywords: 'orthopaedic pharmacy, medicines, recovery supplements'
    },
    '/diagnostics': {
      title: 'Orthopaedic Diagnostics | Imaging and Lab Support | OrthoLife',
      description: 'Diagnostic support for orthopaedic care including imaging and test coordination for accurate treatment decisions.',
      keywords: 'orthopaedic diagnostics, imaging, lab support'
    },
    '/resources': {
      title: 'Patient Resources | OrthoLife Orthopaedic Care',
      description: 'Access resources, tools, and patient support material for orthopaedic treatment and recovery.',
      keywords: 'orthopaedic resources, patient education'
    },
    '/faqs': {
      title: 'Orthopaedic FAQs | Joint Pain, Fractures, and Surgery Recovery | OrthoLife',
      description: 'Get answers to frequently asked orthopaedic questions about fractures, arthroscopy, joint replacement, and rehabilitation.',
      keywords: 'orthopaedic faqs, fracture questions, knee replacement faq'
    },
    '/legal': {
      title: 'Legal & Policies | OrthoLife',
      description: 'Review OrthoLife legal information, privacy details, and service terms.',
      keywords: 'ortholife legal, privacy policy'
    },
    '/blog': {
      title: 'Orthopaedic Health Blog | Joint, Fracture & Sports Injury Articles | OrthoLife',
      description: 'Read expert orthopaedic articles on joint replacement, fractures, arthroscopy, pain relief, and recovery.',
      keywords: 'orthopaedic blog, joint replacement articles, fracture recovery'
    },
    '/te/blog': {
      title: 'Orthopaedic Health Blog | Telugu Articles | OrthoLife',
      description: 'Read orthopaedic health articles in Telugu on fractures, joint pain, arthroscopy, and recovery.',
      keywords: 'telugu orthopaedic blog, fracture articles telugu'
    },
    '/guides': {
      title: 'Orthopaedic Patient Guides | Recovery, Exercise & Rehab | OrthoLife',
      description: 'Step-by-step patient guides for orthopaedic recovery, home exercises, rehabilitation, and post-surgery care.',
      keywords: 'orthopaedic patient guides, rehab exercises, recovery guide'
    },
    '/te/guides': {
      title: 'Orthopaedic Patient Guides | Telugu Recovery Guides | OrthoLife',
      description: 'Orthopaedic recovery and exercise guides in Telugu for post-surgery care and rehabilitation.',
      keywords: 'telugu orthopaedic guides, recovery guides telugu'
    },
    '/symptom-checker': {
      title: 'Orthopaedic Symptom Checker | OrthoLife',
      description: 'Use the OrthoLife symptom checker for early guidance and next-step recommendations.',
      keywords: 'orthopaedic symptom checker'
    },
    '/services/joint-replacement': {
      title: 'Joint Replacement Surgery in Kakinada | Knee & Hip Replacement | OrthoLife',
      description: 'Advanced knee and hip replacement surgery in Kakinada with minimally invasive techniques and personalized rehab.',
      keywords: 'joint replacement surgery kakinada, knee replacement, hip replacement'
    },
    '/services/arthroscopy': {
      title: 'Arthroscopy Surgery in Kakinada | ACL, Meniscus & Shoulder | OrthoLife',
      description: 'Minimally invasive arthroscopy for ACL tears, meniscus injuries, and shoulder problems with faster recovery.',
      keywords: 'arthroscopy kakinada, acl surgery, meniscus repair'
    },
    '/services/fracture-care': {
      title: 'Fracture & Trauma Care in Kakinada | Emergency Orthopaedics | OrthoLife',
      description: '24/7 fracture and trauma care in Kakinada for complex fractures, dislocations, and emergency orthopaedic treatment.',
      keywords: 'fracture care kakinada, trauma care, emergency orthopaedics'
    }
  }
};
