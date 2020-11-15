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
    this._families = []
  }
  get families() {
    return this._families
  }
  load() {
    this.emit('loading')
    fontManager.getAvailableFonts(fonts => {
      // TODO: What we want to do is actually use chokidar to watch all the font path dirnames.
      let fontPaths = []
      let fontFamilies = {}
      for (const c of fonts) {
        // Gather root paths.
        var fontRootPath = path.dirname(c.path)
        if (!fontPaths.includes(fontRootPath)) {
          fontPaths.push(fontRootPath)
        }
        // Gather families.
        if (!fontFamilies[c.family]) {
          fontFamilies[c.family] = new FontFamily(c.family)
        }
        fontFamilies[c.family].addEntry(c)
      }
      this._families = fontFamilies
      this.emit('loaded')
    })
  }
}

export default new SystemFonts()
