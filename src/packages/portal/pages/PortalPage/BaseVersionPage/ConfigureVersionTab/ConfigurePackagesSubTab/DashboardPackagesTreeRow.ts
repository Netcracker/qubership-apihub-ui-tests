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
import { Button, TableCell } from '@shared/components/base'
import { DashboardPackagesTreeCell } from './DashboardPackagesTreeRow/DashboardPackagesTreeCell'

export class DashboardPackagesTreeRow extends TableCell {

  readonly expandBtn = new Button(this.mainLocator.getByTestId('ExpandButton'), 'Expand')
  readonly collapseBtn = new Button(this.mainLocator.getByTestId('CollapseButton'), 'Collapse')
  readonly packageCell = new DashboardPackagesTreeCell(this.rootLocator, this.componentName)
  readonly versionCell = new TableCell(this.mainLocator.getByTestId('VersionCell'), 'Version')
  readonly statusCell = new TableCell(this.mainLocator.getByTestId('StatusCell'), 'Status')
  readonly removeBtn = new Button(this.mainLocator.getByTestId('RemoveButton'), 'Status')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }
}