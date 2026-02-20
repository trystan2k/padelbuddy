import { gettext } from 'i18n'

import { createScoreViewModel } from './score-view-model.js'
import { createHistoryStack } from '../utils/history-stack.js'
import { createInitialMatchState } from '../utils/match-state.js'
import { addPoint, removePoint } from '../utils/scoring-engine.js'
import { loadState, saveState } from '../utils/storage.js'

const GAME_TOKENS = Object.freeze({
  colors: {
    accent: 0x1eb98c,
    background: 0x000000,
    buttonText: 0x000000,
    cardBackground: 0x111111,
    mutedText: 0xb2b2b2,
    text: 0xffffff
  },
  fontScale: {
    button: 0.038,
    label: 0.04,
    points: 0.1,
    title: 0.06
  },
  spacingScale: {
    buttonBottom: 0.08,
    cardTop: 0.2,
    sectionGap: 0.03,
    titleTop: 0.08
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

function isValidRuntimeMatchState(matchState) {
  return (
    isRecord(matchState) &&
    isRecord(matchState.teams) &&
    isRecord(matchState.teams.teamA) &&
    isRecord(matchState.teams.teamB) &&
    isRecord(matchState.teamA) &&
    isRecord(matchState.teamB) &&
    isRecord(matchState.currentSetStatus)
  )
}

function isHistoryStackLike(historyStack) {
  return (
    isRecord(historyStack) &&
    typeof historyStack.push === 'function' &&
    typeof historyStack.pop === 'function' &&
    typeof historyStack.clear === 'function' &&
    typeof historyStack.isEmpty === 'function'
  )
}

Page({
  onInit() {
    this.widgets = []
    this.ensureRuntimeState()
  },

  onShow() {
    this.ensureRuntimeState()
    this.renderGameScreen()
  },

  build() {
    this.renderGameScreen()
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

  getAppInstance() {
    if (typeof getApp !== 'function') {
      return null
    }

    const app = getApp()

    if (!isRecord(app)) {
      return null
    }

    if (!isRecord(app.globalData)) {
      app.globalData = {}
    }

    return app
  },

  ensureRuntimeState() {
    const app = this.getAppInstance()

    if (!app) {
      return
    }

    if (!isHistoryStackLike(app.globalData.matchHistory)) {
      app.globalData.matchHistory = createHistoryStack()
    }

    if (isValidRuntimeMatchState(app.globalData.matchState)) {
      return
    }

    const persistedState = loadState()

    app.globalData.matchState =
      persistedState !== null ? cloneMatchState(persistedState) : createInitialMatchState()
  },

  getRuntimeMatchState() {
    const app = this.getAppInstance()

    if (!app) {
      return createInitialMatchState()
    }

    if (!isValidRuntimeMatchState(app.globalData.matchState)) {
      app.globalData.matchState = createInitialMatchState()
    }

    return app.globalData.matchState
  },

  updateRuntimeMatchState(nextState) {
    const app = this.getAppInstance()

    if (!app || !isValidRuntimeMatchState(nextState)) {
      return
    }

    app.globalData.matchState = nextState
  },

  addPointForTeam(team) {
    const app = this.getAppInstance()

    if (!app) {
      return null
    }

    if (typeof app.addPointForTeam === 'function') {
      return app.addPointForTeam(team)
    }

    const nextState = addPoint(app.globalData.matchState, team, app.globalData.matchHistory)
    app.globalData.matchState = nextState
    return nextState
  },

  removePoint() {
    const app = this.getAppInstance()

    if (!app) {
      return null
    }

    if (typeof app.removePoint === 'function') {
      return app.removePoint()
    }

    const nextState = removePoint(app.globalData.matchState, app.globalData.matchHistory)
    app.globalData.matchState = nextState
    return nextState
  },

  persistAndRender(nextState) {
    if (!isValidRuntimeMatchState(nextState)) {
      return
    }

    this.updateRuntimeMatchState(nextState)
    saveState(nextState)
    this.renderGameScreen()
  },

  handleAddPointForTeam(team) {
    const nextState = this.addPointForTeam(team)

    if (!nextState) {
      return
    }

    this.persistAndRender(nextState)
  },

  handleRemovePoint() {
    const nextState = this.removePoint()

    if (!nextState) {
      return
    }

    this.persistAndRender(nextState)
  },

  renderGameScreen() {
    if (typeof hmUI === 'undefined') {
      return
    }

    const matchState = this.getRuntimeMatchState()
    const viewModel = createScoreViewModel(matchState)
    const { width, height } = this.getScreenMetrics()

    const titleHeight = Math.round(height * 0.08)
    const titleY = Math.round(height * GAME_TOKENS.spacingScale.titleTop)
    const cardY = Math.round(height * GAME_TOKENS.spacingScale.cardTop)
    const cardHeight = Math.round(height * 0.46)
    const cardWidth = Math.round(width * 0.88)
    const cardX = Math.round((width - cardWidth) / 2)
    const buttonWidth = Math.round(width * 0.26)
    const buttonHeight = Math.round(height * 0.11)
    const buttonY =
      height - buttonHeight - Math.round(height * GAME_TOKENS.spacingScale.buttonBottom)
    const undoButtonWidth = Math.round(width * 0.2)
    const teamButtonGap = Math.round(width * 0.05)
    const leftButtonX = Math.round((width - buttonWidth * 2 - teamButtonGap) / 2)
    const rightButtonX = leftButtonX + buttonWidth + teamButtonGap
    const undoButtonX = Math.round((width - undoButtonWidth) / 2)
    const undoButtonY = buttonY - buttonHeight - Math.round(height * GAME_TOKENS.spacingScale.sectionGap)

    this.clearWidgets()

    this.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: width,
      h: height,
      color: GAME_TOKENS.colors.background
    })

    this.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: titleY,
      w: width,
      h: titleHeight,
      color: GAME_TOKENS.colors.accent,
      text: gettext('game.title'),
      text_size: Math.round(width * GAME_TOKENS.fontScale.title),
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V
    })

    this.createWidget(hmUI.widget.FILL_RECT, {
      x: cardX,
      y: cardY,
      w: cardWidth,
      h: cardHeight,
      radius: Math.round(cardWidth * 0.06),
      color: GAME_TOKENS.colors.cardBackground
    })

    this.createWidget(hmUI.widget.TEXT, {
      x: cardX,
      y: cardY + Math.round(cardHeight * 0.06),
      w: cardWidth,
      h: Math.round(cardHeight * 0.14),
      color: GAME_TOKENS.colors.mutedText,
      text: `${gettext('game.setLabel')} ${viewModel.currentSet}`,
      text_size: Math.round(width * GAME_TOKENS.fontScale.label),
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V
    })

    this.createWidget(hmUI.widget.TEXT, {
      x: cardX,
      y: cardY + Math.round(cardHeight * 0.24),
      w: cardWidth,
      h: Math.round(cardHeight * 0.23),
      color: GAME_TOKENS.colors.text,
      text: `${viewModel.teamA.points} - ${viewModel.teamB.points}`,
      text_size: Math.round(width * GAME_TOKENS.fontScale.points),
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V
    })

    this.createWidget(hmUI.widget.TEXT, {
      x: cardX,
      y: cardY + Math.round(cardHeight * 0.53),
      w: cardWidth,
      h: Math.round(cardHeight * 0.16),
      color: GAME_TOKENS.colors.mutedText,
      text: `${viewModel.teamA.label}: ${viewModel.teamA.games}    ${viewModel.teamB.label}: ${viewModel.teamB.games}`,
      text_size: Math.round(width * GAME_TOKENS.fontScale.label),
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V
    })

    this.createWidget(hmUI.widget.TEXT, {
      x: cardX,
      y: cardY + Math.round(cardHeight * 0.71),
      w: cardWidth,
      h: Math.round(cardHeight * 0.16),
      color: GAME_TOKENS.colors.mutedText,
      text: `${gettext('game.gamesLabel')} ${viewModel.currentSetGames.teamA} - ${viewModel.currentSetGames.teamB}`,
      text_size: Math.round(width * GAME_TOKENS.fontScale.label),
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V
    })

    this.createWidget(hmUI.widget.BUTTON, {
      x: leftButtonX,
      y: buttonY,
      w: buttonWidth,
      h: buttonHeight,
      radius: Math.round(buttonHeight / 2),
      normal_color: GAME_TOKENS.colors.accent,
      press_color: GAME_TOKENS.colors.accent,
      color: GAME_TOKENS.colors.buttonText,
      text_size: Math.round(width * GAME_TOKENS.fontScale.button),
      text: gettext('game.teamAAddPoint'),
      click_func: () => this.handleAddPointForTeam('teamA')
    })

    this.createWidget(hmUI.widget.BUTTON, {
      x: rightButtonX,
      y: buttonY,
      w: buttonWidth,
      h: buttonHeight,
      radius: Math.round(buttonHeight / 2),
      normal_color: GAME_TOKENS.colors.accent,
      press_color: GAME_TOKENS.colors.accent,
      color: GAME_TOKENS.colors.buttonText,
      text_size: Math.round(width * GAME_TOKENS.fontScale.button),
      text: gettext('game.teamBAddPoint'),
      click_func: () => this.handleAddPointForTeam('teamB')
    })

    this.createWidget(hmUI.widget.BUTTON, {
      x: undoButtonX,
      y: undoButtonY,
      w: undoButtonWidth,
      h: buttonHeight,
      radius: Math.round(buttonHeight / 2),
      normal_color: GAME_TOKENS.colors.accent,
      press_color: GAME_TOKENS.colors.accent,
      color: GAME_TOKENS.colors.buttonText,
      text_size: Math.round(width * GAME_TOKENS.fontScale.button),
      text: gettext('game.undo'),
      click_func: () => this.handleRemovePoint()
    })
  }
})
