/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           Cache Manager — AI Code Visualizer                ║
 * ║  Smart LRU cache with TTL, size limits, and statistics      ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Node.js / browser utility for caching analysis results.
 * Supports LRU eviction, TTL expiry, max size limits,
 * hit/miss stats, and JSON serialization/deserialization.
 */

"use strict"

// ─── Cache Entry ─────────────────────────────────────────────

function CacheEntry(key, value, options) {
  options = options || {}
  this.key = key
  this.value = value
  this.createdAt = Date.now()
  this.accessedAt = Date.now()
  this.accessCount = 0
  this.ttl = options.ttl || 0
  this.size = options.size || _estimateSize(value)
  this.metadata = options.metadata || {}
}

CacheEntry.prototype.isExpired = function() {
  if (this.ttl <= 0) return false
  return (Date.now() - this.createdAt) > this.ttl
}

CacheEntry.prototype.touch = function() {
  this.accessedAt = Date.now()
  this.accessCount++
}

// ─── Estimate Object Size ────────────────────────────────────

function _estimateSize(value) {
  if (value === null || value === undefined) return 0
  if (typeof value === "string") return value.length * 2
  if (typeof value === "number") return 8
  if (typeof value === "boolean") return 4

  try {
    return JSON.stringify(value).length * 2
  } catch (e) {
    return 1024  // Default estimate
  }
}

// ─── LRU Cache ───────────────────────────────────────────────

function LRUCache(options) {
  options = options || {}
  this._maxEntries = options.maxEntries || 100
  this._maxSize = options.maxSize || 50 * 1024 * 1024  // 50MB default
  this._defaultTTL = options.defaultTTL || 3600000       // 1 hour default
  this._currentSize = 0
  this._store = new Map()
  this._order = []  // LRU order: oldest first
  this._stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    sets: 0,
    deletes: 0,
    expirations: 0,
    createdAt: Date.now()
  }
  this._onEvict = options.onEvict || null
}

// ─── Get ─────────────────────────────────────────────────────

LRUCache.prototype.get = function(key) {
  var entry = this._store.get(key)

  if (!entry) {
    this._stats.misses++
    return undefined
  }

  // Check TTL
  if (entry.isExpired()) {
    this.delete(key)
    this._stats.expirations++
    this._stats.misses++
    return undefined
  }

  // Touch and move to end (most recently used)
  entry.touch()
  this._moveToEnd(key)
  this._stats.hits++

  return entry.value
}

// ─── Set ─────────────────────────────────────────────────────

LRUCache.prototype.set = function(key, value, options) {
  options = options || {}
  var ttl = options.ttl || this._defaultTTL

  // If key exists, update it
  if (this._store.has(key)) {
    var existing = this._store.get(key)
    this._currentSize -= existing.size
    this._store.delete(key)
    this._removeFromOrder(key)
  }

  var entry = new CacheEntry(key, value, {
    ttl: ttl,
    size: options.size,
    metadata: options.metadata
  })

  // Evict if needed
  while (this._store.size >= this._maxEntries || this._currentSize + entry.size > this._maxSize) {
    if (this._order.length === 0) break
    this._evictOldest()
  }

  this._store.set(key, entry)
  this._order.push(key)
  this._currentSize += entry.size
  this._stats.sets++

  return entry
}

// ─── Has ─────────────────────────────────────────────────────

LRUCache.prototype.has = function(key) {
  var entry = this._store.get(key)
  if (!entry) return false
  if (entry.isExpired()) {
    this.delete(key)
    return false
  }
  return true
}

// ─── Delete ──────────────────────────────────────────────────

LRUCache.prototype.delete = function(key) {
  var entry = this._store.get(key)
  if (!entry) return false

  this._store.delete(key)
  this._removeFromOrder(key)
  this._currentSize -= entry.size
  this._stats.deletes++

  return true
}

// ─── Clear ───────────────────────────────────────────────────

LRUCache.prototype.clear = function() {
  this._store.clear()
  this._order = []
  this._currentSize = 0
}

// ─── LRU Helpers ─────────────────────────────────────────────

LRUCache.prototype._moveToEnd = function(key) {
  this._removeFromOrder(key)
  this._order.push(key)
}

LRUCache.prototype._removeFromOrder = function(key) {
  var idx = this._order.indexOf(key)
  if (idx !== -1) {
    this._order.splice(idx, 1)
  }
}

