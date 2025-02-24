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

import { type Page } from '@playwright/test'
import { Backdrop, Snackbar } from '@shared/components/base'
import { MainPageHeader } from '@shared/components/custom'
import { BasePage } from './BasePage'

export abstract class MainPage extends BasePage {

  readonly snackbar = new Snackbar(this.page)
  readonly backdrop = new Backdrop(this.page.locator('.MuiBackdrop-root').last())
  readonly header = new MainPageHeader(this.page)

  protected constructor(protected readonly page: Page) {
    super(page)
  }
}
