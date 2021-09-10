import electron from 'electron'
import EventEmitter from 'events'
import path from 'path'

/**
 * FontErrorWatcher watches for font decode errors and emits a FontError object.
 * 
 * Internally it watches for electron's `console-message` events and presumes font decode reason messages to immediately follow a font decode failure message. These are combined into a single FontError and emitted via an event.
 */
class FontErrorWatcher extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(Infinity)
    let wc = electron.remote.getCurrentWebContents()
    let awaitingPair = false
    let fontPath = ''
    wc.on('console-message', (event, level, message, line, sourceId) => {
      if (level === 2) {
        if (awaitingPair) {
            awaitingPair = false
            /**
             * font-error event.
             * 
             * @event FontErrorWatcher#font-error
             * @type {FontError}
             */
            this.emit('font-error', new FontError(fontPath, message))
        } else {
          if (message.startsWith("Failed to decode downloaded font: ")) {
            awaitingPair = true
            fontPath = path.normalize(decodeURIComponent(message.slice("Failed to decode downloaded font: file:///".length)))
          }
        }
      }
    })
  }
}

/**
 * FontError is an Error class for returning a specific FontFace's decode failure.
 */
class FontError extends Error {
  constructor(path, message) {
    super(message)
    this._path = path
  }
  /**
   * Returns the font's file path.
   * @return {String} The full file path to the failed font.
   */
  get path() {
    return this._path
  }
}

export default new FontErrorWatcher()
