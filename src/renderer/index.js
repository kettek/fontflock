const template = require('views/Main.marko')
const _Config = require('models/_Config.js')

template.renderSync().appendTo(document.body);

const remoteWindow = require('electron').remote.getCurrentWindow()

remoteWindow.setPosition(_Config.settings.win.x, _Config.settings.win.y)
remoteWindow.setSize(_Config.settings.win.width, _Config.settings.win.height)
remoteWindow.setFullScreen(_Config.settings.win.fullscreen)

if (_Config.settings.win.maximized === true) {
  remoteWindow.maximize()
}

remoteWindow.on('move', onMove = e => {
  if (remoteWindow.isMaximized() || remoteWindow.isFullScreen()) return
  let [x, y] = e.sender.getPosition()
  _Config.settings.win.x = x
  _Config.settings.win.y = y
})

remoteWindow.on('resize', onResize = e => {
  if (remoteWindow.isMaximized() || remoteWindow.isFullScreen()) return
  let [w, h] = e.sender.getSize()
  _Config.settings.win.width = w
  _Config.settings.win.height = h
})

remoteWindow.on('restore', onRestore = e => {
})
remoteWindow.on('maximize', onMaximize = e => {
  _Config.settings.win.maximized = true
})
remoteWindow.on('unmaximize', onUnmaximize = e => {
  _Config.settings.win.maximized = false
})
remoteWindow.on('enter-full-screen', onEnterFullScreen = e => {
  _Config.settings.win.fullscreen = true
})
remoteWindow.on('leave-full-screen', onLeaveFullScreen = e => {
  _Config.settings.win.fullscreen = false
})
remoteWindow.on('enter-html-full-screen', onEnterHTMLFullScreen = e => {
  _Config.settings.win.fullscreen = true
})
remoteWindow.on('leave-html-full-screen', onLeaveHTMLFullScreen = e => {
  _Config.settings.win.fullscreen = false
})

window.addEventListener('beforeunload', () => {
  remoteWindow.off('move', onMove)
  remoteWindow.off('resize', onResize)
  remoteWindow.off('restore', onRestore)
  remoteWindow.off('maximize', onMaximize)
  remoteWindow.off('unmaximize', onUnmaximize)
  remoteWindow.off('enter-full-screen', onEnterFullScreen)
  remoteWindow.off('leave-full-screen', onLeaveFullScreen)
  remoteWindow.off('enter-html-full-screen', onEnterHTMLFullScreen)
  remoteWindow.off('leave-html-full-screen', onLeaveHTMLFullScreen)
})