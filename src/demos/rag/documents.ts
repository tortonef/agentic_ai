export interface SourceDoc {
  id: string
  title: string
  type: string
  text: string
}

// Fictional sample corpus for the demo. Companies and policies are invented.
export const documents: SourceDoc[] = [
  {
    id: 'remote',
    title: 'Remote Work Policy',
    type: 'HR policy',
    text: `Employees may work remotely up to three days per week after completing their probation period. Remote days must be agreed with the team lead and recorded in the shared team calendar. Core collaboration hours are from 10:00 to 15:00 local time, during which employees are expected to be reachable on chat. The company provides a one-time home office budget of 600 euros for a desk, chair or monitor. Working from another country is allowed for a maximum of 20 working days per calendar year and requires approval from HR at least two weeks in advance. Employees working remotely must use the company VPN when accessing internal systems. Equipment purchased with the home office budget remains company property for two years.`,
  },
  {
    id: 'faq',
    title: 'Nimbus Analytics — Product FAQ',
    type: 'Product docs',
    text: `Nimbus Analytics is a self-service dashboard tool for small and medium businesses. Data can be imported from CSV files, Google Sheets, PostgreSQL and MySQL databases. Dashboards refresh automatically every 15 minutes on the Team plan and every 5 minutes on the Enterprise plan. The free plan supports up to 3 dashboards and 1 data source. Single sign-on with SAML is available only on the Enterprise plan. All customer data is encrypted at rest with AES-256 and in transit with TLS 1.3. Data is hosted in the EU region by default, and customers on the Enterprise plan can request a dedicated US region. Customers can export any dashboard as PDF or PNG, and raw query results as CSV. Support is available by email on all plans, with a guaranteed four-hour response time on Enterprise.`,
  },
  {
    id: 'ai',
    title: 'Responsible AI Usage Guidelines',
    type: 'Governance',
    text: `Generative AI tools may be used to draft content, summarise documents and assist with code, provided a human reviews the output before it is shared externally. Confidential customer data must never be pasted into public AI tools; only the approved internal assistant may process confidential information. All AI-generated content published externally must be disclosed as AI-assisted. Teams building AI features must complete a risk assessment covering bias, privacy and failure modes before launch. High-risk use cases, such as decisions about hiring or credit, require sign-off from the AI governance board. Model outputs used in production must be logged so that decisions can be audited. Prompts and evaluation datasets should be versioned alongside application code.`,
  },
  {
    id: 'incident',
    title: 'Postmortem: Checkout Outage',
    type: 'Engineering',
    text: `On 12 March the checkout service was unavailable for 47 minutes, affecting roughly 8 percent of daily orders. The root cause was a database connection pool exhaustion triggered by a new retry policy that retried failed payments without backoff. The on-call engineer was paged after 6 minutes by the error-rate alert. Mitigation consisted of rolling back the retry policy and restarting the payment workers. To prevent recurrence, the team introduced exponential backoff with jitter, added a circuit breaker in front of the payment provider, and created an alert on connection pool saturation above 80 percent. A load test covering retry storms is now part of the release checklist.`,
  },
  {
    id: 'expenses',
    title: 'Travel & Expense Policy',
    type: 'Finance policy',
    text: `Business travel must be booked through the approved travel portal at least 14 days before departure whenever possible. Economy class is required for flights under six hours; premium economy is allowed for longer flights. The daily meal allowance is 45 euros for domestic travel and 60 euros for international travel. Expense claims must be submitted within 30 days with itemised receipts attached. Claims above 500 euros require approval from the department head. Taxi and ride-hailing costs are reimbursed when public transport is unavailable or after 21:00. Personal expenses, alcohol and fines are never reimbursed.`,
  },
]

export const suggestedQuestions = [
  'How many days can I work remotely?',
  'Which plan includes single sign-on?',
  'What caused the checkout outage?',
  'Can I paste customer data into AI tools?',
  'What is the meal allowance abroad?',
]
