import type { TestCase } from '@playwright/test/reporter'
import { TICKET_BASE_URL } from '@test-setup'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ReportRunResult, ReportTemplateContext, ReportTestInfo } from './types'

const reportAssetsDir = join(dirname(fileURLToPath(import.meta.url)), 'reports')

export function getAffectRatio(runResult: ReportRunResult): number {
  const { failedTests, affectedTests, skippedTests, allTests } = runResult.counts
  return allTests === 0 ? 0 : Math.round((failedTests + affectedTests + skippedTests) * 100 / allTests)
}

export function formatDate(date: Date): string {
  return date.toLocaleString('en-EN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    timeZone: 'Europe/Moscow',
    timeZoneName: 'short',
    hour12: false,
  })
}

export function formatRunDuration(durationMs: number): string {
  if (durationMs <= 0) {
    return '00:00 (mm:ss)'
  }
  if (durationMs < 1000) {
    return '00:01 (mm:ss)'
  }
  const totalSeconds = Math.ceil(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} (mm:ss)`
}

export function formatTemplate(template: string, context: ReportTemplateContext): string {
  return Object.entries(context).reduce((page, [key, value]) => {
    return page.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
  }, template)
}

export function loadFileForReport(file: string): string {
  return readFileSync(join(reportAssetsDir, file), 'utf8')
}

export function getTestInfo(test: TestCase): ReportTestInfo {
  const [, project] = test.titlePath()
  const testInfo: ReportTestInfo = {
    project: project,
    fullTitle: `${project} > ${test.parent.title} > ${test.title}`,
    issues: new Set(),
    tags: test.tags.length > 0 ? [...test.tags] : [],
    annotations: test.annotations.length > 0 ? [...test.annotations] : [],
  }

  for (const annotation of test.annotations) {
    if (annotation.type === 'Test Case' || annotation.type === 'URL') {
      testInfo.testCaseUrl = annotation.description
    }
    if (annotation.type === 'Issue' && annotation.description) {
      const url = annotation.description.startsWith('https') ? annotation.description : undefined
      const key = annotation.description.replace(TICKET_BASE_URL, '')
      testInfo.issues.add({ key, url })
    }
  }

  return testInfo
}
