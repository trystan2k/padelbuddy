import { gettext } from 'i18n'
import { getFontSize, TOKENS, toPercentage } from '../utils/design-tokens.js'
import { loadHapticFeedbackEnabled } from '../utils/haptic-feedback-settings.js'
import { resolveLayout } from '../utils/layout-engine.js'
import { createStandardPageLayout } from '../utils/layout-presets.js'
import {
  loadMatchHistory,
  saveMatchToHistory
} from '../utils/match-history-storage.js'
import { MATCH_STATUS as PERSISTED_MATCH_STATUS } from '../utils/match-state-schema.js'
import { getActiveSession } from '../utils/match-storage.js'
import { clamp, getScreenMetrics } from '../utils/screen-utils.js'
import {
  createBackground,
  createButton,
  createText
} from '../utils/ui-components.js'
import {
  cloneMatchState,
  isRecord,
  normalizeSetHistory,
  toNonNegativeInteger
} from '../utils/validation.js'

/**
 * Declarative layout schema for the Summary screen.
 *
 * Structure:
 * - header: Title only ("Match Summary")
 * - body: Winner text, score label, score value, set history with SCROLL_LIST
 * - footer: Home button
 */
const SUMMARY_LAYOUT = {
  sections: createStandardPageLayout({
    top: toPercentage(TOKENS.spacing.pageTop),
    bottom: toPercentage(TOKENS.spacing.pageBottom),
    bodyGap: toPercentage(TOKENS.spacing.sectionGap),
    headerHeight: '10%',
    footerHeight: '10%',
    headerRoundSafeInset: false,
    bodyRoundSafeInset: false,
    footerRoundSafeInset: false
  }).sections,
  elements: {
    // ── Header Section Elements ────────────────────────────────────────────
    // Title text ("Match Summary")
    titleText: {
      section: 'header',
      x: 'center',
      y: '30%',
      width: '100%',
      height: '50%',
      align: 'center',
      _meta: {
        type: 'text',
        style: 'pageTitle',
        textKey: 'summary.title'
      }
    },

    // ── Body Section Elements ───────────────────────────────────────────────
    // Winner text (e.g., "Team A Wins!")
    winnerText: {
      section: 'body',
      x: 0,
      y: '0%',
      width: '100%',
      height: '15%',
      align: 'center',
      _meta: {
        type: 'text',
        style: 'bodyLarge', // Using bodyLarge for winner text
        color: 'text',
        textKey: 'winnerText' // Dynamic: viewModel.winnerText
      }
    },
    // Final score value (e.g., "2-1")
    scoreValue: {
      section: 'body',
      x: 0,
      y: '25%',
      width: '100%',
      height: '12%',
      align: 'center',
      _meta: {
        type: 'text',
        style: 'score',
        color: 'accent',
        textKey: 'finalSetsScore' // Dynamic: viewModel.finalSetsScore
      }
    },
    // Note: SCROLL_LIST is created programmatically within the body section
    // Its bounds are derived from: historyBodyY and historyBodyHeight
    // (starts at 47% of body section height)

    // ── Footer Section Elements ──────────────────────────────────────────
    homeButton: {
      section: 'footer',
      x: 'center',
      y: 'center',
      width: TOKENS.sizing.iconLarge, // 48
      height: TOKENS.sizing.iconLarge, // 48
      align: 'center',
      _meta: {
        type: 'iconButton',
        icon: 'home-icon.png',
        onClick: 'handleNavigateHome'
      }
    }
  }
}

const SUMMARY_LOAD_HAPTIC_PULSE_COUNT = 3
const SUMMARY_LOAD_HAPTIC_PULSE_SPACING_MS = 700
const SUMMARY_LOAD_HAPTIC_SCENE = 25

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function normalizeSetsWon(setsWon) {
  return {
    teamA: toNonNegativeInteger(setsWon?.teamA, 0),
    teamB: toNonNegativeInteger(setsWon?.teamB, 0)
  }
}

