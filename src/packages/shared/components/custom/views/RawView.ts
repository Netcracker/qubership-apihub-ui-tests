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
import { BaseComponent, Button } from '@shared/components/base'

export class RawView extends BaseComponent {

  readonly jsonBtn = new Button(this.page.getByTestId('ModeButton-JSON'), 'JSON')
  readonly yamlBtn = new Button(this.page.getByTestId('ModeButton-YAML'), 'YAML')

  constructor(private readonly page: Page) {
    super(page.locator('.monaco-editor').and(page.getByRole('code')), 'Raw view')
  }
}
