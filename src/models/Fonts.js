
class FontFamily {
  constructor(o) {
    this._family   = o
    this._entries  = [] // any entires that have a different italics, weight, or style(?)
  }
  addEntry(o) {
    this._entries.push(new FontFamilyEntry(o))
  }
  get entries() {
    return this._entries
  }
  nearest({weight=400, italic=false, monospace=false}={}) {
    return [this._entries[0], 0]
  }
}

class FontFamilyEntry {
  constructor(o) {
    this._weight     = o.weight
    this._italic     = o.italic
    this._monospace  = o.monospace
    this._style      = o.style
    this._path       = o.path
  }
  get weight() {
    return this._weight
  }
  get italic() {
    return this._italic
  }
  get monospace() {
    return this._monospace
  }
  get style() {
    return this._style
  }
  get path() {
    return this._path
  }
}

export { FontFamily, FontFamilyEntry }