import { gettext } from 'i18n'
import { clearAllAppData } from '../utils/app-data-clear.js'
import { APP_VERSION } from '../utils/version.js'

const SETTINGS_TOKENS = Object.freeze({
  colors: {
    background: 0x000000,
    cardBackground: 0x111318,
    text: 0xffffff,
    mutedText: 0x7d8289,
    danger: 0xff0000
  },
  fontScale: {
    title: 0.065,
    item: 0.07,
    version: 0.055
  },
  spacingScale: {
    topInset: 0.035,
    bottomInset: 0.06,
    sideInset: 0.04,
    sectionGap: 0.015
  }
})

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function ensureNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

Page({
  onInit() {
    this.widgets = []
    this.scrollList = null
    this.clearConfirmMode = false
    this.confirmTimeout = null
  },

  build() {
    this.renderSettingsScreen()
  },

  onDestroy() {
    if (this.confirmTimeout) {
      clearTimeout(this.confirmTimeout)
      this.confirmTimeout = null
    }
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

  navigateToHistoryPage() {
    if (typeof hmApp === 'undefined' || typeof hmApp.gotoPage !== 'function') {
      return
    }

    try {
      hmApp.gotoPage({ url: 'page/history' })
    } catch {
      // Ignore navigation errors
    }
  },

  navigateToHomePage() {
    if (typeof hmApp === 'undefined' || typeof hmApp.gotoPage !== 'function') {
      return
    }

    try {
      hmApp.gotoPage({ url: 'page/index' })
    } catch {
      // Ignore navigation errors
    }
  },

  // type_id 1 = normal, type_id 2 = danger (red), type_id 3 = version (muted)
  updateListData(confirmMode) {
    if (!this.scrollList) return

    this.scrollList.setProperty(hmUI.prop.UPDATE_DATA, {
      data_type_config: [
        { start: 0, end: 0, type_id: 1 },
        { start: 1, end: 1, type_id: confirmMode ? 2 : 1 },
        { start: 2, end: 2, type_id: 3 }
      ],
      data_type_config_count: 3,
      data_array: [
        {
          label: gettext('settings.previousMatches'),
          icon: 'chevron-icon.png'
        },
        {
          label: confirmMode
            ? gettext('settings.clearDataConfirm')
            : gettext('settings.clearAppData'),
          icon: 'delete-icon.png'
        },
        {
          version: `${gettext('settings.version')} ${APP_VERSION}`
        }
      ],
      data_count: 3,
      on_page: 1
    })
  },

  handleListItemClick(index) {
    if (index === 0) {
      this.navigateToHistoryPage()
    } else if (index === 1) {
      if (this.clearConfirmMode) {
        // Second tap - confirm
        this.clearConfirmMode = false
        if (this.confirmTimeout) {
          clearTimeout(this.confirmTimeout)
          this.confirmTimeout = null
        }
        this.updateListData(false)

        // Perform clear
        const success = clearAllAppData()

        // Show toast
        if (
          typeof hmUI !== 'undefined' &&
          typeof hmUI.showToast === 'function'
        ) {
          try {
            hmUI.showToast({
              text: success
                ? gettext('settings.dataCleared')
                : gettext('settings.clearFailed')
            })
          } catch (_e) {
            // Ignore toast error
          }
        }

        // Navigate to home after a brief delay to let toast show
        setTimeout(() => {
          this.navigateToHomePage()
        }, 500)
      } else {
        // First tap - enter confirm mode
        this.clearConfirmMode = true
        this.updateListData(true)

        // Auto-reset after 3 seconds
        this.confirmTimeout = setTimeout(() => {
          this.clearConfirmMode = false
          this.confirmTimeout = null
          this.updateListData(false)
        }, 3000)
      }
    }
    // index === 2 is version item - do nothing (non-clickable)
  },

  renderSettingsScreen() {
    if (typeof hmUI === 'undefined') {
      return
    }

    const { width, height } = this.getScreenMetrics()
    const topInset = Math.round(height * SETTINGS_TOKENS.spacingScale.topInset)
    const bottomInset = Math.round(
      height * SETTINGS_TOKENS.spacingScale.bottomInset
    )
    const sectionGap = Math.round(
      height * SETTINGS_TOKENS.spacingScale.sectionGap
    )
    const sideInset = Math.max(
      Math.round(width * SETTINGS_TOKENS.spacingScale.sideInset),
      Math.round(width * 0.02)
    )

    const titleHeight = clamp(Math.round(height * 0.07), 28, 36)

    const spaceForTitle = titleHeight + sectionGap * 2
    const listMaxHeight = height - topInset - bottomInset - spaceForTitle
    const rowHeight = Math.floor(listMaxHeight / 3.57)
    const listHeight = rowHeight * 3 + 2

    const listY = topInset + titleHeight + sectionGap * 2
    const goBackIconSize = 48
    const goBackIconX = Math.round((width - goBackIconSize) / 2)
    const goBackIconY = height - bottomInset - goBackIconSize
    const listX = sideInset
    const listWidth = Math.max(1, width - sideInset * 2)

    this.clearWidgets()

    // Background
    this.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: width,
      h: height,
      color: SETTINGS_TOKENS.colors.background
    })

    // Title
    this.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: topInset,
      w: width,
      h: titleHeight,
      color: SETTINGS_TOKENS.colors.text,
      text: gettext('settings.title'),
      text_size: Math.round(width * SETTINGS_TOKENS.fontScale.title),
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V
    })

    const itemTextSize = Math.round(width * SETTINGS_TOKENS.fontScale.item)
    const textH = Math.round(itemTextSize * 1.4)
    const textY = Math.round((rowHeight - textH) / 2)
    const iconSize = Math.round(textH)
    const iconPad = Math.round(width * 0.02)
    const iconX = listWidth - iconSize - iconPad
    const iconY = Math.round((rowHeight - iconSize) / 2)
    const textX = iconPad
    const textW = iconX - textX - iconPad / 2

    // Version text styling (centered, smaller)
    const versionTextSize = Math.round(
      width * SETTINGS_TOKENS.fontScale.version
    )
    const versionTextH = Math.round(versionTextSize * 1.4)
    const versionTextY = Math.round((rowHeight - versionTextH) / 2)

    // Three item type configs: type_id 1 = normal, type_id 2 = danger (red text), type_id 3 = version (muted, centered)
    const itemConfigNormal = {
      type_id: 1,
      item_height: rowHeight,
      item_bg_color: SETTINGS_TOKENS.colors.background,
      item_bg_radius: 0,
      text_view: [
        {
          x: textX,
          y: textY,
          w: textW,
          h: textH,
          key: 'label',
          color: SETTINGS_TOKENS.colors.text,
          text_size: itemTextSize
        }
      ],
      text_view_count: 1,
      image_view: [
        { x: iconX, y: iconY, w: iconSize, h: iconSize, key: 'icon' }
      ],
      image_view_count: 1
    }

    const itemConfigDanger = {
      type_id: 2,
      item_height: rowHeight,
      item_bg_color: SETTINGS_TOKENS.colors.background,
      item_bg_radius: 0,
      text_view: [
        {
          x: textX,
          y: textY,
          w: textW,
          h: textH,
          key: 'label',
          color: SETTINGS_TOKENS.colors.danger,
          text_size: itemTextSize
        }
      ],
      text_view_count: 1,
      image_view: [
        { x: iconX, y: iconY, w: iconSize, h: iconSize, key: 'icon' }
      ],
      image_view_count: 1
    }

    const itemConfigVersion = {
      type_id: 3,
      item_height: rowHeight,
      item_bg_color: SETTINGS_TOKENS.colors.background,
      item_bg_radius: 0,
      text_view: [
        {
          x: 0,
          y: versionTextY,
          w: listWidth,
          h: versionTextH,
          key: 'version',
          color: SETTINGS_TOKENS.colors.mutedText,
          text_size: versionTextSize
        }
      ],
      text_view_count: 1,
      image_view: [],
      image_view_count: 0
    }

    // SCROLL_LIST with three type configs
    this.scrollList = this.createWidget(hmUI.widget.SCROLL_LIST, {
      x: listX,
      y: listY,
      w: listWidth,
      h: listHeight,
      item_space: 2,
      item_config: [itemConfigNormal, itemConfigDanger, itemConfigVersion],
      item_config_count: 3,
      data_array: [
        {
          label: gettext('settings.previousMatches'),
          icon: 'chevron-icon.png'
        },
        { label: gettext('settings.clearAppData'), icon: 'delete-icon.png' },
        { version: `${gettext('settings.version')} ${APP_VERSION}` }
      ],
      data_count: 3,
      item_click_func: (_list, index) => {
        this.handleListItemClick(index)
      },
      data_type_config: [
        { start: 0, end: 0, type_id: 1 },
        { start: 1, end: 1, type_id: 1 },
        { start: 2, end: 2, type_id: 3 }
      ],
      data_type_config_count: 3
    })

    // Go back button
    this.createWidget(hmUI.widget.BUTTON, {
      x: goBackIconX,
      y: goBackIconY,
      w: -1,
      h: -1,
      normal_src: 'goback-icon.png',
      press_src: 'goback-icon.png',
      click_func: () => this.navigateToHomePage()
    })
  }
})
