//const EventEmitter = require('events')
//const { emit } = require('process')
import * as fontManager from '../../build/fontmanager.node'
import EventEmitter from 'events'

class SystemFonts extends EventEmitter {
  constructor() {
    super()
    this._fonts = []
  }
  get fonts() {
    return this._fonts
  }
  load() {
    this.emit('loading')
    fontManager.getAvailableFonts(fonts => {
      this._fonts = fonts
      this.emit('loaded')
    })
  }
}

export default new SystemFonts()
