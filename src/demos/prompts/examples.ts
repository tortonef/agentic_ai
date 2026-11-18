export type TechniqueId = 'zero' | 'few' | 'structured' | 'role'

export const techniques: { id: TechniqueId; label: string; idea: string }[] = [
  { id: 'zero', label: 'Zero-shot', idea: 'Just the instruction. Fast to write, but the model decides format and depth.' },
  { id: 'few', label: 'Few-shot', idea: 'A few worked examples teach the pattern, so outputs become consistent.' },
  { id: 'structured', label: 'Structured output', idea: 'A schema makes the output machine-readable and easy to validate.' },
  { id: 'role', label: 'Role-based', idea: 'A persona with goals and constraints shifts tone, priorities and expertise.' },
]

export interface Variant {
  prompt: string
  output: string
  /** Illustrative 1–5 ratings for this example, not benchmark results. */
  ratings: { consistency: number; machineReadable: number; specificity: number }
  takeaway: string
}

export interface PromptScenario {
  id: string
  title: string
  input: string
  variants: Record<TechniqueId, Variant>
}

export const scenarios: PromptScenario[] = [
  {
    id: 'feedback',
    title: 'Customer feedback triage',
    input:
      'Ordered the standing desk two weeks ago. Delivery was 5 days late and nobody answered my emails. The desk itself is solid and easy to assemble, but one leg wobbles. Not sure I would order again.',
    variants: {
      zero: {
        prompt: 'Analyse this customer review:\n\n{{input}}',
        output:
          'This review expresses mixed feelings. The customer is unhappy about the late delivery and the lack of response to their emails, which suggests problems with customer service. On the positive side, they think the desk is solid and easy to put together. However, they mention a wobbly leg, which could be a quality issue. Overall the sentiment leans negative and the customer may not buy again.',
        ratings: { consistency: 2, machineReadable: 1, specificity: 3 },
        takeaway: 'Reasonable prose, but the length, structure and labels will vary from review to review, which makes this hard to aggregate.',
      },
      few: {
        prompt:
          'Classify customer reviews.\n\nReview: "Arrived early, works perfectly."\nSentiment: Positive | Topics: Delivery, Product | Churn risk: Low\n\nReview: "Broke after a week, refund took a month."\nSentiment: Negative | Topics: Quality, Refunds | Churn risk: High\n\nReview: "{{input}}"\nSentiment:',
        output: 'Mixed | Topics: Delivery, Support, Quality | Churn risk: High',
        ratings: { consistency: 4, machineReadable: 3, specificity: 4 },
        takeaway: 'Two examples are enough to lock in a compact, repeatable format and a shared label vocabulary.',
      },
      structured: {
        prompt:
          'Extract a triage record from the review. Respond with JSON only, matching:\n{\n  "sentiment": "positive" | "neutral" | "negative" | "mixed",\n  "topics": string[],\n  "issues": { "type": string, "severity": 1-3 }[],\n  "churn_risk": "low" | "medium" | "high",\n  "needs_reply": boolean\n}\n\nReview: {{input}}',
        output:
          '{\n  "sentiment": "mixed",\n  "topics": ["delivery", "support", "product_quality"],\n  "issues": [\n    { "type": "late_delivery", "severity": 2 },\n    { "type": "unanswered_emails", "severity": 3 },\n    { "type": "wobbly_leg", "severity": 2 }\n  ],\n  "churn_risk": "high",\n  "needs_reply": true\n}',
        ratings: { consistency: 5, machineReadable: 5, specificity: 5 },
        takeaway: 'A schema turns free text into data: it can be validated, routed to a queue and counted on a dashboard.',
      },
      role: {
        prompt:
          'You are a customer-experience lead at a furniture retailer. Your goal is to retain customers and fix root causes. Read the review, name the root causes, decide the next action, and draft a short, empathetic reply.\n\nReview: {{input}}',
        output:
          'Root causes: carrier delay not communicated proactively; support inbox not monitored; possible leg-bracket defect.\n\nNext action: escalate to support (SLA breach), ship a replacement leg bracket, flag the batch for QA.\n\nReply draft:\n"Hi, I\'m sorry your desk arrived late and that your emails went unanswered. That\'s not the experience we want for you. A replacement leg bracket ships today at no cost, and I\'ve personally flagged your order so you hear back within 24 hours."',
        ratings: { consistency: 3, machineReadable: 2, specificity: 5 },
        takeaway: 'The persona adds judgement: root causes, an action plan and a reply in the brand voice. That is ideal for humans, harder for machines.',
      },
    },
  },
  {
    id: 'meeting',
    title: 'Meeting notes → action items',
    input:
      'Sync 14/05. Marco will update the pricing deck before Friday. Data team still blocked on CRM export access, Lucia to chase IT. We agreed to postpone the pilot launch to June. Someone should book the venue for the kickoff.',
    variants: {
      zero: {
        prompt: 'Summarise this meeting:\n\n{{input}}',
        output:
          'In the meeting on 14 May, the team discussed several topics. Marco is going to update the pricing deck, and the data team is waiting for access to the CRM export. The pilot launch has been moved to June. There was also a mention of booking a venue for the kickoff.',
        ratings: { consistency: 2, machineReadable: 1, specificity: 2 },
        takeaway: 'A summary, not a task list: owners and deadlines are buried in sentences, and the unowned task is easy to miss.',
      },
      few: {
        prompt:
          'Turn notes into action items.\n\nNotes: "Anna sends the contract Monday."\n- [ ] Send contract | Owner: Anna | Due: Monday\n\nNotes: "Need someone to review the budget."\n- [ ] Review budget | Owner: UNASSIGNED | Due: —\n\nNotes: "{{input}}"',
        output:
          '- [ ] Update pricing deck | Owner: Marco | Due: Friday\n- [ ] Chase IT for CRM export access | Owner: Lucia | Due: —\n- [ ] Book kickoff venue | Owner: UNASSIGNED | Due: —\n\nDecision: pilot launch postponed to June.',
        ratings: { consistency: 4, machineReadable: 3, specificity: 4 },
        takeaway: 'The second example taught the model to surface unowned tasks explicitly, a behaviour that is hard to get from instructions alone.',
      },
      structured: {
        prompt:
          'Extract from the notes. JSON only:\n{\n  "actions": { "task": string, "owner": string | null, "due": string | null, "blocked": boolean }[],\n  "decisions": string[]\n}\n\nNotes: {{input}}',
        output:
          '{\n  "actions": [\n    { "task": "Update pricing deck", "owner": "Marco", "due": "Friday", "blocked": false },\n    { "task": "Get CRM export access from IT", "owner": "Lucia", "due": null, "blocked": true },\n    { "task": "Book kickoff venue", "owner": null, "due": null, "blocked": false }\n  ],\n  "decisions": ["Pilot launch postponed to June"]\n}',
        ratings: { consistency: 5, machineReadable: 5, specificity: 4 },
        takeaway: 'Ready to create tickets automatically, and null fields make missing owners and dates explicit.',
      },
      role: {
        prompt:
          'You are an experienced project manager. Extract action items, then flag risks to the delivery timeline and suggest who should own unassigned work.\n\nNotes: {{input}}',
        output:
          'Action items\n1. Marco — update pricing deck (Fri)\n2. Lucia — unblock CRM export with IT (ASAP; blocking the data team)\n3. Unassigned — book kickoff venue (suggest: event or ops owner)\n\nRisks\n- CRM access is on the critical path; without an IT deadline the June pilot may slip again.\n- The venue has no owner; kickoff date is at risk.',
        ratings: { consistency: 3, machineReadable: 2, specificity: 5 },
        takeaway: 'The role adds risk analysis and proposals, going beyond what the notes literally say.',
      },
    },
  },
  {
    id: 'explain',
    title: 'Explain RAG to an executive',
    input: 'What is Retrieval-Augmented Generation and why should we care?',
    variants: {
      zero: {
        prompt: '{{input}}',
        output:
          'Retrieval-Augmented Generation (RAG) is a technique that combines a large language model with an information retrieval system. When a question is asked, relevant documents are retrieved from a knowledge base, often using vector embeddings, and passed to the model as context, which then generates an answer. This reduces hallucinations and allows the model to use up-to-date or proprietary information without retraining.',
        ratings: { consistency: 3, machineReadable: 1, specificity: 3 },
        takeaway: 'Accurate, but pitched at engineers: jargon like "vector embeddings" and no link to business value.',
      },
      few: {
        prompt:
          'Explain technical concepts in one plain sentence, then one business benefit.\n\nQ: What is an API?\nA: A standard way for two software systems to talk. Benefit: faster integrations with partners.\n\nQ: What is cloud computing?\nA: Renting computing power instead of owning servers. Benefit: pay for what you use and scale quickly.\n\nQ: {{input}}\nA:',
        output: 'Letting an AI look things up in our own documents before it answers. Benefit: trustworthy answers about our business, with sources, without training a custom model.',
        ratings: { consistency: 5, machineReadable: 3, specificity: 3 },
        takeaway: 'The examples set the length and register: one plain sentence plus one benefit.',
      },
      structured: {
        prompt:
          'Answer in exactly this format:\nONE-LINER: <max 15 words>\nANALOGY: <one sentence>\nVALUE: <3 bullets>\nRISKS: <2 bullets>\n\nQuestion: {{input}}',
        output:
          'ONE-LINER: AI that checks our own documents before answering, and shows its sources.\nANALOGY: Like an analyst who reads the relevant files before briefing you.\nVALUE:\n- Answers grounded in company knowledge, not internet guesses\n- Content updates without retraining a model\n- Citations make answers auditable\nRISKS:\n- Answers are only as good as the documents behind them\n- Access controls must carry over to retrieved content',
        ratings: { consistency: 5, machineReadable: 4, specificity: 4 },
        takeaway: 'A fixed template makes a briefing skimmable and ensures risks are never left out.',
      },
      role: {
        prompt: 'You are a CTO briefing the board. Be concise, avoid jargon, and focus on business impact and decisions needed.\n\n{{input}}',
        output:
          'RAG lets an AI assistant answer from our own, approved documents, and show where each answer came from.\n\nWhy it matters: our knowledge (policies, contracts, product docs) becomes searchable in plain language. Employees get answers in seconds instead of hunting through folders, and every answer is traceable.\n\nDecision needed: fund a 6-week pilot on one high-volume use case (for example, internal IT and HR questions) with clear success metrics: answer accuracy, time saved and adoption.',
        ratings: { consistency: 3, machineReadable: 1, specificity: 5 },
        takeaway: 'The persona reframes the same facts around impact and a concrete decision: the right shape for a board.',
      },
    },
  },
]
