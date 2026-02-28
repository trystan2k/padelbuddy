import { gettext } from 'i18n'
import { clearAllAppData } from '../utils/app-data-clear.js'
import { getFontSize, TOKENS, toPercentage } from '../utils/design-tokens.js'
import { resolveLayout } from '../utils/layout-engine.js'
import { clamp, getScreenMetrics } from '../utils/screen-utils.js'
import {
  createBackground,
  createButton,
  createText
} from '../utils/ui-components.js'
import { APP_VERSION } from '../utils/version.js'

/**
 * Layout schema for the settings screen.
 * Uses declarative positioning resolved by layout-engine.
 * Matches the summary page layout structure.
 */
const SETTINGS_LAYOUT = {
  sections: {
    // Header section: Contains only the page title
    header: {
      top: toPercentage(TOKENS.spacing.pageTop), // '5%'
      height: '10%', // Just title
      roundSafeInset: false
    },
    // Body section: Settings scroll list (fills remaining space)
    body: {
      height: 'fill',
      after: 'header',
      gap: toPercentage(TOKENS.spacing.sectionGap), // '2%'
      roundSafeInset: false
    },
    // Footer section: Go back button (bottom-anchored)
    footer: {
      bottom: toPercentage(TOKENS.spacing.pageBottom), // '6%'
      height: '10%', // Button area height
      roundSafeInset: false // Centered icon doesn't need inset
    }
  },
  elements: {
    // Title text ("Settings")
    pageTitle: {
      section: 'header',
      x: 'center',
      y: '30%',
      width: '100%',
      height: '50%',
      align: 'center',
      _meta: {
        type: 'text',
        style: 'pageTitle',
        textKey: 'settings.title'
      }
    },
    // Settings scroll list (in body section)
    scrollList: {
      section: 'body',
      x: 0,
      y: 0,
      width: '100%',
      height: '100%',
      align: 'center',
      _meta: {
        type: 'scrollList'
      }
    },
    // Go back button (centered in footer)
    goBackButton: {
      section: 'footer',
      x: 'center',
      y: 'center',
      width: TOKENS.sizing.iconLarge,
      height: TOKENS.sizing.iconLarge,
      align: 'center',
      _meta: {
        type: 'iconButton',
        icon: 'goback-icon.png',
        onClick: 'navigateToHomePage'
      }
    }
  }
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

    const metrics = getScreenMetrics()
    const layout = resolveLayout(SETTINGS_LAYOUT, metrics)

    this.clearWidgets()

    // ── Background ────────────────────────────────────────────────────────
    const bg = createBackground()
    this.createWidget(bg.widgetType, bg.config)

    // ── Header Section ─────────────────────────────────────────────────────
    const headerSection = layout.sections.header
    const elements = SETTINGS_LAYOUT.elements

    const titleMeta = elements.pageTitle._meta
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

    // ── Body Section (Scroll List) ─────────────────────────────────────────
    const listEl = layout.elements.scrollList
    if (listEl) {
      // Calculate row height matching summary.js pattern (doubled for better touch targets)
      const rowHeight = clamp(
        Math.round(metrics.width * TOKENS.typography.body * 3),
        80,
        80
      )

      // Text sizing
      const itemTextSize = getFontSize('bodyLarge')
      const versionTextSize = getFontSize('sectionTitle')
      const textH = Math.round(itemTextSize * 1.4)
      const textY = Math.round((rowHeight - textH) / 2)
      const padding = Math.round(metrics.width * 0.02)
      // Icon sizing
      const iconSize = TOKENS.sizing.iconLarge

      // Text positioning (starts from left, limited width)
      const textX = padding
      const textW = Math.round(listEl.w * 0.75) // Limit text width to 75%

      // Icon positioning (immediately after text, not at far right edge)
      const iconX = textX + textW + padding
      const iconY = Math.round((rowHeight - iconSize) / 2)

      // Version text (centered, smaller)
      const versionTextH = Math.round(versionTextSize * 1.4)
      const versionTextY = Math.round((rowHeight - versionTextH) / 2)

      // Item configs: type_id 1 = normal, type_id 2 = danger (red), type_id 3 = version (muted)
      const itemConfigNormal = {
        type_id: 1,
        item_height: rowHeight,
        item_bg_color: TOKENS.colors.background,
        item_bg_radius: 0,
        text_view: [
          {
            x: textX,
            y: Math.round(textY * 0.9),
            w: textW,
            h: textH,
            key: 'label',
            color: TOKENS.colors.text,
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
        item_bg_color: TOKENS.colors.background,
        item_bg_radius: 0,
        text_view: [
          {
            x: textX,
            y: Math.round(textY * 0.85),
            w: textW,
            h: textH,
            key: 'label',
            color: TOKENS.colors.danger,
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
        item_bg_color: TOKENS.colors.background,
        item_bg_radius: 0,
        text_view: [
          {
            x: 0,
            y: versionTextY,
            w: listEl.w,
            h: versionTextH,
            key: 'version',
            color: TOKENS.colors.mutedText,
            text_size: versionTextSize
          }
        ],
        text_view_count: 1,
        image_view: [],
        image_view_count: 0
      }

      // Create scroll list
      this.scrollList = this.createWidget(hmUI.widget.SCROLL_LIST, {
        x: listEl.x,
        y: listEl.y,
        w: listEl.w,
        h: rowHeight * 4,
        item_space: 0,
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
    }

    // ── Footer Section ─────────────────────────────────────────────────────
    const goBackEl = layout.elements.goBackButton
    const goBackMeta = SETTINGS_LAYOUT.elements.goBackButton._meta
    if (goBackEl) {
      const goBackBtn = createButton({
        x: goBackEl.x,
        y: goBackEl.y,
        variant: 'icon',
        normal_src: goBackMeta.icon,
        onClick: () => this.navigateToHomePage()
      })
      this.createWidget(goBackBtn.widgetType, goBackBtn.config)
    }
  }
})
