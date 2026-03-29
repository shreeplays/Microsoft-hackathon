/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           Notification System — AI Code Visualizer          ║
 * ║  Toast notifications, status alerts, progress indicators    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Features:
 *   • Toast notifications (success, error, warning, info)
 *   • Auto-dismiss with configurable duration
 *   • Stacking with smart positioning
 *   • Progress bar for long-running tasks
 *   • Notification history log
 *   • Sound feedback (optional)
 */

console.log("Notification System Loaded")

// ─── Configuration ───────────────────────────────────────────

const NotificationConfig = {
  maxVisible: 5,
  defaultDuration: 4000,
  animationDuration: 300,
  position: "top-right",   // top-right, top-left, bottom-right, bottom-left
  gap: 8,
  zIndex: 10000
}

// ─── Notification State ──────────────────────────────────────

const _notifications = []
const _history = []
let _containerId = "notification-container"
let _nextId = 1

// ─── Theme Colors ────────────────────────────────────────────

const NotificationThemes = {
  success: {
    bg: "linear-gradient(135deg, #1e3a2f 0%, #1a2f1a 100%)",
    border: "#a6e3a1",
    icon: "✅",
    textColor: "#a6e3a1"
  },
  error: {
    bg: "linear-gradient(135deg, #3a1a1a 0%, #2d1b1b 100%)",
    border: "#f38ba8",
    icon: "❌",
    textColor: "#f38ba8"
  },
  warning: {
    bg: "linear-gradient(135deg, #3a2f1a 0%, #2d2a1b 100%)",
    border: "#f9e2af",
    icon: "⚠️",
    textColor: "#f9e2af"
  },
  info: {
    bg: "linear-gradient(135deg, #1a2a3a 0%, #1b2535 100%)",
    border: "#89b4fa",
    icon: "ℹ️",
    textColor: "#89b4fa"
  },
  loading: {
    bg: "linear-gradient(135deg, #2a1a3a 0%, #251b35 100%)",
    border: "#cba6f7",
    icon: "⏳",
    textColor: "#cba6f7"
  }
}

// ─── Create Container ────────────────────────────────────────

function _ensureContainer() {
  let container = document.getElementById(_containerId)
  if (container) return container

  container = document.createElement("div")
  container.id = _containerId

  const posStyles = _getPositionStyles()

  container.style.cssText = [
    "position:fixed",
    posStyles,
    "z-index:" + NotificationConfig.zIndex,
    "display:flex",
    "flex-direction:column",
    "gap:" + NotificationConfig.gap + "px",
    "pointer-events:none",
    "max-width:380px",
    "width:100%"
  ].join(";")

  document.body.appendChild(container)
  return container
}

function _getPositionStyles() {
  switch (NotificationConfig.position) {
    case "top-left":
      return "top:16px;left:16px"
    case "bottom-right":
      return "bottom:16px;right:16px"
    case "bottom-left":
      return "bottom:16px;left:16px"
    default:
      return "top:16px;right:16px"
  }
}

// ─── Create Toast Element ────────────────────────────────────