function isFinishedMatchState(matchState) {
  return (
    isRecord(matchState) &&
    matchState.status === PERSISTED_MATCH_STATUS.FINISHED
  )
}

function createSummaryViewModel(matchState) {
  const setsWon = normalizeSetsWon(matchState?.setsWon)
  const normalizedSetHistory = normalizeSetHistory(matchState?.setHistory)
  const hasFinishedMatch = isFinishedMatchState(matchState)
  const isTiedMatch = setsWon.teamA === setsWon.teamB
  const winnerText = hasFinishedMatch
    ? isTiedMatch
      ? gettext('summary.tiedGame')
      : setsWon.teamA > setsWon.teamB
        ? gettext('summary.teamAWins')
        : gettext('summary.teamBWins')
    : gettext('summary.matchUnavailable')

  const historyLines =
    normalizedSetHistory.length > 0
      ? normalizedSetHistory.map(
          (setEntry) =>
            `Set ${setEntry.setNumber}: ${setEntry.teamAGames}-${setEntry.teamBGames}`
        )
      : [gettext('summary.noSetHistory')]

  return {
    finalSetsScore: `${setsWon.teamA}-${setsWon.teamB}`,
    historyLines,
    winnerText
  }
}

// ============================================================================
// PAGE DEFINITION
// ============================================================================

