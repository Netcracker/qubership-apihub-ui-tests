import { expect, test } from '@playwright/test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createEmptyCounts, createEmptyRunResult } from '../custom-reporter.test-helpers'
import GitHubActionsReport, { buildGitHubSummaryTable } from './GitHubActionsReport'

const githubOptions = { title: 'UI E2E tests result', affectRatio: false }

function summaryRowLabels(rows: ReturnType<typeof buildGitHubSummaryTable>): string[] {
  return rows.map(row => row[0]?.data ?? '')
}

test.describe('GitHubActionsReport', () => {
  test.describe('buildGitHubSummaryTable', () => {
    test('always shows Executed and hides zero-count categories', () => {
      const runResult = {
        ...createEmptyRunResult('Passed'),
        counts: {
          ...createEmptyCounts(),
          allTests: 3,
          executedTests: 3,
          passedTests: 3,
        },
      }

      const labels = summaryRowLabels(buildGitHubSummaryTable(runResult, githubOptions))

      expect.soft(labels).toContain('Executed')
      expect.soft(labels).not.toContain('Skipped')
      expect.soft(labels).not.toContain('Flaky')
      expect.soft(labels).not.toContain('Failed')
    })

    test('shows only non-zero outcome categories', () => {
      const runResult = {
        ...createEmptyRunResult('Failed'),
        counts: {
          ...createEmptyCounts(),
          allTests: 4,
          executedTests: 3,
          passedTests: 1,
          failedTests: 1,
          flakyTests: 1,
          skippedTests: 1,
        },
      }

      const labels = summaryRowLabels(buildGitHubSummaryTable(runResult, githubOptions))

      expect.soft(labels).toEqual(['Summary', 'Status', 'Executed', 'Skipped', 'Flaky', 'Failed'])
    })

    test('marks status as Failed when Executed is zero', () => {
      const runResult = {
        ...createEmptyRunResult('Passed'),
        counts: createEmptyCounts(),
      }

      const rows = buildGitHubSummaryTable(runResult, githubOptions)
      const statusRow = rows.find(row => row[0]?.data === 'Status')
      const executedRow = rows.find(row => row[0]?.data === 'Executed')

      expect.soft(statusRow?.[1]?.data).toBe('❌ Failed')
      expect.soft(executedRow?.[1]?.data).toBe('0')
    })
  })

  test('writes summary markdown to GITHUB_STEP_SUMMARY', async () => {
    const outputFolder = mkdtempSync(join(tmpdir(), 'gh-step-summary-'))
    const summaryFile = join(outputFolder, 'summary.md')
    writeFileSync(summaryFile, '')
    const previous = process.env.GITHUB_STEP_SUMMARY
    process.env.GITHUB_STEP_SUMMARY = summaryFile

    try {
      const markdown = await new GitHubActionsReport(
        createEmptyRunResult('Failed'),
        githubOptions,
      ).write()

      expect.soft(markdown).toContain('UI E2E tests result')
      expect.soft(markdown).toContain('Failed')
      expect.soft(readFileSync(summaryFile, 'utf8')).toContain('UI E2E tests result')
    } finally {
      if (previous === undefined) {
        delete process.env.GITHUB_STEP_SUMMARY
      } else {
        process.env.GITHUB_STEP_SUMMARY = previous
      }
      rmSync(outputFolder, { recursive: true, force: true })
    }
  })
})
