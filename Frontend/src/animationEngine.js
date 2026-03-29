/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║               Animation Engine — AI Code Visualizer         ║
 * ║  CSS animation utilities, transitions, particle effects     ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Provides reusable animation primitives for the webview UI:
 *   • fadeIn / fadeOut / slideIn / slideOut / scaleIn
 *   • staggered list animations
 *   • particle burst effect for loading states
 *   • morphing transitions between diagram states
 *   • spring-physics easing functions
 */

console.log("Animation Engine Loaded")

var _animationsEnabled = true

function toggleAnimations() {
  _animationsEnabled = !_animationsEnabled
  if (globalThis.AccessibilityManager) {
    globalThis.AccessibilityManager.announce("Animations " + (_animationsEnabled ? "Enabled" : "Disabled"))
  }
}

// ─── Easing Functions ────────────────────────────────────────

const Easings = {
  linear(t) { return t },
  easeInQuad(t) { return t * t },
  easeOutQuad(t) { return t * (2 - t) },
  easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t },
  easeInCubic(t) { return t * t * t },
  easeOutCubic(t) { return (--t) * t * t + 1 },
  easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
  },
  easeOutElastic(t) {
    const p = 0.3
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1
  },
  easeOutBounce(t) {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375
    }
  },
  spring(t) {
    return 1 - Math.cos(t * 4.5 * Math.PI) * Math.exp(-t * 6)
  }
}

// ─── Core Animate Function ───────────────────────────────────

function animate(options) {
  const {
    duration = 400,
    easing = "easeOutCubic",
    onUpdate,
    onComplete
  } = options

  if (!_animationsEnabled) {
    if (onUpdate) onUpdate(1, 1)
    if (onComplete) onComplete()
    return { cancel() {} }
  }

  const easingFn = Easings[easing] || Easings.easeOutCubic
  const startTime = performance.now()
  let animationId = null

  function tick(now) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const value = easingFn(progress)

    if (onUpdate) {
      onUpdate(value, progress)
    }

    if (progress < 1) {
      animationId = requestAnimationFrame(tick)
    } else {
      if (onComplete) {
        onComplete()
      }
    }
  }

  animationId = requestAnimationFrame(tick)

  // Return cancel handle
  return {
    cancel() {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }
}

// ─── Element Transitions ─────────────────────────────────────

function fadeIn(element, duration = 300) {
  if (!element) return
  element.style.opacity = "0"
  element.style.display = ""
  return animate({
    duration,
    easing: "easeOutQuad",
    onUpdate(value) {
      element.style.opacity = String(value)
    },
    onComplete() {
      element.style.opacity = "1"
    }
  })
}

function fadeOut(element, duration = 300) {
  if (!element) return
  return animate({
    duration,
    easing: "easeOutQuad",
    onUpdate(value) {
      element.style.opacity = String(1 - value)
    },
    onComplete() {
      element.style.opacity = "0"
      element.style.display = "none"
    }
  })
}

function slideIn(element, direction = "left", distance = 30, duration = 400) {
  if (!element) return
  const axis = (direction === "left" || direction === "right") ? "X" : "Y"
  const sign = (direction === "left" || direction === "up") ? -1 : 1

  element.style.opacity = "0"
  element.style.transform = `translate${axis}(${sign * distance}px)`
  element.style.display = ""

  return animate({
    duration,
    easing: "easeOutCubic",
    onUpdate(value) {
      const offset = (1 - value) * sign * distance
      element.style.transform = `translate${axis}(${offset}px)`
      element.style.opacity = String(value)
    },
    onComplete() {
      element.style.transform = "none"
      element.style.opacity = "1"
    }
  })
}

function slideOut(element, direction = "left", distance = 30, duration = 400) {
  if (!element) return
  const axis = (direction === "left" || direction === "right") ? "X" : "Y"
  const sign = (direction === "left" || direction === "up") ? -1 : 1

  return animate({
    duration,
    easing: "easeInQuad",
    onUpdate(value) {
      const offset = value * sign * distance
      element.style.transform = `translate${axis}(${offset}px)`
      element.style.opacity = String(1 - value)
    },
    onComplete() {
      element.style.display = "none"
      element.style.transform = "none"
    }
  })
}

