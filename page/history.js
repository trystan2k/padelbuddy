import { gettext } from 'i18n'
import { loadMatchHistory } from '../utils/match-history-storage.js'

const HISTORY_TOKENS = Object.freeze({
  colors: {
    accent: 0x1eb98c,
    accentPressed: 0x1aa07a,
    background: 0x000000,
    buttonText: 0x000000,
    buttonSecondary: 0x24262b,
    buttonSecondaryPressed: 0x2d3036,
    buttonSecondaryText: 0xffffff,
    cardBackground: 0x111318,
    mutedText: 0x7d8289,
    text: 0xffffff,
    winner: 0x1eb98c
  },
  fontScale: {
    button: 0.05, // Larger button
    empty: 0.052,
    score: 0.095, // Increased more
    title: 0.052, // Smaller title
    date: 0.068 // Increased more
  },
  spacingScale: {
    bottomInset: 0.06,
    roundSideInset: 0.06, // Reduced for wider list
    sectionGap: 0.015,
    sideInset: 0.04, // Reduced for wider list
    topInset: 0.035
  }
})

function ensureNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function formatDate(timestamp) {
  if (!Number.isFinite(timestamp)) {
    return ''
  }

  const date = new Date(timestamp)
  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  const hours = date.getHours()
  const minutes = date.getMinutes()

  const pad = (n) => (n < 10 ? `0${n}` : String(n))

  // Format: DD/MM/YYYY HH:MM
  return `${pad(day)}/${pad(month)}/${year} ${pad(hours)}:${pad(minutes)}`
}

function calculateRoundSafeSideInset(
  width,
  height,
  yPosition,
  horizontalPadding
) {
  const radius = Math.min(width, height) / 2
  const centerX = width / 2
  const centerY = height / 2
  const boundedY = clamp(yPosition, 0, height)
  const distanceFromCenter = Math.abs(boundedY - centerY)
  const halfChord = Math.sqrt(
    Math.max(0, radius * radius - distanceFromCenter * distanceFromCenter)
  )

  return Math.max(0, Math.ceil(centerX - halfChord + horizontalPadding))
}

function calculateRoundSafeSectionSideInset(
  width,
  height,
  sectionTop,
  sectionHeight,
  horizontalPadding
) {
  const boundedTop = clamp(sectionTop, 0, height)
  const boundedBottom = clamp(
    sectionTop + Math.max(sectionHeight, 0),
    0,
    height
  )
  const middleY = (boundedTop + boundedBottom) / 2

  return Math.max(
    calculateRoundSafeSideInset(width, height, boundedTop, horizontalPadding),
    calculateRoundSafeSideInset(width, height, middleY, horizontalPadding),
    calculateRoundSafeSideInset(width, height, boundedBottom, horizontalPadding)
  )
}

