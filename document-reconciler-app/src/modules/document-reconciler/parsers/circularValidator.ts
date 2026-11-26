import type {
  AmendmentNotice,
  CircularFramework,
  CircularMandate,
  CircularValidationItem,
  DocumentNode,
} from '../types'

const stopWords = new Set([
  'and', 'are', 'be', 'been', 'being', 'for', 'from', 'have', 'into', 'must',
  'shall', 'should', 'that', 'the', 'their', 'this', 'through', 'under', 'upon',
  'with', 'within',
])

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function terms(value: string): string[] {
  return normalize(value).split(/\s+/).filter((term) => term.length > 2 && !stopWords.has(term))
}

function containsPhrase(text: string, phrase: string): boolean {
  const normalizedText = normalize(text)
  const normalizedPhrase = normalize(phrase)
  return Boolean(normalizedPhrase && ` ${normalizedText} `.includes(` ${normalizedPhrase} `))
}

function getApprovedText(node: DocumentNode, amendments: AmendmentNotice[]): string {
  const approvedUpdates = amendments
    .filter((amendment) => amendment.status === 'approved' && amendment.targetNodeId === node.id)
    .map((amendment) => amendment.proposedText.trim())
    .filter((text) => text && !containsPhrase(node.fullContent, text))
  return [node.fullContent, ...approvedUpdates].filter(Boolean).join('\n')
}

function scoreNode(
  node: DocumentNode,
  content: string,
  mandate: CircularMandate,
): { score: number; related: boolean } {
  const heading = normalize(`${node.sectionCode} ${node.headingPath} ${node.title}`)
  const normalizedContent = normalize(content)
  const clauseRef = normalize(mandate.clauseRef)
  const exactRef = Boolean(clauseRef && containsPhrase(heading, clauseRef))
  const normalizedTitle = normalize(mandate.title)
  const titleTerms = terms(mandate.title)
  const matchingTitleTerms = titleTerms.filter((term) => heading.split(/\s+/).includes(term)).length
  const titleRatio = titleTerms.length ? matchingTitleTerms / titleTerms.length : 0
  const keywords = [...new Set(mandate.keywords.map(normalize).filter(Boolean))]
  const headingKeywordMatches = keywords.filter((keyword) => containsPhrase(heading, keyword)).length
  const contentKeywordMatches = keywords.filter((keyword) => containsPhrase(normalizedContent, keyword)).length
  const normalizedNodeTitle = normalize(node.title)
  const exactTitle = Boolean(normalizedTitle && (
    heading.includes(normalizedTitle) || (normalizedNodeTitle && normalizedTitle.includes(normalizedNodeTitle))
  ))
  const related = exactRef
    || exactTitle
    || titleRatio >= 0.5
    || headingKeywordMatches > 0
    || (keywords.length > 0 && contentKeywordMatches >= Math.min(2, keywords.length))

  return {
    related,
    score: (exactRef ? 1000 : 0)
      + (exactTitle ? 500 : 0)
      + Math.round(titleRatio * 200)
      + headingKeywordMatches * 50
      + contentKeywordMatches * 2,
  }
}

function findRelatedNode(
  nodes: DocumentNode[],
  mandate: CircularMandate,
  amendments: AmendmentNotice[],
): { node: DocumentNode; content: string } | undefined {
  let best: { node: DocumentNode; content: string; score: number; index: number } | undefined
  nodes.forEach((node, index) => {
    const content = getApprovedText(node, amendments)
    const match = scoreNode(node, content, mandate)
    if (!match.related) return
    if (!best || match.score > best.score || (match.score === best.score && index < best.index)) {
      best = { node, content, score: match.score, index }
    }
  })
  return best
}

function requiredPhrases(mandate: CircularMandate): string[] {
  return mandate.mandatoryPhrases.length > 0
    ? mandate.mandatoryPhrases
    : [mandate.requirementText]
}

export function validateDocumentAgainstCircular(
  fullDocNodes: DocumentNode[],
  framework: CircularFramework,
  appliedAmendments: AmendmentNotice[],
): CircularValidationItem[] {
  return framework.mandates.map((mandate) => {
    const match = findRelatedNode(fullDocNodes, mandate, appliedAmendments)
    const phrases = requiredPhrases(mandate)
    const missingPhrases = match?.content.trim()
      ? phrases.filter((phrase) => !containsPhrase(match.content, phrase))
      : phrases
    const status: CircularValidationItem['status'] = !match?.content.trim()
      ? 'missing'
      : missingPhrases.length > 0
        ? 'needs_update'
        : 'compliant'

    return {
      mandate,
      status,
      ...(match
        ? {
          matchedNodeId: match.node.id,
          matchedHeading: match.node.headingPath || match.node.title,
        }
        : {}),
      missingPhrases,
      resolutionStatus: 'unresolved',
    }
  })
}
