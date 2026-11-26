import type {
  AmendmentNotice,
  CircularFramework,
  CircularMandate,
  CircularValidationItem,
  DocumentNode,
  ExpectedSection,
  ReconcilerWorkspaceData,
} from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isExpectedSection(value: unknown): value is ExpectedSection {
  if (!isRecord(value)) return false
  return typeof value.code === 'string'
    && typeof value.title === 'string'
    && Array.isArray(value.keywords)
    && value.keywords.every((keyword) => typeof keyword === 'string')
    && (value.mandatoryRule === undefined || typeof value.mandatoryRule === 'string')
}

function isCircularMandate(value: unknown): value is CircularMandate {
  if (!isRecord(value)) return false
  return typeof value.id === 'string'
    && typeof value.clauseRef === 'string'
    && typeof value.title === 'string'
    && typeof value.requirementText === 'string'
    && Array.isArray(value.keywords)
    && value.keywords.every((item) => typeof item === 'string')
    && Array.isArray(value.mandatoryPhrases)
    && value.mandatoryPhrases.every((item) => typeof item === 'string')
    && typeof value.suggestedInsertionText === 'string'
}

function isCircularValidationItem(value: unknown): value is CircularValidationItem {
  if (!isRecord(value)) return false
  return isCircularMandate(value.mandate)
    && (value.status === 'compliant' || value.status === 'needs_update' || value.status === 'missing')
    && (value.matchedNodeId === undefined || typeof value.matchedNodeId === 'string')
    && (value.matchedHeading === undefined || typeof value.matchedHeading === 'string')
    && Array.isArray(value.missingPhrases)
    && value.missingPhrases.every((item) => typeof item === 'string')
    && (value.resolutionStatus === 'unresolved' || value.resolutionStatus === 'applied' || value.resolutionStatus === 'waived')
}

function isDocumentNode(value: unknown): value is DocumentNode {
  if (!isRecord(value)) return false
  return typeof value.id === 'string'
    && typeof value.orderIndex === 'number'
    && Number.isFinite(value.orderIndex)
    && typeof value.headingPath === 'string'
    && typeof value.sectionCode === 'string'
    && typeof value.title === 'string'
    && typeof value.fullContent === 'string'
    && (value.pairedDocContent === undefined || typeof value.pairedDocContent === 'string')
    && typeof value.isImpacted === 'boolean'
    && (value.circularComplianceNote === undefined || typeof value.circularComplianceNote === 'string')
}

function isCircularFramework(value: unknown): value is CircularFramework {
  if (!isRecord(value)) return false
  return typeof value.id === 'string'
    && typeof value.name === 'string'
    && (value.authority === 'SEBI' || value.authority === 'RBI' || value.authority === 'Other')
    && typeof value.circularRef === 'string'
    && typeof value.effectiveDate === 'string'
    && Array.isArray(value.documentTypes)
    && value.documentTypes.length === 2
    && value.documentTypes.every((label) => typeof label === 'string')
    && Array.isArray(value.expectedSections)
    && value.expectedSections.every(isExpectedSection)
    && Array.isArray(value.mandates)
    && value.mandates.every(isCircularMandate)
    && Array.isArray(value.complianceChecklist)
    && value.complianceChecklist.every((item) => typeof item === 'string')
    && (value.isCustom === undefined || typeof value.isCustom === 'boolean')
}

function isAmendmentNotice(value: unknown): value is AmendmentNotice {
  if (!isRecord(value)) return false
  return typeof value.id === 'string'
    && typeof value.fileName === 'string'
    && typeof value.noticeNumber === 'string'
    && typeof value.noticeDate === 'string'
    && typeof value.effectiveDate === 'string'
    && typeof value.impactedScope === 'string'
    && typeof value.targetNodeId === 'string'
    && typeof value.targetHeading === 'string'
    && typeof value.originalExcerpt === 'string'
    && typeof value.proposedText === 'string'
    && (value.sourceText === undefined || typeof value.sourceText === 'string')
    && (value.parseError === undefined || typeof value.parseError === 'string')
    && (value.targetSource === undefined || value.targetSource === 'automatic' || value.targetSource === 'manual')
    && (value.status === 'pending' || value.status === 'approved' || value.status === 'rejected')
    && (value.reviewedAt === undefined || typeof value.reviewedAt === 'string')
}

export function isWorkspaceData(value: unknown): value is ReconcilerWorkspaceData {
  if (!isRecord(value)) return false
  return Array.isArray(value.frameworks)
    && value.frameworks.every(isCircularFramework)
    && Array.isArray(value.documentNodes)
    && value.documentNodes.every(isDocumentNode)
    && Array.isArray(value.notices)
    && value.notices.every(isAmendmentNotice)
    && (value.circularValidationItems === undefined
      || (Array.isArray(value.circularValidationItems) && value.circularValidationItems.every(isCircularValidationItem)))
    && (value.circularClauseEdits === undefined
      || (isRecord(value.circularClauseEdits) && Object.values(value.circularClauseEdits).every((item) => typeof item === 'string')))
    && (value.primaryFileName === undefined || typeof value.primaryFileName === 'string')
    && (value.secondaryFileName === undefined || typeof value.secondaryFileName === 'string')
    && (value.isSampleMode === undefined || typeof value.isSampleMode === 'boolean')
}

export function migrateWorkspaceData(value: unknown): unknown {
  if (!isRecord(value) || !Array.isArray(value.frameworks)) return value
  return {
    ...value,
    frameworks: value.frameworks.map((framework) => (
      isRecord(framework) && framework.mandates === undefined
        ? { ...framework, mandates: [] }
        : framework
    )),
  }
}
