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
import { Tab } from '@shared/components/base'
import { AgentSnapshotsServiceRow } from './SnapshotsTab/AgentSnapshotsServiceRow'
import { AgentSnapshotsSnapshotRow } from '@agent/pages/AgentPage/SnapshotsTab/AgentSnapshotsSnapshotRow'
import { nthPostfix } from '@services/utils'

export class AgentSnapshotsTab extends Tab {

  constructor(page: Page) {
    super(page.getByTestId('SnapshotsTabButton'), 'Snapshots')
  }

  getServiceRow(serviceName?: string, exact?: boolean): AgentSnapshotsServiceRow
  getServiceRow(nth?: number): AgentSnapshotsServiceRow
  getServiceRow(serviceName?: string, exact?: boolean, nth?: number): AgentSnapshotsServiceRow
  getServiceRow(serviceNameOrNth?: string | number, exact = true, nth?: number): AgentSnapshotsServiceRow {
    if (typeof serviceNameOrNth === 'string' && !nth) {
      return new AgentSnapshotsServiceRow(this.page.getByRole('cell', {
        name: serviceNameOrNth,
        exact: exact,
      }).locator('..'), serviceNameOrNth)
    }
    if (typeof serviceNameOrNth === 'number') {
      return new AgentSnapshotsServiceRow(this.page.getByTestId('Cell-snapshot-or-service').nth(serviceNameOrNth - 1).locator('..'), '', `${serviceNameOrNth}${nthPostfix(serviceNameOrNth)} service row`)
    }
    if (!serviceNameOrNth && !nth) {
      return new AgentSnapshotsServiceRow(this.page.getByTestId('Cell-snapshot-or-service').locator('..'))
    }
    if (serviceNameOrNth && nth) {
      return new AgentSnapshotsServiceRow(this.page.getByRole('cell', {
          name: serviceNameOrNth,
          exact: exact,
        }).locator('..').nth(nth - 1),
        serviceNameOrNth,
        `${nth}${nthPostfix(nth)} service row`)
    }
    throw new Error('Check arguments')
  }

  getSnapshotRow(serviceName?: string, exact?: boolean): AgentSnapshotsSnapshotRow
  getSnapshotRow(nth?: number): AgentSnapshotsSnapshotRow
  getSnapshotRow(serviceName?: string, exact?: boolean, nth?: number): AgentSnapshotsSnapshotRow
  getSnapshotRow(serviceNameOrNth?: string | number, exact = true, nth?: number): AgentSnapshotsSnapshotRow {
    if (typeof serviceNameOrNth === 'string' && !nth) {
      return new AgentSnapshotsSnapshotRow(this.page.getByRole('cell', {
        name: serviceNameOrNth,
        exact: exact,
      }).locator('..'), serviceNameOrNth)
    }
    if (typeof serviceNameOrNth === 'number') {
      return new AgentSnapshotsSnapshotRow(this.page.getByTestId('Cell-snapshot-or-service').nth(serviceNameOrNth - 1).locator('..'), '', `${serviceNameOrNth}${nthPostfix(serviceNameOrNth)} service row`)
    }
    if (!serviceNameOrNth && !nth) {
      return new AgentSnapshotsSnapshotRow(this.page.getByTestId('Cell-snapshot-or-service').locator('..'))
    }
    if (serviceNameOrNth && nth) {
      return new AgentSnapshotsSnapshotRow(this.page.getByRole('cell', {
          name: serviceNameOrNth,
          exact: exact,
        }).locator('..').nth(nth - 1),
        serviceNameOrNth,
        `${nth}${nthPostfix(nth)} service row`)
    }
    throw new Error('Check arguments')
  }
}