function _createToastElement(id, type, title, message, options) {
  const theme = NotificationThemes[type] || NotificationThemes.info

  const toast = document.createElement("div")
  toast.id = "toast-" + id
  toast.setAttribute("role", "alert")
  toast.setAttribute("aria-live", "polite")

  toast.style.cssText = [
    "pointer-events:auto",
    "background:" + theme.bg,
    "border:1px solid " + theme.border,
    "border-radius:8px",
    "padding:12px 16px",
    "color:var(--fg, #cdd6f4)",
    "font-family:var(--vscode-font-family, 'Segoe UI', sans-serif)",
    "font-size:12px",
    "box-shadow:0 8px 32px rgba(0,0,0,0.4)",
    "opacity:0",
    "transform:translateX(100%)",
    "transition:opacity " + NotificationConfig.animationDuration + "ms ease, transform " + NotificationConfig.animationDuration + "ms ease",
    "cursor:pointer",
    "position:relative",
    "overflow:hidden",
    "backdrop-filter:blur(8px)"
  ].join(";")

  // Header row
  const header = document.createElement("div")
  header.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:" + (message ? "6px" : "0")

  const icon = document.createElement("span")
  icon.textContent = theme.icon
  icon.style.fontSize = "14px"

  const titleEl = document.createElement("span")
  titleEl.textContent = title
  titleEl.style.cssText = "font-weight:600;color:" + theme.textColor + ";flex:1"

  const closeBtn = document.createElement("span")
  closeBtn.textContent = "✕"
  closeBtn.style.cssText = [
    "cursor:pointer",
    "color:var(--fg2, #a6adc8)",
    "font-size:14px",
    "line-height:1",
    "padding:2px 4px",
    "border-radius:4px",
    "transition:background 0.15s"
  ].join(";")

  closeBtn.addEventListener("mouseenter", function() {
    closeBtn.style.background = "rgba(255,255,255,0.1)"
  })
  closeBtn.addEventListener("mouseleave", function() {
    closeBtn.style.background = "transparent"
  })
  closeBtn.addEventListener("click", function(e) {
    e.stopPropagation()
    dismissNotification(id)
  })

  header.appendChild(icon)
  header.appendChild(titleEl)
  header.appendChild(closeBtn)
  toast.appendChild(header)

  // Message body
  if (message) {
    const body = document.createElement("div")
    body.textContent = message
    body.style.cssText = "color:var(--fg, #cdd6f4);line-height:1.5;padding-left:22px"
    toast.appendChild(body)
  }

  // Progress bar (for timed auto-dismiss)
  if (options.showProgress !== false && options.duration > 0) {
    const progressTrack = document.createElement("div")
    progressTrack.style.cssText = [
      "position:absolute",
      "bottom:0",
      "left:0",
      "right:0",
      "height:3px",
      "background:rgba(0,0,0,0.3)"
    ].join(";")

    const progressBar = document.createElement("div")
    progressBar.id = "toast-progress-" + id
    progressBar.style.cssText = [
      "height:100%",
      "width:100%",
      "background:" + theme.border,
      "transition:width linear",
      "border-radius:0 0 8px 8px"
    ].join(";")

    progressTrack.appendChild(progressBar)
    toast.appendChild(progressTrack)
  }

  // Action buttons
  if (options.actions && options.actions.length > 0) {
    const actionsRow = document.createElement("div")
    actionsRow.style.cssText = "display:flex;gap:8px;margin-top:8px;padding-left:22px"

    options.actions.forEach(function(action) {
      const btn = document.createElement("button")
      btn.textContent = action.label
      btn.style.cssText = [
        "padding:4px 12px",
        "border:1px solid " + theme.border,
        "background:transparent",
        "color:" + theme.textColor,
        "border-radius:4px",
        "cursor:pointer",
        "font-size:11px",
        "transition:background 0.15s"
      ].join(";")

      btn.addEventListener("mouseenter", function() {
        btn.style.background = "rgba(255,255,255,0.1)"
      })
      btn.addEventListener("mouseleave", function() {
        btn.style.background = "transparent"
      })
      btn.addEventListener("click", function(e) {
        e.stopPropagation()
        if (action.onClick) action.onClick()
        dismissNotification(id)
      })

      actionsRow.appendChild(btn)
    })

    toast.appendChild(actionsRow)
  }

  return toast
}

// ─── Show Notification ───────────────────────────────────────

function showNotification(type, title, message, options) {
  options = options || {}
  const id = _nextId++
  const duration = options.duration !== undefined
    ? options.duration
    : NotificationConfig.defaultDuration

  const container = _ensureContainer()
  const toast = _createToastElement(id, type, title, message, {
    duration: duration,
    showProgress: options.showProgress,
    actions: options.actions
  })

  container.appendChild(toast)

  // Animate in
  requestAnimationFrame(function() {
    toast.style.opacity = "1"
    toast.style.transform = "translateX(0)"
  })

  // Track notification
  const notification = {
    id: id,
    type: type,
    title: title,
    message: message,
    element: toast,
    timerId: null,
    createdAt: Date.now()
  }

  _notifications.push(notification)
  _history.push({
    id: id,
    type: type,
    title: title,
    message: message,
    createdAt: Date.now()
  })

  // Auto-dismiss
  if (duration > 0) {
    // Animate progress bar
    const progressBar = document.getElementById("toast-progress-" + id)
    if (progressBar) {
      requestAnimationFrame(function() {
        progressBar.style.transitionDuration = duration + "ms"
        progressBar.style.width = "0%"
      })
    }

    notification.timerId = setTimeout(function() {
      dismissNotification(id)
    }, duration)

    // Pause on hover
    toast.addEventListener("mouseenter", function() {
      if (notification.timerId) {
        clearTimeout(notification.timerId)
        notification.timerId = null
      }
      if (progressBar) {
        progressBar.style.transitionDuration = "0ms"
        const computed = getComputedStyle(progressBar)
        progressBar.style.width = computed.width
      }
    })

    toast.addEventListener("mouseleave", function() {
      if (progressBar) {
        progressBar.style.transitionDuration = (duration / 2) + "ms"
        progressBar.style.width = "0%"
      }
      notification.timerId = setTimeout(function() {
        dismissNotification(id)
      }, duration / 2)
    })
  }

  // Trim overflow
  _trimNotifications()

  return id
}

