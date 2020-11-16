import path from 'path'
import fs from 'fs'
import * as unreson from 'unreson'
import yaml from 'yaml'

/**
 * Workspace represents a configuration-file backed storage for library information, collections, and beyond.
 */
class Workspace {
  constructor(wsPath, o) {
    this._wsPath = wsPath
    this._wsDir = path.dirname(wsPath)
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
}

export default Workspace
