import { gettext } from 'i18n'
import { createHistoryStack } from '../utils/history-stack.js'
import { createInitialMatchState } from '../utils/match-state.js'
import { MATCH_STATUS as PERSISTED_MATCH_STATUS } from '../utils/match-state-schema.js'
import { loadMatchState } from '../utils/match-storage.js'
import { startNewMatchFlow } from '../utils/start-new-match-flow.js'

const PERSISTED_ADVANTAGE_POINT_VALUE = 50
const PERSISTED_GAME_POINT_VALUE = 60
const TIE_BREAK_ENTRY_GAMES = 6
const REGULAR_GAME_POINT_VALUES = new Set([0, 15, 30, 40])

const HOME_TOKENS = Object.freeze({
  colors: {
    background: 0x000000,
    buttonText: 0x000000,
    primaryButton: 0x1eb98c,
    primaryButtonPressed: 0x1aa07a,
    secondaryButton: 0x24262b,
    secondaryButtonPressed: 0x2d3036,
    secondaryButtonText: 0xffffff,
    dangerButton: 0x3a1a1c,
    dangerButtonArmed: 0x7a1f28,
    dangerButtonPressed: 0x4a2022,
    dangerButtonArmedPressed: 0x9a2530,
    dangerButtonText: 0xff6d78,
    logo: 0x1eb98c,
    title: 0xffffff,
    settingsIcon: 0x888888,
    settingsIconPressed: 0xaaaaaa
  },
  fontScale: {
    button: 0.055,
    logo: 0.068,
    title: 0.0825
  },
  spacingScale: {
    contentTop: 0.1,
    logoToTitle: 0.012,
    titleToPrimaryButton: 0.05,
    primaryToSecondaryButton: 0.04,
    tertiaryToClearButton: 0.025,
    buttonToSettingsIcon: 0.04
  },
  buttonSize: {
    height: 0.2,
    width: 0.7,
    radiusRatio: 0.5,
    gap: 0.04
  },
  settingsIcon: {
    size: 48,
    yOffset: 0.15
  }
})

function cloneMatchState(matchState) {
  try {
    return JSON.parse(JSON.stringify(matchState))
  } catch {
    return matchState
  }
}

function ensureNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function isRecord(value) {
  return typeof value === 'object' && value !== null
}

function toNonNegativeInteger(value, fallback = 0) {
  return Number.isInteger(value) && value >= 0 ? value : fallback
}

function toPositiveInteger(value, fallback = 1) {
  return Number.isInteger(value) && value > 0 ? value : fallback
}

function cloneSetHistory(setHistory) {
  if (!Array.isArray(setHistory)) {
    return []
  }

  return setHistory.map((entry, index) => ({
    setNumber: toPositiveInteger(entry?.setNumber, index + 1),
    teamAGames: toNonNegativeInteger(entry?.teamAGames, 0),
    teamBGames: toNonNegativeInteger(entry?.teamBGames, 0)
  }))
}

function resolveWinnerTeam(matchState) {
  if (!isRecord(matchState)) {
    return null
  }

  if (matchState.winnerTeam === 'teamA' || matchState.winnerTeam === 'teamB') {
    return matchState.winnerTeam
  }

  if (
    isRecord(matchState.winner) &&
    (matchState.winner.team === 'teamA' || matchState.winner.team === 'teamB')
  ) {
    return matchState.winner.team
  }

  return null
}

function isActivePersistedMatchState(matchState) {
  return (
    isRecord(matchState) && matchState.status === PERSISTED_MATCH_STATUS.ACTIVE
  )
}

function isTieBreakMode(teamAGames, teamBGames) {
  return (
    teamAGames === TIE_BREAK_ENTRY_GAMES && teamBGames === TIE_BREAK_ENTRY_GAMES
  )
}

function toRuntimePointValue(value, tieBreakMode) {
  if (!Number.isInteger(value) || value < 0) {
    return 0
  }

  if (tieBreakMode) {
    return value
  }

  if (value === PERSISTED_ADVANTAGE_POINT_VALUE) {
    return 'Ad'
  }

  if (value === PERSISTED_GAME_POINT_VALUE) {
    return 'Game'
  }

  if (REGULAR_GAME_POINT_VALUES.has(value)) {
    return value
  }

  return value
}

