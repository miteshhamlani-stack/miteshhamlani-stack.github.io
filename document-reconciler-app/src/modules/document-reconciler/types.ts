export interface DocumentNode {
  id: string
  orderIndex: number
  headingPath: string
  sectionCode: string
  title: string
  fullContent: string
  pairedDocContent?: string
  isImpacted: boolean
  circularComplianceNote?: string
}

export interface ExpectedSection {
  code: string
  title: string
  keywords: string[]
  mandatoryRule?: string
}

export interface CircularMandate {
  id: string
  clauseRef: string
  title: string
  requirementText: string
  keywords: string[]
  mandatoryPhrases: string[]
  suggestedInsertionText: string
}

export interface CircularValidationItem {
  mandate: CircularMandate
  status: 'compliant' | 'needs_update' | 'missing'
  matchedNodeId?: string
  matchedHeading?: string
  missingPhrases: string[]
  resolutionStatus: 'unresolved' | 'applied' | 'waived'
}

export interface CircularFramework {
  id: string
  name: string
  authority: 'SEBI' | 'RBI' | 'Other'
  circularRef: string
  effectiveDate: string
  documentTypes: [string, string]
  expectedSections: ExpectedSection[]
  mandates: CircularMandate[]
  complianceChecklist: string[]
  isCustom?: boolean
}

export interface AmendmentNotice {
  id: string
  fileName: string
  noticeNumber: string
  noticeDate: string
  effectiveDate: string
  impactedScope: string
  targetNodeId: string
  targetHeading: string
  originalExcerpt: string
  proposedText: string
  sourceText?: string
  parseError?: string
  targetSource?: 'automatic' | 'manual'
  status: 'pending' | 'approved' | 'rejected'
  reviewedAt?: string
}

export interface ReconcilerWorkspaceData {
  frameworks: CircularFramework[]
  documentNodes: DocumentNode[]
  notices: AmendmentNotice[]
  circularValidationItems?: CircularValidationItem[]
  circularClauseEdits?: Record<string, string>
  primaryFileName?: string
  secondaryFileName?: string
  isSampleMode?: boolean
}
