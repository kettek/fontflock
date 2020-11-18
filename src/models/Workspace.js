import path, { normalize } from 'path'
import fs, { watch } from 'fs'
import * as unreson from 'unreson'
import yaml from 'yaml'
import EventEmitter from 'events'

import Library from 'models/Library'

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
    this._libraries = []      // Libraries are our instances of our underlying workspace library POD.
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
    // Ensure libraries match our desired.
    for (let i = 0; i < data.libraries.length; i++) {
      data.libraries[i] = this.normalizeLibrary(data.libraries[i])
    }

    this._data.state = data
    this._data.clear()

    // Now let's create our our libraries POD -> Library data.
    for (let library of this.librariesData) {
      await this.initializeLibrary(library)
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
    return this._libraries
  }
  get librariesData() {
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
  normalizeLibrary(pod) {
    return {
      ...{
        title: 'My Library',
        folder: '',
        searchDepth: 0,
        hierarchyDepth: 0,
        ignoreHidden: true,
        id: generateID(),
      },
      ...pod
    }
  }
  /**
   * 
   */
  async createLibrary(o) {
    let library = this.normalizeLibrary(o)

    this.librariesData.push(library)
    await this.initializeLibrary(library)
    this.emit('library-create', library.id)
  }
  async initializeLibrary(l) {
    let lib = new Library(l)
    this._libraries.push(lib)
    this.setupLibraryHooks(lib)
    lib.load() // Guess we don't need to wait
  }
  async destroyLibrary(id) {
    let index = this._libraries.findIndex(l=>l.id===id)
    if (index >= 0) {
      this.cleanLibraryHooks(this._libraries[index])
      await this._libraries[index].destroy()
      this._libraries.splice(index, 1)
    }
  }
  setupLibraryHooks(lib) {
    for (const event of ['loading', 'load', 'change']) {
      lib.on(event, (e) => {
        this.emit(`library-${event}`, e)
      })
    }
  }
  cleanLibraryHooks(lib) {
    for (const event of ['loading', 'load', 'change']) {
      lib.removeAllListeners(event)
    }
  }
  async deleteLibrary(id) {
    let index = this.librariesData.findIndex(l=>l.id===id)
    if (index >= 0) {
      await this.destroyLibrary(id)
      this.librariesData.splice(index, 1)
      this.emit('library-delete')
    }
  }
}

export default Workspace
