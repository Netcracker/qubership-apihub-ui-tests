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

import { Group } from '@test-data/props'
import { IMM_GR, VAR_GR } from '../groups'

export const P_GRP_GROUPING_R = new Group({
  name: 'Grouping',
  alias: 'GGR',
  parent: IMM_GR,
  description: 'Reusable group for grouping scope.',
})

export const P_GRP_GROUPING_N = new Group({
  name: 'Grouping',
  alias: 'GGN',
  parent: VAR_GR,
  description: 'Non-reusable group for grouping scope.',
})
