const path        = require('path')
const fs          = require('fs')
const fsPromises  = require('fs').promises
const unreson     = require('unreson')
const yaml        = require('yaml')

// Get our locations.
const appData         = process.env.APPDATA || (process.platform == 'darwin' ? path.join(process.env.HOME, 'Library/Preferences') : path.join(process.env.HOME, "/.local/share"))
const userData        = path.join(appData, 'fontflock')
const settingsPath    = path.join(userData, 'settings.yml')

/**
 * Config is a standalone configuration system that supports automatic saving. This is intended for app configuration and not for workspaces.
 */
class Config {
  constructor() {
    // Load our settings from disk.
    let settings = {}
    try {
      settings = yaml.parse(fs.readFileSync(settingsPath, { encoding: 'utf-8'}))
    } catch (e) {
      settings = {}
    }

    // Convert it to an unreson StateObject.
    this._settings = new unreson.StateObject(settings)
    // Cause unreson object changes to start a pending save.
    this._settings.on('change', e => {
      this.startPendingSave()
    })
  }
  load(defaults) {
    // Convert it to an unreson StateObject.
    this._settings.state = Object.assign(defaults, this._settings._state)
  }
  /**
   * settings returns the underlying unreson state Proxy.
   */
  get settings() {
    return this._settings.state
  }
  /**
   * Saves the config to disk.
   * @param {Boolean} force force saving of file, ignoring the pending save system.
   */
  async save(force) {
    if (force) {
      try {
        await fsPromises.mkdir(userData, { recursive: true, mode: 0o755 })
        await fsPromises.writeFile(settingsPath, yaml.stringify(this._settings._state))
      } catch(e) {
        console.log(e)
      }
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
    }, 1000)
  }
}

module.exports = new Config()