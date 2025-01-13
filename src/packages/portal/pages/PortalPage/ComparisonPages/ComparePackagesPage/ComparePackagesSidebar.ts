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

import type { Page } from '@playwright/test'
import { Button, SearchBar, TagButton } from '@shared/components/base'

export class ComparePackagesSidebar {

  readonly restApiBtn = new Button(this.page.getByTestId('ApiTypeButton-rest'), 'REST API')
  readonly graphQlBtn = new Button(this.page.getByTestId('ApiTypeButton-graphql'), 'GraphQL')
  readonly searchbar = new SearchBar(this.page.getByTestId('SearchTags'), 'Tags')

  constructor(private readonly page: Page) { }

  getTagButton(tagName?: string): TagButton {
    if (tagName) {
      return new TagButton( this.page.getByTestId('TagsList').getByRole('button', { name: tagName, exact: true }), tagName)
    } else {
      return new TagButton(this.page.getByTestId('TagsList').getByRole('button'))
    }
  }
}
