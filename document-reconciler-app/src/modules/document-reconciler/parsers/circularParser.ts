import { extractTextFromFile } from './fileTextExtractor'
import type { CircularFramework, CircularMandate, ExpectedSection } from '../types'

const headingPattern =
  /^\s*(?:#{1,6}\s*)?((?:part\s+[IVXLCDM\d]+|chapter\s+[IVXLCDM\d]+|section\s+\d+(?:\.\d+)*|clause\s+\d+(?:\.\d+)*|para(?:graph)?\s+\d+(?:\.\d+)*|format\s+[A-Z\d]+|annex(?:ure)?\s+[A-Z\d]+)(?:\s*[:.–-]\s*|\s+)?)(.*?)\s*$/i
const mandateHeadingPattern =
  /^\s*(?:#{1,6}\s*)?((?:clause|section|para(?:graph)?|format)\s+[A-Z\d]+(?:\.[A-Z\d]+)*)\s*(?:[:.–-]\s*|\s+)?(.*?)\s*$/i
const mandateReferencePattern =
  /\b(?:clause|section|para(?:graph)?|format)\s+[A-Z\d]+(?:\.[A-Z\d]+)*/i
const mandateLanguage =
  /\b(?:shall|must|mandatory|disclose|disclosure|substitut(?:e|ed|ion)|updated?\s+within|update|provide|display|publish|report|maintain|include|format)\b/i
const checklistTerms =
  /\b(shall be updated|within|half[- ]year(?:ly)?|mandatory|risk[- ]o[- ]meter|fundamental attribute|shall|must|required|monthly|quarterly|annually|days?|business days?)\b/i

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function extractExpectedSections(text: string): ExpectedSection[] {
  const sections: ExpectedSection[] = []
  const seen = new Set<string>()
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(headingPattern)
    if (!match) continue
    const code = match[1].trim().replace(/[:.–-]+$/, '')
    const title = match[2].trim().replace(/[:.–-]+$/, '') || code
    const key = `${code}\n${title}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    sections.push({
      code,
      title,
      keywords: [...new Set(`${code} ${title}`.toLowerCase().split(/[^a-z0-9-]+/).filter((word) => word.length > 2))],
    })
  }
  return sections
}

function mandateTitle(contextTitle: string, sentence: string, reference: string): string {
  if (contextTitle && !mandateLanguage.test(contextTitle)) return contextTitle
  const subject = sentence.match(/\b(?:disclose|disclosure of|update|provide|display|publish|include|maintain|report|substitute)\s+(?:the\s+)?([^,.!?;]{3,70})/i)?.[1]
  return subject?.trim() || `${reference} requirement`
}

function extractMandatoryPhrases(sentence: string): string[] {
  const actions = sentence.match(
    /\b(?:shall|must|mandatory|disclose(?:s|d)?|display(?:s|ed)?|provide(?:s|d)?|update(?:s|d)?|substitut(?:e|ed|ion)|publish(?:es|ed)?|report(?:s|ed)?|maintain(?:s|ed)?|include(?:s|d)?|format)\b[^.!?;]*/gi,
  ) ?? []
  const phrases = [...new Set(actions.map((action) => action.trim()).filter((action) => action.length > 8))]
  return phrases.length > 0 ? phrases : [sentence.trim()]
}

function extractMandateKeywords(title: string, requirementText: string): string[] {
  const ignored = new Set([
    'shall', 'must', 'mandatory', 'disclose', 'disclosure', 'provide', 'update',
    'updated', 'display', 'publish', 'report', 'maintain', 'include', 'format',
    'within', 'after', 'before', 'each', 'every', 'under', 'where', 'which',
    'that', 'this', 'from', 'into', 'and', 'the', 'with', 'such', 'their',
  ])
  const words = `${title} ${requirementText}`.toLowerCase()
    .match(/[a-z][a-z0-9-]*/g) ?? []
  return [...new Set(words.filter((word) => word.length > 3 && !ignored.has(word)))].slice(0, 12)
}

function extractMandates(text: string): CircularMandate[] {
  const mandates: CircularMandate[] = []
  const seen = new Set<string>()
  let currentReference = ''
  let currentTitle = ''
  let pendingText = ''

  const flushPending = (): void => {
    const sentences = pendingText.match(/[^.!?;]+[.!?;]?/g) ?? []
    for (const rawSentence of sentences) {
      const requirementText = rawSentence.trim().replace(/\s+/g, ' ')
      if (requirementText.length < 20 || !mandateLanguage.test(requirementText)) continue
      const reference = requirementText.match(mandateReferencePattern)?.[0]
        || currentReference
        || `General requirement ${mandates.length + 1}`
      const title = mandateTitle(currentTitle, requirementText, reference)
        .replace(/[:.–-]+$/, '')
        .trim()
      const key = `${reference}|${requirementText}`.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const id = `custom-mandate-${slug(`${reference}-${title}-${requirementText}`)}`
      mandates.push({
        id,
        clauseRef: reference,
        title,
        requirementText,
        keywords: extractMandateKeywords(title, requirementText),
        mandatoryPhrases: extractMandatoryPhrases(requirementText),
        suggestedInsertionText: requirementText,
      })
    }
    pendingText = ''
  }

  for (const line of text.split(/\r?\n/)) {
    const heading = line.match(mandateHeadingPattern)
    if (heading) {
      flushPending()
      currentReference = heading[1].trim()
      const remainder = heading[2].trim()
      if (remainder && !mandateLanguage.test(remainder)) {
        currentTitle = remainder.replace(/[:.–-]+$/, '').trim()
      } else {
        currentTitle = ''
        pendingText = remainder
      }
      if (/[.!?;]\s*$/.test(remainder)) flushPending()
      continue
    }
    if (!line.trim()) {
      flushPending()
      continue
    }
    pendingText = `${pendingText} ${line.trim()}`.trim()
    if (/[.!?;]\s*$/.test(line)) flushPending()
  }
  flushPending()
  return mandates
}

function guessDocumentTypes(text: string, authority: CircularFramework['authority']): [string, string] {
  if (/\b(mutual fund|scheme information document|key information memorandum)\b/i.test(text)) {
    return ['Primary Lead Document', 'Paired Summary Document']
  }
  const explicitLabels = text.match(/(?:paired documents?|document types?|applicable documents?)\s*[:-]\s*([^.;\n]{3,100})/i)?.[1]
    ?? text.match(/(?:applies? to|applicable to|for)\s+([^.;\n]{3,100})/i)?.[1]
  if (explicitLabels) {
    const labels = explicitLabels.split(/\s+(?:and|&|\/)\s+/i).map((label) => label.trim())
    if (labels.length >= 2 && labels[0] && labels[1]) return [labels[0], labels[1]]
  }
  if (authority === 'RBI' || /\b(master direction|master policy|MITC|bank|lending|borrower)\b/i.test(text)) {
    return ['Master Policy', 'Customer MITC']
  }
  return ['Document A', 'Document B']
}

function detectAuthority(text: string): CircularFramework['authority'] {
  if (/\bReserve Bank of India\b|\bRBI\b/i.test(text)) return 'RBI'
  if (/\bSecurities and Exchange Board of India\b|\bSEBI\b/i.test(text)) return 'SEBI'
  return 'Other'
}

function extractChecklist(text: string): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?]?/g) ?? []
  return [...new Set(sentences
    .map((sentence) => sentence.trim().replace(/\s+/g, ' '))
    .filter((sentence) => sentence.length >= 20 && checklistTerms.test(sentence)))]
}

function dateOnly(date: string): string {
  const iso = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  let year: number
  let month: number
  let day: number
  if (iso) {
    year = Number(iso[1])
    month = Number(iso[2])
    day = Number(iso[3])
  } else {
    const numeric = date.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
    const parsed = numeric
      ? new Date(Number(numeric[3]), Number(numeric[2]) - 1, Number(numeric[1]))
      : new Date(date)
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10)
    year = parsed.getFullYear()
    month = parsed.getMonth() + 1
    day = parsed.getDate()
  }
  const parsed = new Date(year, month - 1, day)
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return new Date().toISOString().slice(0, 10)
  }
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

function parseText(text: string, sourceName: string): CircularFramework {
  if (!text.trim()) throw new Error('No readable text was found in the selected file.')
  const authority = detectAuthority(text)
  const name = text.match(/^\s*(?:master circular|master direction|circular)\s*[:–-]?\s*(.{5,120})/im)?.[1]?.trim()
    ?? sourceName.replace(/\.[^.]+$/, '')
  const reference = text.match(/\b(?:circular|master direction)\s*(?:no\.?|number|ref\.?)\s*[:#-]?\s*([A-Z0-9./-]{4,})/i)?.[1]
    ?? sourceName.replace(/\.[^.]+$/, '')
  const effective = text.match(/\b(?:effective(?:\s+from)?|with effect from)\s*:?\s*(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/i)?.[1]

  return {
    id: `custom-${slug(`${reference}-${name}`) || Date.now().toString()}`,
    name,
    authority,
    circularRef: reference,
    effectiveDate: effective ? dateOnly(effective) : new Date().toISOString().slice(0, 10),
    documentTypes: guessDocumentTypes(text, authority),
    expectedSections: extractExpectedSections(text),
    mandates: extractMandates(text),
    complianceChecklist: extractChecklist(text),
    isCustom: true,
  }
}

export async function parseMasterCircularFile(file: File): Promise<CircularFramework> {
  return parseText(await extractTextFromFile(file), file.name)
}
