//const EventEmitter = require('events')
//const { emit } = require('process')
import path from 'path'
import chokidar from 'chokidar'
import * as fontManager from '../../build/fontmanager.node'
import EventEmitter from 'events'
import { FontFamily, FontFamilyEntry } from 'models/Fonts'

class SystemFonts extends EventEmitter {
  constructor() {
    super()
    this._fontStores = {}
  }
  get fontStores() {
    return this._fontStores
  }
  load() {
    this.emit('loading')
    return new Promise((resolve, reject) => {
      fontManager.getAvailableFonts(fonts => {
        // TODO: What we want to do is actually use chokidar to watch all the font path dirnames.
        let fontStores = {}
        for (const c of fonts) {
          // Gather root paths.
          var fontRootStore = path.dirname(c.path)
          if (!fontStores[fontRootStore]) {
            fontStores[fontRootStore] = {}
          }
          // Gather families.
          if (!fontStores[fontRootStore][c.family]) {
            fontStores[fontRootStore][c.family] = new FontFamily(c.family)
          }
          fontStores[fontRootStore][c.family].addEntry(c)
        }
        this._fontStores = fontStores
        this.emit('loaded')
        resolve(fontStores)
      })
    })
  }
}

export default new SystemFonts()