// ─── Dismiss Notification ────────────────────────────────────

function dismissNotification(id) {
  const index = _notifications.findIndex(function(n) {
    return n.id === id
  })

  if (index === -1) return

  const notification = _notifications[index]

  if (notification.timerId) {
    clearTimeout(notification.timerId)
  }

  const el = notification.element

  el.style.opacity = "0"
  el.style.transform = "translateX(100%) scale(0.95)"

  setTimeout(function() {
    if (el.parentNode) {
      el.parentNode.removeChild(el)
    }
  }, NotificationConfig.animationDuration)

  _notifications.splice(index, 1)
}

function dismissAll() {
  const ids = _notifications.map(function(n) { return n.id })
  ids.forEach(dismissNotification)
}

// ─── Trim to Max Visible ─────────────────────────────────────

function _trimNotifications() {
  while (_notifications.length > NotificationConfig.maxVisible) {
    dismissNotification(_notifications[0].id)
  }
}

// ─── Convenience Methods ─────────────────────────────────────

function notifySuccess(title, message, options) {
  return showNotification("success", title, message, options)
}

function notifyError(title, message, options) {
  return showNotification("error", title, message, options)
}

function notifyWarning(title, message, options) {
  return showNotification("warning", title, message, options)
}

function notifyInfo(title, message, options) {
  return showNotification("info", title, message, options)
}

// ─── Progress Notification ───────────────────────────────────

function showProgress(title, options) {
  options = options || {}
  const id = showNotification("loading", title, options.message || "", {
    duration: 0,
    showProgress: false,
    actions: options.actions
  })

  return {
    id: id,
    update: function(message) {
      const notif = _notifications.find(function(n) { return n.id === id })
      if (notif && notif.element) {
        const body = notif.element.querySelector("div:nth-child(2)")
        if (body) body.textContent = message
      }
    },
    complete: function(successMsg) {
      dismissNotification(id)
      if (successMsg) {
        notifySuccess("Complete", successMsg)
      }
    },
    fail: function(errorMsg) {
      dismissNotification(id)
      if (errorMsg) {
        notifyError("Failed", errorMsg)
      }
    }
  }
}

// ─── Get History ─────────────────────────────────────────────

function getNotificationHistory() {
  return _history.slice()
}

function clearHistory() {
  _history.length = 0
}

// ─── Configure ───────────────────────────────────────────────

function configureNotifications(options) {
  if (options.maxVisible !== undefined) {
    NotificationConfig.maxVisible = options.maxVisible
  }
  if (options.defaultDuration !== undefined) {
    NotificationConfig.defaultDuration = options.defaultDuration
  }
  if (options.position !== undefined) {
    NotificationConfig.position = options.position
    // Rebuild container
    const container = document.getElementById(_containerId)
    if (container) {
      container.style.cssText = [
        "position:fixed",
        _getPositionStyles(),
        "z-index:" + NotificationConfig.zIndex,
        "display:flex",
        "flex-direction:column",
        "gap:" + NotificationConfig.gap + "px",
        "pointer-events:none",
        "max-width:380px",
        "width:100%"
      ].join(";")
    }
  }
}

// ─── Expose Globally ─────────────────────────────────────────

globalThis.NotificationSystem = {
  show: showNotification,
  dismiss: dismissNotification,
  dismissAll: dismissAll,
  success: notifySuccess,
  error: notifyError,
  warning: notifyWarning,
  info: notifyInfo,
  progress: showProgress,
  history: getNotificationHistory,
  clearHistory: clearHistory,
  configure: configureNotifications
}
