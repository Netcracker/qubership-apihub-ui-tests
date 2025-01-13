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

import type { APIRequestContext, APIResponse } from '@playwright/test'

export async function rGetUsersList(rc: APIRequestContext, params: { textFilter?: string }): Promise<APIResponse> {
  const _textFilter = params.textFilter ? encodeURIComponent(params.textFilter) : ''
  return await rc.get(`/api/v2/users?filter=${_textFilter}`)
}