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
import { DocumentsOpenapiActionMenu } from '../../../DocumentsPackageTab/DocumentsOpenapiActionMenu'
import { Button, SearchBar, Title } from '@shared/components/base'

export class DocumentsOpenapiViewToolbar {

  readonly title = new Title(this.page.getByTestId('DocumentToolbarTitle'), 'Document')
  readonly searchbar = new SearchBar(this.page.getByTestId('SearchOperations'), 'Operations')
  readonly overviewBtn = new Button(this.page.locator('button[value=overview]'), 'Overview')
  readonly operationsBtn = new Button(this.page.locator('button[value=operations]'), 'Operations')
  readonly downloadMenu = new DocumentsOpenapiActionMenu(this.page.getByTestId('DocumentToolbar').getByTestId('DocumentActionsButton'), 'Markdown')

  constructor(private readonly page: Page) { }
}
