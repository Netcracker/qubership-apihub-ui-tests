import { test } from '@fixtures'
import { PortalPage } from '@portal/pages/PortalPage'
import { PortalTableRow } from '@portal/pages/PortalPage/PortalTableRow'
import { expect } from '@services/expect-decorator'
import { ALIAS_PREFIX } from '@test-data'
import { Group, Package, Workspace } from '@test-data/props'
import type { ItemGetterConfig } from './item-getter'
import { createItemGetter } from './item-getter'

test.describe('Item Getter tests', { tag: '@external' }, () => {
  const P_WS_DEBUG_R = new Workspace({
    name: 'debug',
    alias: `${ALIAS_PREFIX}D1-${process.env.TEST_ID_R}`,
    description: 'Reusable. Debug.',
  }, { testPrefix: true, testId: 'reusable' })

  const P_GR_ITEM_GETTER = new Group({
    name: 'Item Getter',
    alias: 'GRITGET',
    parent: P_WS_DEBUG_R,
  })

  const genPackageParams = (count: number): Package[] => {
    return Array.from({ length: count }, (_, index) => {
      const num: number = index + 1
      return new Package({
        name: `package-${num}`,
        alias: `PKG-${num}`,
        parent: P_GR_ITEM_GETTER,
      })
    })
  }

  const packages = genPackageParams(4)

  test.beforeAll('Create test data', async ({ apihubTDM }) => {
    const allPackages = [P_WS_DEBUG_R, P_GR_ITEM_GETTER, ...packages]

    for (const pkg of allPackages) {
      await test.step(`Create package "${pkg.name}"`, async () => {
        await apihubTDM.createPackage(pkg)
      })
    }
  })

  test('Check table rows', async ({ sysadminPage: page }) => {
    const portalPage = new PortalPage(page)

    const rulesetRowConfig: ItemGetterConfig<PortalTableRow> = {
      constructor: (locator, componentName, componentType) => new PortalTableRow(locator, componentName, componentType),
      // eslint-disable-next-line ui-testing/no-browser-commands-in-tests
      rootLocator: page.getByTestId('Cell-name'),
      navigateToParent: true,
      componentTypes: {
        singular: 'package row',
        plural: 'package rows',
      },
    }

    const getRow = createItemGetter(rulesetRowConfig)

    await portalPage.gotoGroup(P_GR_ITEM_GETTER)

    await expect(getRow()).toHaveCount(4)
    await expect(getRow('package', undefined, { exact: false })).toHaveCount(4)
    await expect(getRow(1)).toBeVisible()
    await expect(getRow(2)).toBeVisible()
    await expect(getRow(3)).toBeVisible()
    await expect(getRow(4)).toBeVisible()
    await expect(getRow('package-1')).toBeVisible()
    await expect(getRow('package-1', 1, { exact: true })).toBeVisible()
    await expect(getRow(/^package-1/, 1, { exact: true })).toBeVisible()
    await expect(getRow(/^package-1/i, 1)).toBeVisible()
    await expect(getRow(/^package/i)).toHaveCount(4)
    await expect(getRow(/^package/i, undefined, { exact: true })).toHaveCount(4)
  })
})
