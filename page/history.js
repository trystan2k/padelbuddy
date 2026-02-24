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
    cardBackground: 0x000000,
    mutedText: 0x7d8289,
    text: 0xffffff,
    winner: 0x1eb98c
  },
  fontScale: {
    button: 0.05, // Larger button
    empty: 0.052,
    score: 0.095, // Increased more
    title: 0.065,
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

function formatDate(entry) {
  if (!entry) {
    return ''
  }

  const pad = (n) => (n < 10 ? `0${n}` : String(n))

  if (entry.localTime && typeof entry.localTime === 'object') {
    const lt = entry.localTime
    const day = lt.day
    const month = lt.month
    const year = lt.year
    const hours = lt.hour
    const minutes = lt.minute

    if (
      Number.isFinite(day) &&
      Number.isFinite(month) &&
      Number.isFinite(year) &&
      Number.isFinite(hours) &&
      Number.isFinite(minutes)
    ) {
      return `${pad(day)}/${pad(month)}/${year} ${pad(hours)}:${pad(minutes)}`
    }
  }

  if (Number.isFinite(entry.completedAt)) {
    const date = new Date(entry.completedAt)
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    const hours = date.getHours()
    const minutes = date.getMinutes()

    return `${pad(day)}/${pad(month)}/${year} ${pad(hours)}:${pad(minutes)}`
  }

  return ''
}

Page({
  onInit(_params) {
    this.widgets = []
    this.historyEntries = []
    this.scrollList = null

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
      this.scrollList = null
      return
    }

    this.widgets.forEach((widget) => hmUI.deleteWidget(widget))
    this.widgets = []
    this.scrollList = null
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

  goBack() {
    if (typeof hmApp === 'undefined' || typeof hmApp.goBack !== 'function') {
      return
    }

    try {
      hmApp.goBack()
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
    if (entry?.id) {
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
    const goBackIconSize = 48
    const goBackIconX = Math.round((width - goBackIconSize) / 2)
    const goBackIconY = height - bottomInset - goBackIconSize
    const buttonHeight = clamp(Math.round(height * 0.11), 50, 58) // kept for list height calculation

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

      // Layout calculations for chevron icon
      const iconSize = Math.round(rowHeight * 0.5)
      const iconPad = Math.round(width * 0.02)
      const iconX = listWidth - iconSize - iconPad
      const iconY = Math.round((rowHeight - iconSize) / 2)

      // Adjusted positions to make room for icon
      const dateX = Math.round(width * 0.02)
      const dateWidth = Math.round(listWidth * 0.45)
      const scoreX = Math.round(listWidth * 0.5)
      const scoreWidth = iconX - scoreX - iconPad

      // Build data for SCROLL_LIST with separate date, score, and chevron icon
      const scrollDataArray = this.historyEntries.map((entry) => {
        const dateStr = formatDate(entry)
        const scoreStr = `${entry.setsWonTeamA}-${entry.setsWonTeamB}`

        return {
          date: dateStr,
          score: scoreStr,
          icon: 'chevron-icon.png'
        }
      })

      // Single item config (no danger state needed)
      const itemConfig = {
        type_id: 1,
        item_height: rowHeight,
        item_bg_color: HISTORY_TOKENS.colors.cardBackground,
        item_bg_radius: 0,
        text_view: [
          // Date - left side, white
          {
            x: dateX,
            y: Math.round(
              (rowHeight - Math.round(width * HISTORY_TOKENS.fontScale.date)) /
                2
            ),
            w: dateWidth,
            h: Math.round(width * HISTORY_TOKENS.fontScale.date),
            key: 'date',
            color: HISTORY_TOKENS.colors.text,
            text_size: Math.round(width * HISTORY_TOKENS.fontScale.date)
          },
          // Score - center, accent color
          {
            x: scoreX,
            y: Math.round(
              (rowHeight - Math.round(width * HISTORY_TOKENS.fontScale.score)) /
                2
            ),
            w: scoreWidth,
            h: Math.round(width * HISTORY_TOKENS.fontScale.score),
            key: 'score',
            color: HISTORY_TOKENS.colors.accent,
            text_size: Math.round(width * HISTORY_TOKENS.fontScale.score)
          }
        ],
        text_view_count: 2,
        image_view: [
          { x: iconX, y: iconY, w: iconSize, h: iconSize, key: 'icon' }
        ],
        image_view_count: 1
      }

      // SCROLL_LIST - simplified with single config
      this.scrollList = this.createWidget(hmUI.widget.SCROLL_LIST, {
        x: listX,
        y: listY,
        w: listWidth,
        h: listHeight,
        item_space: 2,
        item_config: [itemConfig],
        item_config_count: 1,
        data_array: scrollDataArray,
        data_count: scrollDataArray.length,
        item_click_func: (_list, index) => {
          // Navigate to detail page
          this.handleHistoryItemClick(index)
        }
      })
    }

    // Go back button - same as settings page
    this.createWidget(hmUI.widget.BUTTON, {
      x: goBackIconX,
      y: goBackIconY,
      w: -1,
      h: -1,
      normal_src: 'goback-icon.png',
      press_src: 'goback-icon.png',
      click_func: () => this.goBack()
    })
  }
})
