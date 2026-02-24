import { gettext } from 'i18n'
import { loadMatchById } from '../utils/match-history-storage.js'

const HISTORY_DETAIL_TOKENS = Object.freeze({
  colors: {
    accent: 0x1eb98c,
    accentPressed: 0x1aa07a,
    background: 0x000000,
    buttonSecondary: 0x24262b,
    buttonSecondaryPressed: 0x2d3036,
    buttonSecondaryText: 0xffffff,
    cardBackground: 0x000000,
    mutedText: 0x7d8289,
    text: 0xffffff
  },
  fontScale: {
    body: 0.055, // Increased more
    button: 0.055, // Increased more
    label: 0.06, // Increased more
    score: 0.15, // Increased significantly
    subtitle: 0.07, // Increased more
    title: 0.065,
    setHistory: 0.06 // Increased more
  },
  spacingScale: {
    bottomInset: 0.05,
    roundSideInset: 0.06, // Reduced for wider content
    sectionGap: 0.015,
    sideInset: 0.04, // Reduced for wider content
    topInset: 0.03
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
    this.matchEntry = null
    this.parseParams(params)
    // Render screen after loading data (v1.0 compatible - no onShow)
    this.renderDetailScreen()
  },

  build() {
    // Don't re-render in build() - onInit already rendered
  },

  onDestroy() {
    this.clearWidgets()
  },

  parseParams(params) {
    // Zepp OS v1.0: params is passed directly from gotoPage 'param' property
    if (!params) {
      return
    }

    let matchId = null

    // Check if params looks like a query string (contains '=' or '?')
    if (
      typeof params === 'string' &&
      (params.includes('=') || params.includes('?'))
    ) {
      // Parse query string format
      const queryString = params.split('?').pop() || params
      const pairs = queryString.split('&')

      for (let i = 0; i < pairs.length; i += 1) {
        const pair = pairs[i].split('=')
        if (pair[0] === 'id' && pair.length > 1) {
          matchId = decodeURIComponent(pair[1])
          break
        }
      }
    } else {
      // params IS the matchId directly
      matchId = params
    }

    if (matchId) {
      try {
        this.matchEntry = loadMatchById(matchId)
      } catch {
        this.matchEntry = null
      }
    }
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

  renderDetailScreen() {
    if (typeof hmUI === 'undefined') {
      return
    }

    const { width, height } = this.getScreenMetrics()
    const isRoundScreen = Math.abs(width - height) <= Math.round(width * 0.04)
    const topInset = Math.round(
      height * HISTORY_DETAIL_TOKENS.spacingScale.topInset
    )
    const bottomInset = Math.round(
      height * HISTORY_DETAIL_TOKENS.spacingScale.bottomInset
    )
    const sectionGap = Math.round(
      height * HISTORY_DETAIL_TOKENS.spacingScale.sectionGap
    )
    const baseSectionSideInset = Math.round(
      width *
        (isRoundScreen
          ? HISTORY_DETAIL_TOKENS.spacingScale.roundSideInset
          : HISTORY_DETAIL_TOKENS.spacingScale.sideInset)
    )
    const goBackIconSize = 48
    const goBackIconX = Math.round((width - goBackIconSize) / 2)
    const goBackIconY = height - bottomInset - goBackIconSize
    const buttonHeight = clamp(Math.round(height * 0.105), 48, 58) // kept for layout calculation
    const maxSectionInset = Math.floor((width - 1) / 2)

    // Calculate layout
    const titleHeight = clamp(Math.round(height * 0.1), 36, 52)
    const scoreCardHeight = clamp(Math.round(height * 0.3), 150, 150)
    const scoreCardY = topInset + titleHeight + sectionGap

    const resolveSectionSideInset = (sectionY, sectionHeight) => {
      if (!isRoundScreen) {
        return clamp(baseSectionSideInset, 0, maxSectionInset)
      }

      const roundSafeInset = calculateRoundSafeSectionSideInset(
        width,
        height,
        sectionY,
        sectionHeight,
        Math.round(width * 0.01)
      )

      return clamp(
        Math.max(baseSectionSideInset, roundSafeInset),
        0,
        maxSectionInset
      )
    }

    const contentSideInset = resolveSectionSideInset(
      scoreCardY,
      scoreCardHeight
    )
    const contentX = contentSideInset
    const contentWidth = Math.max(1, width - contentSideInset * 2)

    const actionsSectionY = height - bottomInset - buttonHeight

    this.clearWidgets()

    // Background
    this.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: width,
      h: height,
      color: HISTORY_DETAIL_TOKENS.colors.background
    })

    // Title
    this.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: topInset,
      w: width,
      h: titleHeight,
      color: HISTORY_DETAIL_TOKENS.colors.text,
      text: gettext('history.detail.title'),
      text_size: Math.round(width * HISTORY_DETAIL_TOKENS.fontScale.title),
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V
    })

    if (!this.matchEntry) {
      // No match found
      const noMatchHeight = clamp(Math.round(height * 0.2), 60, 100)
      this.createWidget(hmUI.widget.TEXT, {
        x: contentSideInset,
        y: scoreCardY,
        w: contentWidth,
        h: noMatchHeight,
        color: HISTORY_DETAIL_TOKENS.colors.mutedText,
        text: gettext('history.detail.notFound'),
        text_size: Math.round(width * HISTORY_DETAIL_TOKENS.fontScale.body),
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V
      })
    } else {
      // Match details card
      this.createWidget(hmUI.widget.FILL_RECT, {
        x: contentX,
        y: scoreCardY,
        w: contentWidth,
        h: scoreCardHeight,
        radius: Math.round(scoreCardHeight * 0.15),
        color: HISTORY_DETAIL_TOKENS.colors.cardBackground
      })

      // Date
      const dateStr = formatDate(this.matchEntry)
      const dateLabelHeight = Math.round(scoreCardHeight * 0.15)
      this.createWidget(hmUI.widget.TEXT, {
        x: contentX,
        y: scoreCardY + Math.round(scoreCardHeight * 0.03),
        w: contentWidth,
        h: dateLabelHeight,
        color: HISTORY_DETAIL_TOKENS.colors.mutedText,
        text: dateStr,
        text_size: Math.round(width * HISTORY_DETAIL_TOKENS.fontScale.label),
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V
      })

      // Final score
      const scoreHeight = Math.round(scoreCardHeight * 0.4)
      const scoreY = scoreCardY + Math.round(scoreCardHeight * 0.25)
      const winnerText =
        this.matchEntry.winnerTeam === 'teamA'
          ? `${this.matchEntry.teamALabel} ${gettext('history.detail.wins')}`
          : this.matchEntry.winnerTeam === 'teamB'
            ? `${this.matchEntry.teamBLabel} ${gettext('history.detail.wins')}`
            : gettext('history.detail.draw')

      this.createWidget(hmUI.widget.TEXT, {
        x: contentX,
        y: scoreY,
        w: contentWidth,
        h: scoreHeight,
        color: HISTORY_DETAIL_TOKENS.colors.text,
        text: `${this.matchEntry.setsWonTeamA} - ${this.matchEntry.setsWonTeamB}`,
        text_size: Math.round(width * HISTORY_DETAIL_TOKENS.fontScale.score),
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V
      })

      // Winner
      const winnerHeight = Math.round(scoreCardHeight * 0.18)
      const winnerY = scoreY + scoreHeight
      this.createWidget(hmUI.widget.TEXT, {
        x: contentX,
        y: winnerY,
        w: contentWidth,
        h: winnerHeight,
        color: HISTORY_DETAIL_TOKENS.colors.accent,
        text: winnerText,
        text_size: Math.round(width * HISTORY_DETAIL_TOKENS.fontScale.body),
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V
      })

      // Set history section - SCROLL_LIST for bigger fonts
      if (this.matchEntry.setHistory && this.matchEntry.setHistory.length > 0) {
        const setsCardY = scoreCardY + scoreCardHeight + sectionGap
        // Make set history section larger for scroll list
        const setsCardHeight = actionsSectionY - setsCardY - sectionGap
        const setsSideInset = resolveSectionSideInset(setsCardY, setsCardHeight)
        const setsX = setsSideInset
        const setsWidth = Math.max(1, width - setsSideInset * 2)

        // Card background for set history
        this.createWidget(hmUI.widget.FILL_RECT, {
          x: setsX,
          y: setsCardY,
          w: setsWidth,
          h: setsCardHeight,
          radius: Math.round(setsCardHeight * 0.08),
          color: HISTORY_DETAIL_TOKENS.colors.cardBackground
        })

        // Title for set history
        const setsTitleHeight = Math.round(height * 0.05)
        this.createWidget(hmUI.widget.TEXT, {
          x: setsX,
          y: setsCardY + Math.round(height * 0.01),
          w: setsWidth,
          h: setsTitleHeight,
          color: HISTORY_DETAIL_TOKENS.colors.mutedText,
          text: gettext('history.detail.setHistory'),
          text_size: Math.round(width * HISTORY_DETAIL_TOKENS.fontScale.label),
          align_h: hmUI.align.CENTER_H,
          align_v: hmUI.align.CENTER_V
        })

        // Build data for SCROLL_LIST
        const setsBodyY =
          setsCardY + setsTitleHeight + Math.round(height * 0.01)
        const setsBodyHeight =
          setsCardHeight - setsTitleHeight - Math.round(height * 0.02)
        const setRowHeight = Math.round(height * 0.07) // Height for each set row

        // Build data array for scroll list
        const setsDataArray = this.matchEntry.setHistory.map((set) => ({
          setInfo: `Set ${set.setNumber}:  ${set.teamAGames} - ${set.teamBGames}`
        }))

        // SCROLL_LIST for set history with bigger fonts
        this.createWidget(hmUI.widget.SCROLL_LIST, {
          x: setsX,
          y: setsBodyY,
          w: setsWidth,
          h: setsBodyHeight,
          item_space: 2,
          item_config: [
            {
              type_id: 1,
              item_height: setRowHeight,
              item_bg_color: HISTORY_DETAIL_TOKENS.colors.cardBackground,
              item_bg_radius: 0,
              text_view: [
                {
                  x: Math.round(width * 0.02),
                  y: Math.round(
                    (setRowHeight -
                      Math.round(
                        width * HISTORY_DETAIL_TOKENS.fontScale.setHistory
                      )) /
                      2
                  ),
                  w: Math.round(setsWidth * 0.9),
                  h: Math.round(
                    width * HISTORY_DETAIL_TOKENS.fontScale.setHistory
                  ),
                  key: 'setInfo',
                  color: HISTORY_DETAIL_TOKENS.colors.text,
                  text_size: Math.round(
                    width * HISTORY_DETAIL_TOKENS.fontScale.setHistory
                  )
                }
              ],
              text_view_count: 1
            }
          ],
          item_config_count: 1,
          data_array: setsDataArray,
          data_count: setsDataArray.length
        })
      }
    }

    // Go back button - same as settings and history pages
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