function scaleIn(element, duration = 350) {
  if (!element) return
  element.style.opacity = "0"
  element.style.transform = "scale(0.8)"
  element.style.display = ""

  return animate({
    duration,
    easing: "easeOutElastic",
    onUpdate(value) {
      const scale = 0.8 + value * 0.2
      element.style.transform = `scale(${scale})`
      element.style.opacity = String(Math.min(value * 2, 1))
    },
    onComplete() {
      element.style.transform = "scale(1)"
      element.style.opacity = "1"
    }
  })
}

// ─── Staggered List Animation ────────────────────────────────

function staggerIn(elements, options = {}) {
  const {
    delay = 50,
    duration = 400,
    easing = "easeOutCubic",
    direction = "up"
  } = options

  const items = Array.from(elements)
  const handles = []

  items.forEach(function(el, index) {
    el.style.opacity = "0"
    el.style.transform = direction === "up"
      ? "translateY(15px)"
      : "translateX(-15px)"

    const timeoutId = setTimeout(function() {
      const handle = animate({
        duration,
        easing,
        onUpdate(value) {
          const offset = (1 - value) * 15
          el.style.transform = direction === "up"
            ? "translateY(" + offset + "px)"
            : "translateX(" + (-offset) + "px)"
          el.style.opacity = String(value)
        },
        onComplete() {
          el.style.transform = "none"
          el.style.opacity = "1"
        }
      })
      handles.push(handle)
    }, index * delay)

    handles.push({ cancel() { clearTimeout(timeoutId) } })
  })

  return {
    cancel() {
      handles.forEach(function(h) { h.cancel() })
    }
  }
}

// ─── Particle Burst Effect ───────────────────────────────────

function createParticleBurst(container, options = {}) {
  const {
    count = 20,
    colors = ["#89b4fa", "#a6e3a1", "#f9e2af", "#f38ba8", "#cba6f7"],
    duration = 1200,
    spread = 120
  } = options

  if (!container) return

  const rect = container.getBoundingClientRect()
  const centerX = rect.width / 2
  const centerY = rect.height / 2

  const particles = []

  for (let i = 0; i < count; i++) {
    const particle = document.createElement("div")
    const size = Math.random() * 6 + 2
    const color = colors[Math.floor(Math.random() * colors.length)]
    const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5
    const velocity = Math.random() * spread + spread * 0.3

    particle.style.cssText = [
      "position:absolute",
      "width:" + size + "px",
      "height:" + size + "px",
      "background:" + color,
      "border-radius:50%",
      "pointer-events:none",
      "left:" + centerX + "px",
      "top:" + centerY + "px",
      "z-index:9999"
    ].join(";")

    container.style.position = "relative"
    container.appendChild(particle)

    particles.push({
      el: particle,
      angle: angle,
      velocity: velocity,
      size: size
    })
  }

  animate({
    duration: duration,
    easing: "easeOutCubic",
    onUpdate(value) {
      particles.forEach(function(p) {
        const dist = value * p.velocity
        const x = centerX + Math.cos(p.angle) * dist
        const y = centerY + Math.sin(p.angle) * dist
        const scale = 1 - value * 0.8
        const opacity = 1 - value

        p.el.style.left = x + "px"
        p.el.style.top = y + "px"
        p.el.style.transform = "scale(" + scale + ")"
        p.el.style.opacity = String(opacity)
      })
    },
    onComplete() {
      particles.forEach(function(p) {
        if (p.el.parentNode) {
          p.el.parentNode.removeChild(p.el)
        }
      })
    }
  })
}

// ─── Diagram Morph Transition ────────────────────────────────