LRUCache.prototype._evictOldest = function() {
  if (this._order.length === 0) return

  var key = this._order[0]
  var entry = this._store.get(key)

  if (this._onEvict && entry) {
    this._onEvict(key, entry.value)
  }

  this.delete(key)
  this._stats.evictions++
}

// ─── Cleanup Expired ─────────────────────────────────────────

LRUCache.prototype.cleanup = function() {
  var self = this
  var expired = []

  this._store.forEach(function(entry, key) {
    if (entry.isExpired()) {
      expired.push(key)
    }
  })

  expired.forEach(function(key) {
    self.delete(key)
    self._stats.expirations++
  })

  return expired.length
}

// ─── Get Stats ───────────────────────────────────────────────

LRUCache.prototype.getStats = function() {
  var total = this._stats.hits + this._stats.misses
  return {
    entries: this._store.size,
    maxEntries: this._maxEntries,
    currentSize: this._currentSize,
    maxSize: this._maxSize,
    currentSizeMB: Math.round(this._currentSize / 1048576 * 100) / 100,
    maxSizeMB: Math.round(this._maxSize / 1048576 * 100) / 100,
    hits: this._stats.hits,
    misses: this._stats.misses,
    hitRate: total > 0 ? Math.round(this._stats.hits / total * 10000) / 100 : 0,
    evictions: this._stats.evictions,
    expirations: this._stats.expirations,
    sets: this._stats.sets,
    deletes: this._stats.deletes,
    uptime: Date.now() - this._stats.createdAt
  }
}

// ─── Serialize / Deserialize ─────────────────────────────────

LRUCache.prototype.serialize = function() {
  var data = {
    version: 1,
    timestamp: Date.now(),
    entries: []
  }

  var self = this
  this._order.forEach(function(key) {
    var entry = self._store.get(key)
    if (entry && !entry.isExpired()) {
      data.entries.push({
        key: entry.key,
        value: entry.value,
        createdAt: entry.createdAt,
        ttl: entry.ttl,
        metadata: entry.metadata
      })
    }
  })

  return JSON.stringify(data)
}

LRUCache.prototype.deserialize = function(json) {
  try {
    var data = typeof json === "string" ? JSON.parse(json) : json
    if (!data || data.version !== 1 || !Array.isArray(data.entries)) return false

    this.clear()

    var self = this
    data.entries.forEach(function(item) {
      // Adjust TTL based on elapsed time
      var elapsed = Date.now() - item.createdAt
      var remainingTTL = item.ttl > 0 ? Math.max(item.ttl - elapsed, 0) : 0

      if (item.ttl <= 0 || remainingTTL > 0) {
        self.set(item.key, item.value, {
          ttl: remainingTTL > 0 ? remainingTTL : item.ttl,
          metadata: item.metadata
        })
      }
    })

    return true
  } catch (e) {
    console.error("Cache deserialize error:", e)
    return false
  }
}

// ─── Get All Keys ────────────────────────────────────────────

LRUCache.prototype.keys = function() {
  return this._order.slice()
}

// ─── Get All Values ──────────────────────────────────────────

LRUCache.prototype.values = function() {
  var self = this
  return this._order.map(function(key) {
    var entry = self._store.get(key)
    return entry ? entry.value : undefined
  }).filter(function(v) { return v !== undefined })
}

// ─── Get Entries with Metadata ───────────────────────────────

LRUCache.prototype.entries = function() {
  var self = this
  return this._order.map(function(key) {
    var entry = self._store.get(key)
    if (!entry || entry.isExpired()) return null
    return {
      key: entry.key,
      value: entry.value,
      createdAt: entry.createdAt,
      accessedAt: entry.accessedAt,
      accessCount: entry.accessCount,
      size: entry.size,
      metadata: entry.metadata,
      isExpired: entry.isExpired()
    }
  }).filter(function(e) { return e !== null })
}

// ─── Size Property ───────────────────────────────────────────

Object.defineProperty(LRUCache.prototype, "size", {
  get: function() { return this._store.size }
})

// ─── Factory ─────────────────────────────────────────────────

function createCache(options) {
  return new LRUCache(options)
}

// ─── Exports ─────────────────────────────────────────────────

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    LRUCache: LRUCache,
    createCache: createCache,
    CacheEntry: CacheEntry
  }
}

if (typeof globalThis !== "undefined") {
  globalThis.CacheManager = {
    LRUCache: LRUCache,
    createCache: createCache,
    CacheEntry: CacheEntry
  }
}
