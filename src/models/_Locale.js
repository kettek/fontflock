import EventEmitter from 'events'
import i18next from 'i18next'
import Backend from 'i18next-fs-backend'
import yaml from 'yaml'

class Locale extends EventEmitter {
  constructor() {
    super()
    i18next
      .use(Backend)
      .init({
        fallbackLng: 'en',
        debug: true,
        backend: {
          addPath: 'build/locales/{{lng}}/{{ns}}.missing.yaml',
          loadPath: 'build/locales/{{lng}}/{{ns}}.yaml',
          parse: function(data) { return yaml.parse(data) },
        }
      })
      .then(t => {
        this.emit('ready', t)
      })
  }
  translate(k) {
    return i18next.t(k)
  }
  t(k) { return i18next.t(k) }
}

export default new Locale()