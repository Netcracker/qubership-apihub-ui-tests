import type { FullConfig, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter'
import type { CustomReporterOptions, GitHubReportOptions, ReportRunResult, ReportType } from './types'
import ApihubStyledHtmlReport from './reports/ApihubStyledHtmlReport'
import GitHubActionsReport from './reports/GitHubActionsReport'
import { formatDate, getTestInfo, millisecondsToMinuteSeconds } from './utils'
import { SETUP_PROJECTS } from './consts'
import { mkdirSync, writeFileSync } from 'fs'
import type { FullResult } from 'playwright/types/testReporter'

const initialRunResult = (): ReportRunResult => ({
  status: 'Unknown',
  startTime: '',
  duration: '',
  workers: 0,
  counts: {
    allTests: 0,
    executedTests: 0,
    passedTests: 0,
    failedTests: 0,
    flakyTests: 0,
    affectedTests: 0,
    skippedTests: 0,
  },
  lists: {
    failedList: new Map(),
    flakyList: new Map(),
    affectedList: new Map(),
    skippedList: new Map(),
  },
})

class CustomReporter implements Reporter {

  readonly reportTypes = this.options.reportTypes
  readonly outputFolder = this.options.outputFolder
  readonly githubOptions = this.options.githubOptions

  private setupTests = 0

  private runResult!: ReportRunResult

  constructor(readonly options: CustomReporterOptions) { }

  async onBegin(config: FullConfig, suite: Suite): Promise<void> {
    this.runResult = initialRunResult()
    this.runResult.counts.allTests = suite.allTests().length
    this.runResult.workers = config.workers
  }

  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    const outcome = test.outcome()
    const { retry } = result
    const testInfo = getTestInfo(test)
    const isSetupTest = SETUP_PROJECTS.includes(testInfo.project)

    // Collect first retry errors
    if (retry === 0 && result.errors.length > 0) {
      testInfo.firstRetryErrors = result.errors
    }

    const removeFromFailedList = (): void => {
      this.runResult.lists.failedList.delete(testInfo.fullTitle)
      if (!isSetupTest) {
        this.runResult.counts.failedTests--
      }
    }

    switch (outcome) {
      case 'expected': {
        if (isSetupTest) {
          this.setupTests++
        } else if (testInfo.issues.size > 0) {
          this.runResult.counts.affectedTests++
          this.runResult.lists.affectedList.set(testInfo.fullTitle, testInfo)
        } else {
          this.runResult.counts.passedTests++
        }
        break
      }
      case 'skipped': {
        if (isSetupTest) {
          this.setupTests++
        } else {
          this.runResult.counts.skippedTests++
          this.runResult.lists.skippedList.set(testInfo.fullTitle, testInfo)
        }
        break
      }
      case 'flaky': {
        removeFromFailedList()
        this.runResult.lists.flakyList.set(testInfo.fullTitle, testInfo)
        isSetupTest ? this.setupTests++ : this.runResult.counts.flakyTests++
        break
      }
      case 'unexpected':
        if (retry === 0) {
          this.runResult.lists.failedList.set(testInfo.fullTitle, testInfo)
          isSetupTest ? this.setupTests++ : this.runResult.counts.failedTests++
        }
        break
    }

    if (retry === 0 && outcome !== 'skipped' && !isSetupTest) {
      this.runResult.counts.executedTests++
    }
  }

  async onEnd(result: FullResult): Promise<void> {
    this.runResult.startTime = formatDate(result.startTime)
    this.runResult.duration = millisecondsToMinuteSeconds(result.duration) //since playwright v1.38.0
    this.runResult.counts.allTests -= this.setupTests
    switch (result.status) {
      case 'passed': {
        this.runResult.status = 'Passed'
        break
      }
      case 'failed': {
        this.runResult.status = 'Failed'
        break
      }
      case 'timedout': {
        this.runResult.status = 'Timed out'
        break
      }
      case 'interrupted': {
        this.runResult.status = 'Interrupted'
        break
      }
    }
    await outputReport(this.runResult, this.reportTypes, this.outputFolder, this.githubOptions)
  }
}

async function outputReport(
  runResult: ReportRunResult,
  reportTypes: ReportType[],
  outputFolder = 'reports/summary',
  githubOptions?: GitHubReportOptions,
): Promise<void> {

  const getReportByType = async (_reportType: ReportType): Promise<string> => {
    switch (_reportType) {
      case 'summary-html': {
        return new ApihubStyledHtmlReport(runResult).getReport()
      }
      case 'github': {
        return new GitHubActionsReport(runResult, githubOptions).getReport()
      }
      default: {
        throw new Error(`Invalid report type: "${_reportType}" `)
      }
    }
  }

  mkdirSync(outputFolder, { recursive: true })

  // Generate reports for each type
  for (const reportType of reportTypes) {
    if (reportType === 'summary-html') {
      writeFileSync(`${outputFolder}/summary-report.html`, await getReportByType(reportType))
    } else if (reportType === 'github') {
      // GitHub report writes directly to GitHub Actions summary
      await getReportByType(reportType)
    }
  }

  writeFileSync(`${outputFolder}/status`, runResult.status)
}

export default CustomReporter
