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

import type { Locator } from '@playwright/test'
import { BaseComponent, Content, Title } from '@shared/components/base'
import { OperationChangesSummary } from './OperationChangesSummary'

export class OperationComparisonSummary extends BaseComponent {

  readonly componentType: string = 'comparison summary'
  readonly title = new Title(this.rootLocator.getByTestId('OperationTitle'), this.componentName) //It's hard to add testid for `GroupCompareContent` in apihub-ui
  readonly path = new Content(this.rootLocator.getByTestId('OperationPath'), `Path ${this.componentName}`)
  readonly changes = new OperationChangesSummary(this.mainLocator.getByTestId('ChangesSummary'), this.componentName)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}