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
      'I work where Generative AI meets real business processes, turning models, data and automation into systems that people actually use.',
    paragraphs: [
      '[Replace with your own story.] My focus is on designing LLM-powered applications, agentic workflows and retrieval systems that are reliable, observable and grounded in enterprise data.',
      '[Replace with your own story.] I care as much about the why as the how: framing the business problem, choosing the right level of autonomy, and making AI adoption measurable.',
    ],
    /** Short facts shown next to the bio. Replace the [placeholders] or remove rows. */
    facts: [
      { label: 'Based in', value: '[City, Country]' },
      { label: 'Focus', value: 'GenAI · Agents · RAG' },
      { label: 'Languages', value: '[e.g. English, Italian]' },
      { label: 'Open to', value: '[e.g. collaborations, roles]' },
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
