import { expect, test } from '@playwright/test'
import { resolveCustomReporterOptions } from './resolve-options'

test.describe('resolveCustomReporterOptions', () => {
  test('applies defaults when options are empty', () => {
    expect(resolveCustomReporterOptions()).toEqual({
      outputFolder: 'reports/summary',
      html: true,
      github: false,
    })
  })

  test('resolves github options with defaults for omitted fields', () => {
    expect(resolveCustomReporterOptions({ github: { title: 'UI E2E' } })).toEqual({
      outputFolder: 'reports/summary',
      html: true,
      github: {
        title: 'UI E2E',
        affectRatio: false,
      },
    })
  })
})
