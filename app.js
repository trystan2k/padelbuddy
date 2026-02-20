import { createInitialMatchState } from './utils/match-state'
import { createHistoryStack } from './utils/history-stack'

App({
  globalData: {
    matchState: createInitialMatchState(),
    matchHistory: createHistoryStack()
  },
  onCreate(options) {
    console.log('app on create invoke')
  },

  onDestroy(options) {
    console.log('app on destroy invoke')
  }
})
