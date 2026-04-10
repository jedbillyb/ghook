const pendingEvents = new Map();

/**
 * Buffers an event to allow for batching or suppression.
 * @param {string} key Unique key for the event (e.g. repo:branch or repo:tag)
 * @param {object} payload The initial payload
 * @param {function} callback Function to call when buffer expires
 * @param {number} delay Delay in ms (default 5000)
 * @param {function} merge Optional function to merge new payload into existing
 */
function bufferEvent(key, payload, callback, delay = 5000, merge = null) {
  if (pendingEvents.has(key)) {
    const existing = pendingEvents.get(key);
    clearTimeout(existing.timeout);
    
    if (merge && typeof merge === 'function') {
      merge(existing.payload, payload);
    }
    
    existing.timeout = setTimeout(() => {
      pendingEvents.delete(key);
      callback(existing.payload);
    }, delay);
  } else {
    const timeout = setTimeout(() => {
      pendingEvents.delete(key);
      callback(payload);
    }, delay);
    pendingEvents.set(key, { payload, timeout });
  }
}

/**
 * Suppresses a buffered event if it hasn't fired yet.
 * @param {string} key Unique key for the event
 * @returns {boolean} True if an event was suppressed
 */
function suppressEvent(key) {
  if (pendingEvents.has(key)) {
    const existing = pendingEvents.get(key);
    clearTimeout(existing.timeout);
    pendingEvents.delete(key);
    console.log(`🔇 Suppressed event for key: ${key}`);
    return true;
  }
  return false;
}

module.exports = { bufferEvent, suppressEvent };