Page({
  onInit(params) {
    this.widgets = []
    this.historyEntries = []

    // Load history data during init (v1.0 compatible)
    try {
      this.historyEntries = loadMatchHistory()
    } catch {
      this.historyEntries = []
    }
  },

  build() {
    this.renderHistoryScreen()
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

  refreshHistory() {
    try {
      this.historyEntries = loadMatchHistory()
    } catch {
      this.historyEntries = []
    }

    this.renderHistoryScreen()
  },

  navigateToHomePage() {
    if (typeof hmApp === 'undefined' || typeof hmApp.gotoPage !== 'function') {
      return
    }

    try {
      hmApp.gotoPage({
        url: 'page/index'
      })
    } catch {
      // Ignore navigation errors
    }
  },

  navigateToHistoryDetail(matchId) {
    if (
      !matchId ||
      typeof hmApp === 'undefined' ||
      typeof hmApp.gotoPage !== 'function'
    ) {
      return
    }

    try {
      // Zepp OS v1.0: use separate 'param' property, not query string
      hmApp.gotoPage({
        url: 'page/history-detail',
        param: matchId
      })
    } catch {
      // Ignore navigation errors
    }
  },

  handleHistoryItemClick(index) {
    const entry = this.historyEntries[index]
    if (entry && entry.id) {
      this.navigateToHistoryDetail(entry.id)
    }
  },

  renderHistoryScreen() {
    if (typeof hmUI === 'undefined') {
      return
    }

    const { width, height } = this.getScreenMetrics()
    const isRoundScreen = Math.abs(width - height) <= Math.round(width * 0.04)
    const topInset = Math.round(height * HISTORY_TOKENS.spacingScale.topInset)
    const bottomInset = Math.round(
      height * HISTORY_TOKENS.spacingScale.bottomInset
    )
    const sectionGap = Math.round(
      height * HISTORY_TOKENS.spacingScale.sectionGap
    )
    const baseSectionSideInset = Math.round(
      width *
        (isRoundScreen
          ? HISTORY_TOKENS.spacingScale.roundSideInset
          : HISTORY_TOKENS.spacingScale.sideInset)
    )
    const buttonHeight = clamp(Math.round(height * 0.11), 50, 58) // Bigger button

    // Title height - smaller to fit
    const titleHeight = clamp(Math.round(height * 0.07), 28, 36)

    // Calculate available space for list
    const spaceForTitleAndButton = titleHeight + buttonHeight + sectionGap * 3
    const listMaxHeight =
      height - topInset - bottomInset - spaceForTitleAndButton

    // Force 2 items visible - tighter row height for bigger fonts
    const rowHeight = Math.floor(listMaxHeight / 2.35)
    const listHeight = rowHeight * 2 + Math.round(rowHeight * 0.1)

    const listY = topInset + titleHeight + sectionGap

    // Minimal side inset for wider list
    const sideInset = Math.max(baseSectionSideInset, Math.round(width * 0.02))

    const listX = sideInset
    const listWidth = Math.max(1, width - sideInset * 2)

    const actionsSectionY = height - bottomInset - buttonHeight
    const buttonWidth = Math.max(1, width - sideInset * 2)

    this.clearWidgets()

    // Background
    this.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: width,
      h: height,
      color: HISTORY_TOKENS.colors.background
    })

    // Title - centered at top
    this.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: topInset,
      w: width,
      h: titleHeight,
      color: HISTORY_TOKENS.colors.text,
      text: gettext('history.title'),
      text_size: Math.round(width * HISTORY_TOKENS.fontScale.title),
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V
    })

    if (this.historyEntries.length === 0) {
      // Empty state
      this.createWidget(hmUI.widget.TEXT, {
        x: sideInset,
        y: listY,
        w: listWidth,
        h: listHeight,
        color: HISTORY_TOKENS.colors.mutedText,
        text: gettext('history.empty'),
        text_size: Math.round(width * HISTORY_TOKENS.fontScale.empty),
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V
      })
    } else {
      // List container card
      this.createWidget(hmUI.widget.FILL_RECT, {
        x: listX,
        y: listY,
        w: listWidth,
        h: listHeight,
        radius: Math.round(listHeight * 0.12),
        color: HISTORY_TOKENS.colors.cardBackground
      })

      // Build data for SCROLL_LIST with separate date and score
      const scrollDataArray = this.historyEntries.map((entry) => {
        const dateStr = formatDate(entry.completedAt)
        const scoreStr = `${entry.setsWonTeamA}-${entry.setsWonTeamB}`

        return {
          date: dateStr,
          score: scoreStr,
          matchId: entry.id
        }
      })

      // SCROLL_LIST with TWO text views: date (white) and score (accent)
      this.createWidget(hmUI.widget.SCROLL_LIST, {
        x: listX,
        y: listY,
        w: listWidth,
        h: listHeight,
        item_space: 2,
        item_config: [
          {
            type_id: 1,
            item_height: rowHeight,
            item_bg_color: HISTORY_TOKENS.colors.cardBackground,
            item_bg_radius: 0,
            text_view: [
              // Date - left side, white
              {
                x: Math.round(width * 0.02),
                y: Math.round(
                  (rowHeight -
                    Math.round(width * HISTORY_TOKENS.fontScale.date)) /
                    2
                ),
                w: Math.round(listWidth * 0.6),
                h: Math.round(width * HISTORY_TOKENS.fontScale.date),
                key: 'date',
                color: HISTORY_TOKENS.colors.text,
                text_size: Math.round(width * HISTORY_TOKENS.fontScale.date)
              },
              // Score - right side, accent color
              {
                x: Math.round(listWidth * 0.55),
                y: Math.round(
                  (rowHeight -
                    Math.round(width * HISTORY_TOKENS.fontScale.score)) /
                    2
                ),
                w: Math.round(listWidth * 0.4),
                h: Math.round(width * HISTORY_TOKENS.fontScale.score),
                key: 'score',
                color: HISTORY_TOKENS.colors.accent,
                text_size: Math.round(width * HISTORY_TOKENS.fontScale.score)
              }
            ],
            text_view_count: 2
          }
        ],
        item_config_count: 1,
        data_array: scrollDataArray,
        data_count: scrollDataArray.length,
        item_click_func: (list, index) => {
          this.handleHistoryItemClick(index)
        }
      })
    }

    // Back to Home button
    this.createWidget(hmUI.widget.BUTTON, {
      x: sideInset,
      y: actionsSectionY,
      w: buttonWidth,
      h: buttonHeight,
      radius: Math.round(buttonHeight / 2),
      normal_color: HISTORY_TOKENS.colors.buttonSecondary,
      press_color: HISTORY_TOKENS.colors.buttonSecondaryPressed,
      color: HISTORY_TOKENS.colors.buttonSecondaryText,
      text_size: Math.round(width * HISTORY_TOKENS.fontScale.button),
      text: gettext('history.back'),
      click_func: () => this.navigateToHomePage()
    })
  }
})
