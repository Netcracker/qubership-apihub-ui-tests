/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { test } from '@fixtures'
import type { Page } from '@playwright/test'
import { Button } from '@shared/components/base'
import { BaseCancelDialog } from './BaseCancelDialog'

export abstract class BaseImportDialog extends BaseCancelDialog {

  readonly importBtn = new Button(this.rootLocator.getByTestId('ImportButton')
    .or(this.rootLocator.getByRole('button', { name: 'Import' })), 'Import')

  protected constructor(protected readonly page: Page) {
    super(page)
  }

  /** @deprecated */
  async clickImport(): Promise<void> {
    await test.step('Click \'Import\' button', async () => {
      await this.importBtn.click()
    })
  }
}