Page({
  onInit() {
    this.widgets = []
    this.vibrate = null
    this.hapticFeedbackEnabled = loadHapticFeedbackEnabled()
    this.hasTriggeredSummaryLoadHapticFeedback = false
    this.summaryLoadHapticPulseTimers = []
    this.finishedMatchState = null

    if (
      typeof hmSensor !== 'undefined' &&
      typeof hmSensor.createSensor === 'function' &&
      isRecord(hmSensor.id)
    ) {
      try {
        const vibrate = hmSensor.createSensor(hmSensor.id.VIBRATE)
        this.vibrate = vibrate || null
      } catch {
        this.vibrate = null
      }
    }

    this.refreshFinishedMatchState()
  },

  build() {
    this.triggerSummaryLoadHapticFeedback()
    this.renderSummaryScreen()
    this.registerGestureHandler()
  },

  onDestroy() {
    this.clearSummaryLoadHapticPulseTimers()

    try {
      this.vibrate?.stop()
    } catch {
      // Non-fatal: summary haptic stop failed.
    }
    this.clearWidgets()
    this.unregisterGestureHandler()
  },

  clearSummaryLoadHapticPulseTimers() {
    if (!Array.isArray(this.summaryLoadHapticPulseTimers)) {
      this.summaryLoadHapticPulseTimers = []
      return
    }

    if (typeof clearTimeout === 'function') {
      this.summaryLoadHapticPulseTimers.forEach((timerId) => {
        clearTimeout(timerId)
      })
    }

    this.summaryLoadHapticPulseTimers = []
  },

  triggerSummaryLoadHapticFeedback() {
    if (this.hasTriggeredSummaryLoadHapticFeedback) {
      return
    }

    this.hasTriggeredSummaryLoadHapticFeedback = true

    if (!this.hapticFeedbackEnabled) {
      return
    }

    const vibrate = this.vibrate

    if (!vibrate) {
      return
    }

    const triggerPulse = () => {
      try {
        vibrate.stop()
        vibrate.scene = SUMMARY_LOAD_HAPTIC_SCENE
        vibrate.start()
      } catch {
        // Non-fatal: summary haptic feedback unavailable.
      }
    }

    triggerPulse()

    if (typeof setTimeout !== 'function') {
      triggerPulse()
      triggerPulse()
      return
    }

    for (
      let pulseIndex = 1;
      pulseIndex < SUMMARY_LOAD_HAPTIC_PULSE_COUNT;
      pulseIndex += 1
    ) {
      const timerId = setTimeout(() => {
        const timerIndex = this.summaryLoadHapticPulseTimers.indexOf(timerId)
        if (timerIndex >= 0) {
          this.summaryLoadHapticPulseTimers.splice(timerIndex, 1)
        }

        triggerPulse()
      }, pulseIndex * SUMMARY_LOAD_HAPTIC_PULSE_SPACING_MS)

      this.summaryLoadHapticPulseTimers.push(timerId)
    }
  },

  registerGestureHandler() {
    if (
      typeof hmApp === 'undefined' ||
      typeof hmApp.registerGestureEvent !== 'function'
    ) {
      return
    }

    try {
      hmApp.registerGestureEvent((event) => {
        if (event === hmApp.gesture.RIGHT) {
          // Navigate directly to Home Screen
          this.navigateToHomePage()
          // Return true to skip default goBack() behavior
          return true
        }
        // For other gestures, don't skip default behavior
        return false
      })
    } catch {
      // Non-fatal: gesture registration failed
    }
  },

  unregisterGestureHandler() {
    if (
      typeof hmApp === 'undefined' ||
      typeof hmApp.unregisterGestureEvent !== 'function'
    ) {
      return
    }

    try {
      hmApp.unregisterGestureEvent()
    } catch {
      // Non-fatal: gesture unregistration failed
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

  getRuntimeFinishedMatchState() {
    const app = this.getAppInstance()

    if (!app || !isFinishedMatchState(app.globalData.matchState)) {
      return null
    }

    return cloneMatchState(app.globalData.matchState)
  },

  refreshFinishedMatchState() {
    let persistedMatchState = null

    try {
      persistedMatchState = getActiveSession()
    } catch {
      persistedMatchState = null
    }

    if (isFinishedMatchState(persistedMatchState)) {
      this.finishedMatchState = cloneMatchState(persistedMatchState)
    } else {
      this.finishedMatchState = this.getRuntimeFinishedMatchState()
    }

    // Save match to history if it's a finished match (with duplicate prevention)
    if (
      this.finishedMatchState &&
      this.finishedMatchState.status === PERSISTED_MATCH_STATUS.FINISHED
    ) {
      try {
        const teamALabel =
          this.finishedMatchState.teams?.teamA?.label ?? 'Team A'
        const teamBLabel =
          this.finishedMatchState.teams?.teamB?.label ?? 'Team B'
        const completedAt = this.finishedMatchState.completedAt ?? Date.now()

        // Check by comparing timestamp + if match already saved teams
        const existingHistory = loadMatchHistory()
        const isDuplicate = existingHistory.some(
          (entry) =>
            entry.completedAt === completedAt &&
            entry.teamALabel === teamALabel &&
            entry.teamBLabel === teamBLabel
        )

        if (!isDuplicate) {
          saveMatchToHistory(this.finishedMatchState)
        }
      } catch {
        // Best-effort: don't block summary display if history save fails
      }
    }

    this.renderSummaryScreen()
    return this.finishedMatchState !== null
  },

  navigateToHomePage() {
    if (typeof hmApp === 'undefined' || typeof hmApp.gotoPage !== 'function') {
      return false
    }

    try {
      hmApp.gotoPage({
        url: 'page/index'
      })
      return true
    } catch {
      return false
    }
  },

  handleNavigateHome() {
    return this.navigateToHomePage()
  },

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  renderSummaryScreen() {
    if (typeof hmUI === 'undefined') {
      return
    }

    // Get screen metrics and resolve layout
    const metrics = getScreenMetrics()
    const layout = resolveLayout(SUMMARY_LAYOUT, metrics)

    // Create view model from match state
    const viewModel = createSummaryViewModel(this.finishedMatchState)

    this.clearWidgets()

    // ── Background ────────────────────────────────────────────────────────
    const bg = createBackground()
    this.createWidget(bg.widgetType, bg.config)

    // ── Header Section ─────────────────────────────────────────────────────
    this.renderHeaderSection(layout)

    // ── Body Section (Set History) ─────────────────────────────────────────
    this.renderBodySection(layout, viewModel, metrics)

    // ── Footer Section ─────────────────────────────────────────────────────
    this.renderFooterSection(layout)
  },

  /**
   * Renders the header section with title only.
   */
  renderHeaderSection(layout) {
    const headerSection = layout.sections.header
    const elements = SUMMARY_LAYOUT.elements

    // Title text ("Match Summary")
    const titleMeta = elements.titleText._meta
    const titleConfig = createText({
      text: gettext(titleMeta.textKey),
      style: titleMeta.style,
      x: headerSection.x,
      y: headerSection.y,
      w: headerSection.w,
      h: headerSection.h,
      color: TOKENS.colors[titleMeta.color]
    })
    this.createWidget(titleConfig.widgetType, titleConfig.config)
  },

  /**
   * Renders the body section with winner text, score, and set history scroll list.
   */
  renderBodySection(layout, viewModel, metrics) {
    const bodySection = layout.sections.body
    const elements = SUMMARY_LAYOUT.elements

    // Winner text (dynamic)
    const winnerMeta = elements.winnerText._meta
    const winnerHeight = Math.round(bodySection.h * 0.15)
    const winnerConfig = createText({
      text: viewModel.winnerText,
      style: winnerMeta.style,
      x: bodySection.x,
      y: bodySection.y,
      w: bodySection.w,
      h: winnerHeight,
      color: TOKENS.colors[winnerMeta.color]
    })
    this.createWidget(winnerConfig.widgetType, winnerConfig.config)

    // Score value (dynamic)
    const scoreValueMeta = elements.scoreValue._meta
    const scoreValueHeight = Math.round(bodySection.h * 0.2)
    const scoreValueY = bodySection.y + winnerHeight
    const scoreValueConfig = createText({
      text: viewModel.finalSetsScore,
      style: scoreValueMeta.style,
      x: bodySection.x,
      y: scoreValueY,
      w: bodySection.w,
      h: scoreValueHeight,
      color: TOKENS.colors[scoreValueMeta.color]
    })
    this.createWidget(scoreValueConfig.widgetType, scoreValueConfig.config)

    // SCROLL_LIST for set history
    // Calculate bounds within the body section (below history title)
    const historyBodyY =
      scoreValueY + scoreValueHeight + Math.round(TOKENS.spacing.sectionGap * 5)
    const historyRowHeight = clamp(
      Math.round(metrics.width * TOKENS.typography.body * 2.2),
      28,
      56
    )

    // Build data array for SCROLL_LIST
    const scrollDataArray = viewModel.historyLines.map((line) => ({ line }))

    // Create SCROLL_LIST widget
    this.createWidget(hmUI.widget.SCROLL_LIST, {
      x: bodySection.x,
      y: historyBodyY,
      w: bodySection.w,
      h: historyRowHeight * 3,
      item_space: 0,
      item_config: [
        {
          type_id: 1,
          item_height: historyRowHeight,
          item_bg_color: TOKENS.colors.cardBackground,
          item_bg_radius: 0,
          text_view: [
            {
              x: 0,
              y: 0,
              w: bodySection.w,
              h: historyRowHeight,
              key: 'line',
              color: TOKENS.colors.text,
              text_size: getFontSize('bodyLarge')
            }
          ],
          text_view_count: 1
        }
      ],
      item_config_count: 1,
      data_array: scrollDataArray,
      data_count: scrollDataArray.length
    })
  },

  /**
   * Renders the footer section with home button.
   */
  renderFooterSection(layout) {
    const homeButtonEl = layout.elements.homeButton
    const elements = SUMMARY_LAYOUT.elements

    // Home icon button (centered in footer)
    const homeButtonMeta = elements.homeButton._meta

    const homeBtn = createButton({
      x: homeButtonEl.x,
      y: homeButtonEl.y,
      variant: 'icon',
      normal_src: homeButtonMeta.icon,
      press_src: homeButtonMeta.icon,
      onClick: () => this.handleNavigateHome()
    })
    this.createWidget(homeBtn.widgetType, homeBtn.config)
  }
})
