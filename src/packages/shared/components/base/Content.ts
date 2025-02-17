import type { Locator } from '@playwright/test'
import { BaseComponent } from './BaseComponent'

export class Content extends BaseComponent {

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'content')
  }
}
