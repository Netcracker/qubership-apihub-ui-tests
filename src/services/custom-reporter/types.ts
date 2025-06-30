import type { TestError } from 'playwright/types/testReporter'

export type ReportType = 'summary-html' | 'github'

export type ReportRunResult = {
  status: ReportRunResultStatuses
  startTime: string
  duration: string
  workers: number
  counts: ReportRunResultCounts
  lists: ReportRunResultLists
}

export type ReportRunResultStatuses = 'Passed' | 'Failed' | 'Timed out' | 'Interrupted' | 'Unknown'

export type ReportRunResultCounts = {
  allTests: number
  executedTests: number
  passedTests: number
  failedTests: number
  flakyTests: number
  affectedTests: number
  skippedTests: number
}

export type ReportRunResultLists = {
  failedList: Map<string, ReportTestInfo>
  flakyList: Map<string, ReportTestInfo>
  affectedList: Map<string, ReportTestInfo>
  skippedList: Map<string, ReportTestInfo>
}

export type ReportTemplateContext = Omit<ReportRunResult, 'counts' | 'lists'> & ReportRunResultCounts & {
  style: string
  ratio: string
  envName: string
  backendVersion: string
  frontendVersion: string
  pwBranch: string
  ciJobLink: string
  ciUser: string
  failedTable: string
  flakyTable: string
  affectedTable: string
  skippedTable: string
}

export type ReportTestInfo = {
  project: string
  fullTitle: string
  testCaseUrl?: string
  issues: ReportTestIssues
  firstRetryErrors?: TestError[]
  tags?: string[]
  annotations?: Array<{ type: string; description?: string }>
}

export type ReportTestIssues = Set<{
  key: string
  url?: string
}>

export type GitHubReportOptions = {
  title: string
  affectRatio: boolean
}

export type CustomReporterOptions = {
  reportTypes: ReportType[]
  outputFolder?: string
  githubOptions?: GitHubReportOptions
}
