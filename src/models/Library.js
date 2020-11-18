import EventEmitter from 'events'
import chokidar from 'chokidar'
import path from 'path'

/**
 * Library is a class instance of a POD Workspace library entry. It is used to manage the watched state of the library's folder.
 */
class Library extends EventEmitter {
  constructor(l) {
    super()
    this._data = l
    this._files = []
    this._watcher = null
  }
  async destroy() {
    // Close watcher
    await this._watcher.close()
  }
  get id() {
    return this._data.id
  }
  get title() {
    return this._data.title
  }
  get files() {
    return this._files
  }
  getFamilyID(index) {
    return `${this.id}__${index}`
  }
  getCSS(index) {
    let f = this.files[index]
    if (!f) {
      return ""
    }
    return `@font-face {
  font-family: "${this.getFamilyID(index)}";
  src: url("${f.path}");
}`
  }
  async load() {
    let ignoredCheck = null
    if (this._data.ignoreHidden) {
      ignoredCheck = p => {
        return /(^[.#]|(?:__|~)$)/.test(path.basename(p))
      }
    }
    const watcher = chokidar.watch(`${this._data.folder}/**/*.{ttf,otf,woff,woff2}`, {
      depth: this._data.searchDepth,
      ignored: ignoredCheck,
    })
    watcher.on('add', p => {
      this._files.push(new LibraryFile(p.replace(/\\/g, '/')))
      this.emit('change')
    })
    watcher.on('change', p => {
      this.emit('change')
    })
    watcher.on('unlink', p => {
      p = p.replace(/\\/g, '/')
      let i = this._files.findIndex(t=>t===p)
      if (i >= 0) {
        this._files.splice(i, 1)
        this.emit('change')
      }
    })
    watcher.on('ready', _ => {
      // Probably best spot.
      this.emit('load', this._data.id)
    })
    this._watcher = watcher
  }
}

class LibraryFile {
  constructor(f) {
    this._path = f
    this._type = ''
    this._title = ''
    let ext = path.extname(f.toLowerCase())
    if (ext === 'ttf') {
      this._type = 'truetype'
    } else if (ext === 'otf') {
      this._type = 'opentype'
    } else if (ext === 'woff') {
      this._type = 'woff'
    } else if (ext === 'woff2') {
      this._type = 'woff2'
    }
    this._title = path.basename(f)
  }
  get title() {
    return this._title
  }
  get path() {
    return this._path
  }
  get type() {
    return this._type
  }
}

export default Library