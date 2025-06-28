import { expect, test } from '@playwright/test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createEmptyRunResult } from '../custom-reporter.test-helpers'
import GitHubActionsReport from './GitHubActionsReport'

test.describe('GitHubActionsReport', () => {
  test('writes summary markdown to GITHUB_STEP_SUMMARY', async () => {
    const outputFolder = mkdtempSync(join(tmpdir(), 'gh-step-summary-'))
    const summaryFile = join(outputFolder, 'summary.md')
    writeFileSync(summaryFile, '')
    const previous = process.env.GITHUB_STEP_SUMMARY
    process.env.GITHUB_STEP_SUMMARY = summaryFile

    try {
      const markdown = await new GitHubActionsReport(
        createEmptyRunResult('Failed'),
        { title: 'UI E2E tests result', affectRatio: false },
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
