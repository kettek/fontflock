import path from 'path'
import fs, { watch } from 'fs'
import * as unreson from 'unreson'
import yaml from 'yaml'
import EventEmitter from 'events'

import chokidar from 'chokidar'
import hexoid from 'hexoid'
const generateID = hexoid()

/**
 * Workspace represents a configuration-file backed storage for library information, collections, and beyond.
 */
class Workspace extends EventEmitter {
  constructor(wsPath, o) {
    super()
    this._wsPath = wsPath
    this._wsDir = path.dirname(wsPath)
    this._libraryWatchers = {}
    let data = {
      ...this.defaults,
      ...o,
    }
    this._data = new unreson.StateObject(data)
    this._data.on('change', e => {
      this.startPendingSave()
    })
  }
  async load() {
    // Load our settings from disk.
    let data = {
      ...this.defaults,
      ...yaml.parse(fs.readFileSync(this._wsPath, { encoding: 'utf-8'})),
    }

    this._data.state = data
    this._data.clear()

    // Now let's load up our libraries.
    for (let library of this.libraries) {
      await this.loadLibrary(library.id)
    }

    this.emit('loaded')
  }
  get defaults() {
      return {
          libraries: [],
          collections: [],
      }
  }
  /**
   * data returns the underlying unreson state Proxy.
   */
  get data() {
    return this._data.state
  }
  /**
   * Saves the config to disk.
   * @param {Boolean} force force saving of file, ignoring the pending save system.
   */
  async save(force) {
    if (force) {
      await fs.promises.mkdir(this._wsDir, { recursive: true, mode: 0o755 })
      await fs.promises.writeFile(this._wsPath, yaml.stringify(this._data._state))
      if (this._pendingSave) clearTimeout(this._pendingSave)
      this.emit('saved')
    } else {
      this.startPendingSave()
    }
  }
  /**
   * Starts a pending save operation that will issue save(true)
   */
  startPendingSave() {
    if (this._pendingSave) {
      clearTimeout(this._pendingSave)
    }
    this._pendingSave = setTimeout(() => {
      this._pendingSave = null
      this.save(true)
    }, 5000)
  }
  get libraries() {
    return this._data.state.libraries
  }
  get collections() {
    return this._data.state.collections
  }
  get title() {
    return this._data.state.title
  }
  /**
   * 
   */
  createCollection(name) {
  }
  /**
   * 
   */
  async createLibrary(o) {
    let library = {
      ...{
        title: 'My Library',
        folder: '',
        searchDepth: 0,
        hierarchyDepth: 0,
        id: generateID(),
      },
      ...o,
    }

    this.libraries.push(library)
    this.emit('library-create', library.id)
    this.loadLibrary(library.id)
  }
  async loadLibrary(id) {
    let library = this.libraries.find(l=>l.id===id)
    if (!library) {
      // TODO: Error
      return
    }
    const watcher = chokidar.watch(`${library.folder}/**/*.{ttf,otf,woff,woff2}`, {
      depth: library.searchDepth,
    })
    watcher.on('add', p => {
      console.log(`add ${p}`)
      //this._libraryCollections[library.id].push(p)
      this.emit('library-change')
    })
    watcher.on('change', p => {
      console.log(`change ${p}`)
      this.emit('library-change')
    })
    watcher.on('unlink', p => {
      console.log(`unlink ${p}`)
      //this._libraryCollections = this._libraryCollections.filter(t=>p!==t)
      this.emit('library-change')
    })
    watcher.on('ready', _ => {
      // Probably best spot.
      this.emit('library-load', library.id)
    })
    this._libraryWatchers[library.id] = watcher
  }
  async unloadLibrary(id) {
    let library = this.libraries.find(l=>l.id===id)
    if (!library) {
      // TODO: Error
      return
    }
    if (this._libraryWatchers[library.id]) {
      await this._libraryWatchers[library.id].close()
      this.emit('library-unload', library.id)
    }
  }
  async deleteLibrary(id) {
    let index = this.libraries.findIndex(l=>l.id===id)
    if (index >= 0) {
      await this.unloadLibrary(id)
      this.libraries.splice(index, 1)
      this.emit('library-delete')
    }
  }
}

export default Workspace