function morphTransition(containerA, containerB, duration = 600) {
  if (!containerA || !containerB) return

  containerB.style.opacity = "0"
  containerB.style.display = ""

  return animate({
    duration: duration,
    easing: "easeInOutCubic",
    onUpdate(value) {
      containerA.style.opacity = String(1 - value)
      containerA.style.transform = "scale(" + (1 - value * 0.05) + ")"

      containerB.style.opacity = String(value)
      containerB.style.transform = "scale(" + (0.95 + value * 0.05) + ")"
    },
    onComplete() {
      containerA.style.display = "none"
      containerA.style.transform = "none"
      containerB.style.transform = "none"
      containerB.style.opacity = "1"
    }
  })
}

// ─── Pulse Glow Effect ───────────────────────────────────────

function pulseGlow(element, options = {}) {
  const {
    color = "#89b4fa",
    intensity = 20,
    duration = 1500,
    repeat = 3
  } = options

  if (!element) return

  let count = 0

  function doPulse() {
    if (count >= repeat) {
      element.style.boxShadow = "none"
      return
    }
    count++
    animate({
      duration: duration / 2,
      easing: "easeInOutQuad",
      onUpdate(value) {
        const blur = value * intensity
        element.style.boxShadow = "0 0 " + blur + "px " + color
      },
      onComplete() {
        animate({
          duration: duration / 2,
          easing: "easeInOutQuad",
          onUpdate(value) {
            const blur = (1 - value) * intensity
            element.style.boxShadow = "0 0 " + blur + "px " + color
          },
          onComplete: doPulse
        })
      }
    })
  }

  doPulse()
}

// ─── Typewriter Text Effect ──────────────────────────────────

function typewriter(element, text, options = {}) {
  const {
    speed = 30,
    cursor = true,
    onComplete
  } = options

  if (!element) return

  element.textContent = ""
  let index = 0
  let cursorEl = null

  if (cursor) {
    cursorEl = document.createElement("span")
    cursorEl.textContent = "▋"
    cursorEl.style.cssText = "animation:blink 0.7s step-end infinite;color:var(--accent,#89b4fa)"
    element.appendChild(cursorEl)
  }

  // Inject blink keyframe if not present
  if (cursor && !document.getElementById("typewriter-blink-style")) {
    const style = document.createElement("style")
    style.id = "typewriter-blink-style"
    style.textContent = "@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}"
    document.head.appendChild(style)
  }

  const intervalId = setInterval(function() {
    if (index < text.length) {
      if (cursorEl) {
        element.insertBefore(
          document.createTextNode(text[index]),
          cursorEl
        )
      } else {
        element.textContent += text[index]
      }
      index++
    } else {
      clearInterval(intervalId)
      if (cursorEl && cursorEl.parentNode) {
        setTimeout(function() {
          cursorEl.parentNode.removeChild(cursorEl)
        }, 1500)
      }
      if (onComplete) onComplete()
    }
  }, speed)

  return {
    cancel() {
      clearInterval(intervalId)
      if (cursorEl && cursorEl.parentNode) {
        cursorEl.parentNode.removeChild(cursorEl)
      }
    }
  }
}

// ─── Shake Effect ────────────────────────────────────────────

function shake(element, intensity = 5, duration = 500) {
  if (!element) return
  const original = element.style.transform || ""

  return animate({
    duration: duration,
    easing: "linear",
    onUpdate(value) {
      const decay = 1 - value
      const x = (Math.random() - 0.5) * 2 * intensity * decay
      const y = (Math.random() - 0.5) * 2 * intensity * decay
      element.style.transform = "translate(" + x + "px," + y + "px)"
    },
    onComplete() {
      element.style.transform = original
    }
  })
}

// ─── Expose Globally ─────────────────────────────────────────

globalThis.AnimationEngine = {
  toggle: toggleAnimations,
  Easings: Easings,
  animate: animate,
  fadeIn: fadeIn,
  fadeOut: fadeOut,
  slideIn: slideIn,
  slideOut: slideOut,
  scaleIn: scaleIn,
  staggerIn: staggerIn,
  createParticleBurst: createParticleBurst,
  morphTransition: morphTransition,
  pulseGlow: pulseGlow,
  typewriter: typewriter,
  shake: shake
}