function normalizePersistedMatchStateForRuntime(persistedMatchState) {
  if (!isActivePersistedMatchState(persistedMatchState)) {
    return null
  }

  const runtimeState = createInitialMatchState()
  const currentSetNumber = toPositiveInteger(
    persistedMatchState?.currentSet?.number,
    1
  )
  const teamAGames = toNonNegativeInteger(
    persistedMatchState?.currentSet?.games?.teamA,
    0
  )
  const teamBGames = toNonNegativeInteger(
    persistedMatchState?.currentSet?.games?.teamB,
    0
  )
  const tieBreakMode = isTieBreakMode(teamAGames, teamBGames)
  const winnerTeam = resolveWinnerTeam(persistedMatchState)

  runtimeState.currentSet = currentSetNumber
  runtimeState.currentSetStatus.number = currentSetNumber
  runtimeState.currentSetStatus.teamAGames = teamAGames
  runtimeState.currentSetStatus.teamBGames = teamBGames
  runtimeState.teamA.games = teamAGames
  runtimeState.teamB.games = teamBGames
  runtimeState.teamA.points = toRuntimePointValue(
    persistedMatchState?.currentGame?.points?.teamA,
    tieBreakMode
  )
  runtimeState.teamB.points = toRuntimePointValue(
    persistedMatchState?.currentGame?.points?.teamB,
    tieBreakMode
  )
  runtimeState.status = PERSISTED_MATCH_STATUS.ACTIVE
  runtimeState.updatedAt = Number.isFinite(persistedMatchState.updatedAt)
    ? persistedMatchState.updatedAt
    : Date.now()
  runtimeState.setsNeededToWin = toPositiveInteger(
    persistedMatchState.setsNeededToWin,
    2
  )
  runtimeState.setsWon = {
    teamA: toNonNegativeInteger(persistedMatchState?.setsWon?.teamA, 0),
    teamB: toNonNegativeInteger(persistedMatchState?.setsWon?.teamB, 0)
  }
  runtimeState.setHistory = cloneSetHistory(persistedMatchState.setHistory)

  if (isRecord(persistedMatchState.teams)) {
    if (typeof persistedMatchState.teams?.teamA?.label === 'string') {
      runtimeState.teams.teamA.label = persistedMatchState.teams.teamA.label
    }

    if (typeof persistedMatchState.teams?.teamB?.label === 'string') {
      runtimeState.teams.teamB.label = persistedMatchState.teams.teamB.label
    }
  }

  if (winnerTeam) {
    runtimeState.winnerTeam = winnerTeam
    runtimeState.winner = {
      team: winnerTeam
    }
  }

  return runtimeState
}

