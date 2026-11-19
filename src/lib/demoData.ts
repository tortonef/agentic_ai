import { seeded } from './random.ts'

/**
 * Synthetic retail sales (fictional stores and products), generated deterministically in the
 * browser instead of shipping a data file. Includes a few planted issues so data quality checks
 * have something real to find: duplicate rows, missing values and price outliers.
 */
export function generateRetailCsv(): string {
  const rand = seeded(2026)
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)]
  const stores = [
    ['Milano Centro', 'North'],
    ['Torino Porta Nuova', 'North'],
    ['Bologna Fiera', 'North'],
    ['Roma Termini', 'Center'],
    ['Firenze Duomo', 'Center'],
    ['Napoli Chiaia', 'South'],
    ['Bari Murat', 'South'],
    ['Online', 'Online'],
  ] as const
  const categories = [
    ['Outerwear', 180],
    ['Knitwear', 90],
    ['Shirts', 60],
    ['Trousers', 75],
    ['Shoes', 120],
    ['Accessories', 40],
  ] as const
  const channels = ['Store', 'Store', 'Store', 'Click & Collect']
  const header = 'order_id,order_date,store,region,channel,category,units,unit_price,discount_pct,revenue,returned'
  const lines: string[] = [header]
  const start = Date.UTC(2025, 0, 1)
  for (let i = 1; i <= 2400; i++) {
    const day = Math.floor(rand() * 547) // 18 months
    const date = new Date(start + day * 86400000)
    const month = date.getUTCMonth()
    const [store, region] = pick(stores)
    const [category, base] = pick(categories)
    // Seasonality: outerwear and knitwear sell more in autumn and winter.
    const winter = month >= 9 || month <= 1
    const units = 1 + Math.floor(rand() * (winter && (category === 'Outerwear' || category === 'Knitwear') ? 4 : 2.5))
    let price = Math.round(base * (0.8 + rand() * 0.5))
    if (i % 397 === 0) price *= 10 // planted price typos
    const discount = month === 0 || month === 6 ? pick([20, 30, 40]) : pick([0, 0, 0, 10])
    const revenue = Math.round(units * price * (1 - discount / 100) * 100) / 100
    const channel = store === 'Online' ? 'Online' : pick(channels)
    const returned = rand() < (channel === 'Online' ? 0.18 : 0.06)
    const cells = [`ORD-${String(i).padStart(5, '0')}`, date.toISOString().slice(0, 10), store, region, channel, category, units, price, discount, revenue, returned]
    if (i % 211 === 0) cells[5] = '' // planted missing category
    lines.push(cells.join(','))
    if (i % 503 === 0) lines.push(cells.join(',')) // planted duplicate row
  }
  return lines.join('\n')
}
