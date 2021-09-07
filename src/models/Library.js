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
    this._loaded = false
  }
  async destroy() {
    // Close watcher
    await this._watcher.close()
  }
  get folder() {
    return this._data.folder
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
  get loaded() {
    return this._loaded
  }
  getFamilyID(index) {
    let f = this.files[index]
    if (!f) {
      return ""
    }
    return `${this.id}__${f.path}`
  }
  getFontFaceCSS(index) {
    let f = this.files[index]
    if (!f) {
      return ""
    }
    return `url("${this.folder.replace(/\\/g, '/')+'/'+f.path}") format("${f.format}")`
  }
  getCSS(index) {
    let f = this.files[index]
    if (!f) {
      return ""
    }
    return `@font-face {
  font-family: "${this.getFamilyID(index)}";
  src: url("${this.folder.replace(/\\/g, '/')+'/'+f.path}") format("${f.format}");
}`
  }
  async load() {
    this.emit('loading')
    const watcher = chokidar.watch(`**/*.{ttf,otf,woff,woff2}`, {
      cwd: this._data.folder,
      depth: this._data.searchDepth,
      ignored: p => {
        if (this._data.ignoreHidden && /(^[.#]|(?:__|~)$)/.test(path.basename(p))) {
          return true
        }
        // Filter out any directores that we should always ignore.
        if (p.includes('__MACOSX')) {
          return true
        }
        return false
      },
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
      this._loaded = true
      this.emit('load', this._data.id)
    })
    this._watcher = watcher
  }
}

class LibraryFile {
  constructor(f) {
    this._path = f
    this._format = ''
    this._title = ''
    let ext = path.extname(f.toLowerCase())
    if (ext === '.ttf') {
      this._format = 'truetype'
    } else if (ext === '.otf') {
      this._format = 'opentype'
    } else if (ext === '.woff') {
      this._format = 'woff'
    } else if (ext === 'woff2') {
      this._format = 'woff2'
    }
    this._title = path.basename(f)
    this._title = this._title.slice(0, this._title.length-ext.length)
  }
  get title() {
    return this._title
  }
  get path() {
    return this._path
  }
  get format() {
    return this._format
  }
}

export default Library