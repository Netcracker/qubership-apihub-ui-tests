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
    const status = this.getStatus()
    const affectRatio = this.getAffectRatio()
    const testCounts = this.getTestCounts()
    const failedTestsList = this.getFailedTestsList()

    const summary = `## ${title}

${status} ${affectRatio}

${testCounts}

${failedTestsList}`

    // Write to GitHub Actions summary
    await core.summary
      .addRaw(summary)
      .write()

    return summary
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

  private getTestCounts(): string {
    const { counts } = this.runResult
    return `**Tests:** ${counts.passedTests} passed, ${counts.failedTests} failed, ${counts.flakyTests} flaky, ${counts.skippedTests} skipped`
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

  private getFailedTestsList(): string {
    if (this.runResult.lists.failedList.size === 0) {
      return ''
    }

    let failedList = '### Failed Tests\n\n'

    this.runResult.lists.failedList.forEach((test, fullTitle) => {
      failedList += `<details>\n<summary>${fullTitle}</summary>\n\n`

      // Add tags if available
      if (test.tags && test.tags.length > 0) {
        failedList += '**Tags:** '
        const tags: string[] = []
        test.tags.forEach(tag => {
          tags.push(`\`${tag}\``)
        })
        failedList += `${tags.join(', ')}\n\n`
      }

      // Add annotations if available
      if (test.annotations && test.annotations.length > 0) {
        test.annotations.forEach(annotation => {
          failedList += `**${annotation.type}**${annotation.description ? `: ${annotation.description}` : ''}\n`
        })
        failedList += '\n'
      }

      // Add first retry errors if available
      if (test.firstRetryErrors && test.firstRetryErrors.length > 0) {
        failedList += '**Errors:**\n'
        test.firstRetryErrors.forEach(error => {
          failedList += `\`\`\`bash\n${this.formatTestError(error)}\n\`\`\`\n\n`
        })
      }

      failedList += '</details>\n\n'
    })

    return failedList
  }
}
