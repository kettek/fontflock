import EventEmitter from 'events'

class FontLoader extends EventEmitter {
  constructor() {
    super()
    this._fontFaces = {}
  }
  load(fontFamily, fontSource) {
    if (this._fontFaces[fontFamily]) {
      return this._fontFaces[fontFamily]
    }
    let target = new FontFace(fontFamily, fontSource, {})
    this._fontFaces[fontFamily] = target
    ;(async () => {
      try {
        let result = await target.load()
        document.fonts.add(result)
      } catch(err) {
        console.dir(err)
      }
      this.emit('font-load', target)
    })()
    return target
  }
}

export default new FontLoader()