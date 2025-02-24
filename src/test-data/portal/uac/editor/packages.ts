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

import { Package } from '@test-data/props'
import { GRP_P_EDITOR_ROOT_N } from './groups'
import { TOKEN_EDITOR_PACKAGE } from './tokens'

export const PKG_P_EDITOR_N = new Package({
  name: 'Editor',
  alias: 'PEDITORN',
  parent: GRP_P_EDITOR_ROOT_N,
  restGroupingPrefix: '/api/{group}/',
  apiKeys: [TOKEN_EDITOR_PACKAGE],
}, { kindPrefix: true })
