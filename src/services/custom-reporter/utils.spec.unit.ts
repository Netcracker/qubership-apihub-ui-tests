import { expect, test } from '@playwright/test'
import { createEmptyRunResult } from './custom-reporter.test-helpers'
import { formatRunDuration, getAffectRatio } from './utils'

test.describe('custom-reporter utils unit tests', () => {
  test.describe('formatRunDuration', () => {
    test('formats Playwright FullResult.duration milliseconds as mm:ss', () => {
      expect.soft(formatRunDuration(125_000)).toBe('02:05 (mm:ss)')
      expect.soft(formatRunDuration(0)).toBe('00:00 (mm:ss)')
      expect.soft(formatRunDuration(500)).toBe('00:01 (mm:ss)')
    })
  })

  test.describe('getAffectRatio', () => {
    test('calculates ratio from failed, affected, and skipped tests', () => {
      const runResult = {
        ...createEmptyRunResult(),
        counts: {
          allTests: 10,
          executedTests: 10,
          passedTests: 5,
          failedTests: 2,
          flakyTests: 1,
          affectedTests: 3,
          skippedTests: 1,
        },
      }

      expect.soft(getAffectRatio(runResult)).toBe(60)
    })

    test('ignores flaky and passed tests in the numerator', () => {
      const runResult = {
        ...createEmptyRunResult(),
        counts: {
          allTests: 4,
          executedTests: 4,
          passedTests: 2,
          failedTests: 0,
          flakyTests: 2,
          affectedTests: 0,
          skippedTests: 0,
        },
      }

      expect.soft(getAffectRatio(runResult)).toBe(0)
    })

    test('returns 0 when there are no tests', () => {
      const runResult = createEmptyRunResult()
      expect.soft(getAffectRatio(runResult)).toBe(0)
    })
  })
})
