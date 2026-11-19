import type { SourceDoc } from './documents'

export const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_PAGES = 300

/** Extracts plain text from a PDF, TXT or Markdown file, entirely in the browser. */
export async function parseFile(file: File): Promise<SourceDoc & { pages?: number }> {
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than 10 MB.`)
  const id = `${file.name}-${file.size}-${file.lastModified}`
  const title = file.name.replace(/\.[^.]+$/, '')
  if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
    const pages: string[] = []
    for (let i = 1; i <= Math.min(pdf.numPages, MAX_PAGES); i++) {
      const content = await (await pdf.getPage(i)).getTextContent()
      // Keep line breaks (hasEOL) so headings and list items become separate sentences.
      pages.push(content.items.map((it) => ('str' in it ? it.str + (it.hasEOL ? '\n' : ' ') : '')).join(''))
    }
    const text = normalise(pages.join('\n'))
    if (text.length < 20) throw new Error(`${file.name} has no extractable text (it may be a scanned image).`)
    return { id, title, type: `PDF · ${pdf.numPages} pages`, text, pages: pdf.numPages }
  }
  if (/\.(txt|md|markdown|csv|json|html?)$/i.test(file.name) || file.type.startsWith('text/')) {
    const raw = await file.text()
    const text = normalise(/\.html?$/i.test(file.name) ? new DOMParser().parseFromString(raw, 'text/html').body.textContent ?? '' : raw.replace(/^#+\s*/gm, ''))
    return { id, title, type: file.name.split('.').pop()!.toUpperCase(), text }
  }
  throw new Error(`${file.name}: only PDF, TXT and Markdown files are supported.`)
}

/** Collapses whitespace and makes sure paragraphs end like sentences, so chunking can split them. */
function normalise(text: string): string {
  return text
    .split(/\n\s*\n|\n(?=[A-Z0-9•\-*])/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((p) => (/[.!?:]$/.test(p) ? p : `${p}.`))
    .join(' ')
}
