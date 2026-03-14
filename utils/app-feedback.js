import { storage, toast } from './platform-adapters.js'

export const HOME_FEEDBACK_MESSAGE_KEY = 'padel-buddy.home-feedback-message-key'

export function queueHomeFeedbackMessage(messageKey) {
  if (typeof messageKey !== 'string' || messageKey.length === 0) {
    return false
  }

  try {
    storage.setItem(HOME_FEEDBACK_MESSAGE_KEY, messageKey)
    return true
  } catch {
    return false
  }
}

export function flushHomeFeedbackMessage(gettext) {
  if (typeof gettext !== 'function') {
    return null
  }

  try {
    const pendingMessageKey = storage.getItem(HOME_FEEDBACK_MESSAGE_KEY)

    if (
      typeof pendingMessageKey !== 'string' ||
      pendingMessageKey.length === 0
    ) {
      return null
    }

    storage.removeItem(HOME_FEEDBACK_MESSAGE_KEY)
    toast.showToast(gettext(pendingMessageKey))

    return pendingMessageKey
  } catch {
    return null
  }
}
