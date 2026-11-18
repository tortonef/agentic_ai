/**
 * Personal information — the single place to edit name, links and bio.
 * Values wrapped in [brackets] are placeholders to replace.
 */
export const profile = {
  name: 'Federico Tortonesi',
  initials: 'FT',
  role: 'Service Delivery Manager · AI Transformation · GenAI Builder',
  positioning: 'Generative AI · Data & AI Transformation · Intelligent Automation',

  hero: {
    eyebrow: 'Interactive GenAI Lab',
    headline: 'Building the next generation of intelligent systems.',
    supporting: 'Exploring Generative AI, Agentic Systems, RAG architectures and intelligent automation.',
  },

  links: {
    github: 'https://github.com/tortonef',
    linkedin: 'https://www.linkedin.com/in/federico-tortonesi/',
    email: 'federico.tortonesi.96@gmail.com',
    /** File in /public. Your CV; replace public/cv.pdf to update it. */
    cv: 'cv.pdf',
  },

  about: {
    intro:
      'I translate business challenges into AI transformation opportunities, and I build the systems that prove them.',
    paragraphs: [
      'I am a Service Delivery Manager at SDG Group Italy with a background in Physics. Since 2021 I have moved from Data & Analytics roles to leading Application Maintenance Services: client relationships, multidisciplinary teams, SLAs, incident and problem management, and continuous improvement in complex enterprise environments.',
      'My focus is shaping AI use cases and roadmaps, and identifying where Generative AI, intelligent automation and data-driven solutions can improve processes, operating models and business performance. I also build hands-on, from RAG assistants to agentic workflows with human-in-the-loop controls.',
      'I founded and coordinate an internal AI Community, and I have designed and delivered training on Data Science, Machine Learning, Generative AI and Agentic AI to about 50 professionals. My M.S. thesis applied AI and transfer learning to the ATLAS trigger systems at CERN, and led to a publication in The European Physical Journal C.',
    ],
    /** Short facts shown next to the bio. */
    facts: [
      { label: 'Current role', value: 'Service Delivery Manager, SDG Group Italy' },
      { label: 'Based in', value: 'Rome, Italy' },
      { label: 'Education', value: 'M.S. Particle & Astroparticle Physics, La Sapienza (110/110 cum laude)' },
      { label: 'Community', value: 'Founder of an internal AI Community' },
    ],
    certifications: [
      'Claude Certified Developer – Foundations',
      'Google Cloud Professional ML Engineer',
      'Azure AI Engineer Associate (AI-102)',
      'Fabric Analytics Engineer (DP-600)',
      'Azure Fundamentals (AZ-900)',
      'Azure Data Fundamentals (DP-900)',
      'Azure AI Fundamentals (AI-900)',
      'ITIL 4 Foundation',
      'Professional Scrum Master I',
    ],
    /** The intersection the About section visualises. */
    pillars: [
      'Generative AI',
      'Data & AI Transformation',
      'Agentic Systems',
      'Intelligent Automation',
      'Technology × Business Processes',
    ],
  },
}

export const navigation = [
  { id: 'lab', label: 'Lab' },
  { id: 'projects', label: 'Projects' },
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
] as const