Page({
  onInit() {
    this.widgets = []
    this.savedMatchState = null
    this.hasSavedGame = false
    this.savedMatchStateFromHandoff = false
    this.isStartingNewGame = false
    this.refreshSavedMatchState()
  },

  build() {
    this.renderHomeScreen()
  },

  onDestroy() {
    this.clearWidgets()
  },

  getScreenMetrics() {
    if (typeof hmSetting === 'undefined') {
      return { width: 390, height: 450 }
    }

    const { width, height } = hmSetting.getDeviceInfo()
    return {
      width: ensureNumber(width, 390),
      height: ensureNumber(height, 450)
    }
  },

  clearWidgets() {
    if (typeof hmUI === 'undefined') {
      this.widgets = []
      return
    }

    this.widgets.forEach((widget) => hmUI.deleteWidget(widget))
    this.widgets = []
  },

  createWidget(widgetType, properties) {
    if (typeof hmUI === 'undefined') {
      return null
    }

    const widget = hmUI.createWidget(widgetType, properties)
    this.widgets.push(widget)
    return widget
  },

  consumeHomeHandoff() {
    // Read and clear the one-shot match state passed from game.js via globalData,
    // used as a fallback when SysProGetChars doesn't reflect the write immediately.
    try {
      if (typeof getApp !== 'function') {
        return null
      }

      const app = getApp()

      if (!isRecord(app) || !isRecord(app.globalData)) {
        return null
      }

      const handoff = app.globalData.pendingHomeMatchState
      app.globalData.pendingHomeMatchState = null

      return isRecord(handoff) ? handoff : null
    } catch {
      return null
    }
  },

  refreshSavedMatchState() {
    let savedMatchState = null
    let fromHandoff = false

    try {
      savedMatchState = loadMatchState()
    } catch {
      savedMatchState = null
    }

    // Fallback: if storage didn't return the value written just before
    // the page transition from game.js, try the in-memory handoff instead.
    if (!isActivePersistedMatchState(savedMatchState)) {
      savedMatchState = this.consumeHomeHandoff()
      fromHandoff = savedMatchState !== null
    }

    const hasSavedGame = isActivePersistedMatchState(savedMatchState)
    this.savedMatchState = hasSavedGame
      ? cloneMatchState(savedMatchState)
      : null
    this.hasSavedGame = hasSavedGame
    this.savedMatchStateFromHandoff = hasSavedGame && fromHandoff
    this.renderHomeScreen()

    return hasSavedGame
  },

  renderHomeScreen() {
    if (typeof hmUI === 'undefined') {
      return
    }

    const { width, height } = this.getScreenMetrics()
    const logoY = Math.round(height * HOME_TOKENS.spacingScale.contentTop)
    const logoHeight = Math.round(height * 0.08)
    const titleY =
      logoY +
      logoHeight +
      Math.round(height * HOME_TOKENS.spacingScale.logoToTitle)
    const titleHeight = Math.round(height * 0.11)

    // Use unified button sizing from design tokens
    const buttonWidth = Math.round(width * HOME_TOKENS.buttonSize.width)
    const buttonHeight = Math.round(height * HOME_TOKENS.buttonSize.height)
    const buttonX = Math.round((width - buttonWidth) / 2)
    const startButtonY =
      titleY +
      titleHeight +
      Math.round(height * HOME_TOKENS.spacingScale.titleToPrimaryButton)
    const secondaryButtonGap = Math.round(height * HOME_TOKENS.buttonSize.gap)
    const resumeButtonY = startButtonY + buttonHeight + secondaryButtonGap
    const startNewGameButtonText = gettext('home.startNewGame')

    // Settings icon positioning - centered horizontally
    const settingsIconSize = HOME_TOKENS.settingsIcon.size
    const settingsIconX = Math.round((width - settingsIconSize) / 2)
    const settingsIconY =
      (this.hasSavedGame ? resumeButtonY : startButtonY) +
      buttonHeight +
      Math.round(height * HOME_TOKENS.spacingScale.buttonToSettingsIcon)

    this.clearWidgets()

    this.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: width,
      h: height,
      color: HOME_TOKENS.colors.background
    })

    this.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: logoY,
      w: width,
      h: logoHeight,
      color: HOME_TOKENS.colors.logo,
      text: gettext('home.logo'),
      text_size: Math.round(width * HOME_TOKENS.fontScale.logo),
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V
    })

    this.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: titleY,
      w: width,
      h: titleHeight,
      color: HOME_TOKENS.colors.title,
      text: gettext('home.title'),
      text_size: Math.round(width * HOME_TOKENS.fontScale.title),
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V
    })

    this.createWidget(hmUI.widget.BUTTON, {
      x: buttonX,
      y: startButtonY,
      w: buttonWidth,
      h: buttonHeight,
      radius: Math.round(buttonHeight * HOME_TOKENS.buttonSize.radiusRatio),
      normal_color: HOME_TOKENS.colors.primaryButton,
      press_color: HOME_TOKENS.colors.primaryButtonPressed,
      color: HOME_TOKENS.colors.buttonText,
      text_size: Math.round(width * HOME_TOKENS.fontScale.button),
      text: startNewGameButtonText,
      click_func: () => this.handleStartNewGame()
    })

    if (this.hasSavedGame) {
      this.createWidget(hmUI.widget.BUTTON, {
        x: buttonX,
        y: resumeButtonY,
        w: buttonWidth,
        h: buttonHeight,
        radius: Math.round(buttonHeight * HOME_TOKENS.buttonSize.radiusRatio),
        normal_color: HOME_TOKENS.colors.secondaryButton,
        press_color: HOME_TOKENS.colors.secondaryButtonPressed,
        color: HOME_TOKENS.colors.secondaryButtonText,
        text_size: Math.round(width * HOME_TOKENS.fontScale.button),
        text: gettext('home.resumeGame'),
        click_func: () => this.handleResumeGame()
      })
    }

    // Settings icon button (gear icon using BUTTON widget with image)
    this.createWidget(hmUI.widget.BUTTON, {
      x: settingsIconX,
      y: settingsIconY,
      w: -1,
      h: -1,
      normal_src: 'gear-icon.png',
      press_src: 'gear-icon.png',
      click_func: () => this.navigateToSettings()
    })
  },

  handleStartNewGame() {
    if (this.isStartingNewGame === true) {
      return false
    }

    this.isStartingNewGame = true

    try {
      const flowResult = startNewMatchFlow()
      return flowResult?.navigatedToSetup === true
    } catch {
      return false
    } finally {
      this.isStartingNewGame = false
    }
  },

  handleResumeGame() {
    // Re-validate from storage (most up-to-date source of truth).
    // If storage returns an explicit non-active state or throws, fail safe.
    // Only fall back to the in-memory cached state when storage returns null AND
    // the cached state came from the globalData handoff — meaning SysProGetChars
    // was unreliable from the start of this page load (timing issue on transition).
    let savedMatchState = null

    try {
      savedMatchState = loadMatchState()
    } catch {
      this.savedMatchState = null
      this.hasSavedGame = false
      this.savedMatchStateFromHandoff = false
      this.renderHomeScreen()
      return false
    }

    if (!isActivePersistedMatchState(savedMatchState)) {
      if (
        savedMatchState === null &&
        this.savedMatchStateFromHandoff &&
        isActivePersistedMatchState(this.savedMatchState)
      ) {
        // SysProGetChars still returning null — fall back to the handoff cache.
        savedMatchState = this.savedMatchState
      } else {
        // Storage returned an explicit non-active state, or the cache wasn't
        // from a handoff — the game is gone, hide the resume button.
        this.savedMatchState = null
        this.hasSavedGame = false
        this.savedMatchStateFromHandoff = false
        this.renderHomeScreen()
        return false
      }
    }

    const restoredRuntimeMatchState =
      normalizePersistedMatchStateForRuntime(savedMatchState)

    if (!restoredRuntimeMatchState) {
      this.savedMatchState = null
      this.hasSavedGame = false
      this.savedMatchStateFromHandoff = false
      this.renderHomeScreen()
      return false
    }

    this.savedMatchState = cloneMatchState(savedMatchState)
    this.hasSavedGame = true
    this.savedMatchStateFromHandoff = false
    this.restoreRuntimeMatchState(restoredRuntimeMatchState)
    // Set the pendingPersistedMatchState handoff so game.js validateSessionAccess
    // can find a valid session even when SysProGetChars returns null on transition.
    this.storeResumeSessionHandoff(savedMatchState)
    this.navigateToGamePage()
    return true
  },

  storeResumeSessionHandoff(persistedMatchState) {
    // Mirror of setup.js storeSessionHandoff: writes the persisted schema state
    // into globalData.pendingPersistedMatchState so game.js validateSessionAccess
    // can find a valid session via consumeSessionHandoff() when SysProGetChars
    // hasn't yet reflected the stored value across the page transition.
    try {
      if (typeof getApp !== 'function') {
        return
      }

      const app = getApp()

      if (!isRecord(app)) {
        return
      }

      if (!isRecord(app.globalData)) {
        app.globalData = {}
      }

      app.globalData.pendingPersistedMatchState =
        cloneMatchState(persistedMatchState)
    } catch {
      // Non-fatal: handoff is best-effort.
    }
  },

  restoreRuntimeMatchState(matchState) {
    if (!matchState || typeof matchState !== 'object') {
      return
    }

    if (typeof getApp !== 'function') {
      return
    }

    const app = getApp()

    if (!app || typeof app !== 'object') {
      return
    }

    if (!app.globalData || typeof app.globalData !== 'object') {
      app.globalData = {}
    }

    app.globalData.matchState = cloneMatchState(matchState)

    if (
      app.globalData.matchHistory &&
      typeof app.globalData.matchHistory.clear === 'function'
    ) {
      app.globalData.matchHistory.clear()
      return
    }

    app.globalData.matchHistory = createHistoryStack()
  },

  navigateToGamePage() {
    if (typeof hmApp === 'undefined' || typeof hmApp.gotoPage !== 'function') {
      return
    }

    hmApp.gotoPage({
      url: 'page/game'
    })
  },

  navigateToSettings() {
    if (typeof hmApp === 'undefined' || typeof hmApp.gotoPage !== 'function') {
      return false
    }

    try {
      hmApp.gotoPage({
        url: 'setting/index'
      })
      return true
    } catch {
      return false
    }
  }
})
