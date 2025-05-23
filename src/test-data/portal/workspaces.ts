import { ALIAS_PREFIX, TEST_PREFIX } from '@test-data'
import { Workspace } from '@test-data/props'

export const P_WS_MAIN_R = new Workspace({
  name: 'Portal-main',
  alias: `${ALIAS_PREFIX}P1-${process.env.TEST_ID_R}`,
  description: 'Reusable. Main workspace.',
}, { testPrefix: true, testId: 'reusable' })

export const P_WS_CREATE_N = new Workspace({
  name: 'Portal-created',
  alias: `${ALIAS_PREFIX}P2-${process.env.TEST_ID_N}`,
  description: 'Non-reusable. Creation.',
}, { testPrefix: true, testId: 'non-reusable' })

export const P_WS_UPDATE_N = new Workspace({
  name: 'Portal-update',
  alias: `${ALIAS_PREFIX}P3-${process.env.TEST_ID_N}`,
  description: 'Non-reusable. Updating.',
  testMeta: {
    updatedName: `${TEST_PREFIX}Portal-updated-${process.env.TEST_ID_N}`,
    updatedDescription: 'Updated',
  },
}, { testPrefix: true, testId: 'non-reusable' })

export const P_WS_DELETE_N = new Workspace({
  name: 'Portal-delete',
  alias: `${ALIAS_PREFIX}P4-${process.env.TEST_ID_N}`,
  description: 'Non-reusable. Deletion.',
}, { testPrefix: true, testId: 'non-reusable' })

export const P_WS_FAV_LIST_N = new Workspace({
  name: 'Portal-favorite-list',
  alias: `${ALIAS_PREFIX}P5-${process.env.TEST_ID_N}`,
  description: 'Non-reusable. Adding to favorite by list.',
}, { testPrefix: true, testId: 'non-reusable' })

export const P_WS_FAV_TITLE_N = new Workspace({
  name: 'Portal-favorite-title',
  alias: `${ALIAS_PREFIX}P6-${process.env.TEST_ID_N}`,
  description: 'Non-reusable. Adding to favorite by title.',
}, { testPrefix: true, testId: 'non-reusable' })

export const P_WS_UNFAV_LIST_N = new Workspace({
  name: 'Portal-unfavorite-list',
  alias: `${ALIAS_PREFIX}P7-${process.env.TEST_ID_N}`,
  description: 'Non-reusable. Removing from favorite by list.',
}, { testPrefix: true, testId: 'non-reusable' })

export const P_WS_UNFAV_TITLE_N = new Workspace({
  name: 'Portal-unfavorite-title',
  alias: `${ALIAS_PREFIX}P8-${process.env.TEST_ID_N}`,
  description: 'Non-reusable. Removing from favorite by title.',
}, { testPrefix: true, testId: 'non-reusable' })
