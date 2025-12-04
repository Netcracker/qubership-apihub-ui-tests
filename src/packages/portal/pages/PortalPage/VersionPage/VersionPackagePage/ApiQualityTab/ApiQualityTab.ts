import type { Page } from '@playwright/test'
import { createItemGetter, type ItemGetterConfig } from '@services/utils'
import { Placeholder, Tab, Title } from '@shared/components/base'
import { RawView } from '@shared/components/custom/views/RawView'
import { RulesetInfoDialog } from '../../VersionOverviewTab/OverviewSummaryTab/components/RulesetInfoDialog'
import { ValidationRuleset } from '../../VersionOverviewTab/OverviewSummaryTab/OverviewSummaryTabBody/QualityValidationSection/ValidationRuleset'
import { ValidatedDocumentSelect } from './ValidatedDocumentSelect'
import { ValidationResultsTableRow } from './ValidationResultsTableRow'

export class ApiQualityTab extends Tab {
  readonly title = new Title(this.page.getByTestId('QualityValidationTitle'), 'Quality Validation')
  readonly noResultsPlaceholder = new Placeholder(
    this.page.getByTestId('ApiQualityNoResultsPlaceholder'),
    'API Quality no results',
  )
  readonly documentSlt = new ValidatedDocumentSelect(this.page)
  readonly ruleset = new ValidationRuleset(
    this.page.getByTestId('ValidationRulesetContainer'),
    'Quality validation',
  )
  readonly rawView = new RawView(this.page)
  readonly rulesetInfoDialog = new RulesetInfoDialog(this.page)

  private readonly problemRowConfig: ItemGetterConfig<ValidationResultsTableRow> = {
    constructor: ValidationResultsTableRow,
    rootLocator: this.page.getByTestId('Cell-message'),
    navigateToParent: true,
    componentTypes: {
      singular: 'problem row',
      plural: 'problem rows',
    },
  }

  readonly getProblemRow = createItemGetter(this.problemRowConfig)

  constructor(protected readonly page: Page) {
    super(page.getByTestId('ApiQualityTabButton'), 'API Quality')
  }
}
