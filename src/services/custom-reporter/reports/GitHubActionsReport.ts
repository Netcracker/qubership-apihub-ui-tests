import type { GitHubReportOptions, ReportRunResult } from '../types'
import type { TestError } from 'playwright/types/testReporter'
import BaseReport from './BaseReport'
import { getAffectRatio } from '../utils'
import * as core from '@actions/core'

export default class GitHubActionsReport extends BaseReport {

  constructor(
    readonly runResult: ReportRunResult,
    private readonly options: GitHubReportOptions = {},
  ) {
    super()
  }

  async getReport(): Promise<string> {
    // Check if running in GitHub Actions environment
    if (!this.isGitHubCI()) {
      console.warn('GitHub Actions report requested but not running in GitHub CI environment')
      return ''
    }

    const title = this.options.githubTitle || 'Playwright tests result'

    // Build the summary using @actions/core methods
    core.summary
      .addHeading(title, 2)
      .addTable(this.getSummaryTable())
      .addSeparator()

    // Add failed tests section if there are any
    if (this.runResult.lists.failedList.size > 0) {
      core.summary.addHeading('Failed Tests', 3)
      this.addFailedTestsDetails()
    }

    // Write to GitHub Actions summary
    await core.summary.write()

    return core.summary.stringify()
  }

  private isGitHubCI(): boolean {
    return process.env.GITHUB_ACTIONS === 'true'
  }

  private getStatus(): string {
    const statusMap = {
      'Passed': '✅ Passed',
      'Failed': '❌ Failed',
      'Timed out': '⏰ Timed out',
      'Interrupted': '⚠️ Interrupted',
      'Unknown': '❓ Unknown',
    }
    return statusMap[this.runResult.status]
  }

  private getAffectRatio(): string {
    const ratio = getAffectRatio(this.runResult)
    let icon = '✅'
    if (ratio > 30) {
      icon = '❌'
    } else if (ratio > 20) {
      icon = '⚠️'
    }
    return `${icon} Affect Ratio: ${ratio}%`
  }

  private getSummaryTable(): Array<Array<{ data: string; header?: boolean; colspan?: string }>> {
    const { counts } = this.runResult
    const status = this.getStatus()
    const affectRatio = this.getAffectRatio()

    return [
      [
        { data: 'Summary', header: true, colspan: '2' },
      ],
      [
        { data: 'Status' },
        { data: status },
      ],
      [
        { data: 'Affect Ratio' },
        { data: affectRatio },
      ],
      [
        { data: 'All' },
        { data: counts.allTests.toString() },
      ],
      [
        { data: 'Failed' },
        { data: counts.failedTests.toString() },
      ],
      [
        { data: 'Flaky' },
        { data: counts.flakyTests.toString() },
      ],
      [
        { data: 'Skipped' },
        { data: counts.skippedTests.toString() },
      ],
    ]
  }

  private formatTestError(error: TestError): string {
    const parts: string[] = []

    if (error.message) {
      parts.push(`Message: ${error.message}`)
    }

    if (error.stack) {
      parts.push(`Stack: ${error.stack}`)
    }

    if (error.value) {
      parts.push(`Value: ${error.value}`)
    }

    // If no specific fields are available, fallback to string representation
    if (parts.length === 0) {
      return error.toString()
    }

    return parts.join('\n')
  }

  private addFailedTestsDetails(): void {
    this.runResult.lists.failedList.forEach((test, fullTitle) => {
      // Build details content directly using @actions/core methods
      let detailsContent = ''

      // Add tags if available
      if (test.tags && test.tags.length > 0) {
        detailsContent += `**Tags:** ${test.tags.map(tag => `\`${tag}\``).join(' ')}\n\n`
      }

      // Add annotations if available
      if (test.annotations && test.annotations.length > 0) {
        test.annotations.forEach(annotation => {
          detailsContent += `**${annotation.type}**${annotation.description ? `: ${annotation.description}` : ''}\n`
        })
        detailsContent += '\n'
      }

      // Add first retry errors if available
      if (test.firstRetryErrors && test.firstRetryErrors.length > 0) {
        detailsContent += '**Errors:**\n\n'
        test.firstRetryErrors.forEach(error => {
          const formattedError = this.formatTestError(error)
          detailsContent += `\`\`\`bash\n${formattedError}\n\`\`\`\n\n`
        })
      }

      // Add the details section for this test directly to the main summary
      core.summary.addDetails(fullTitle, detailsContent)
    })
    core.summary.addSeparator()
  }
}
