'use strict'

const electron      = require('electron')
const ipc           = electron.ipcMain
const app           = electron.app
const BrowserWindow = electron.BrowserWindow
const path  = require('path')
const os    = require('os')
const formatUrl = require('url').format

const isDevelopment = (process.env.NODE_ENV || 'development') === 'development'
const liveReload = !process.env.NO_LIVE_RELOAD

app.allowRendererProcessReuse = false // For native modules, should be fixed.

if (liveReload) {
  try {
    require('electron-reload')(__dirname, {
      electron: path.resolve(__dirname, '..', 'node_modules', '.bin', 'electron'+(process.platform=='win32'?'.cmd':''))
    })
  } catch(e) {
    console.log(e)
  }
}

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow
let status = 0

function createMainWindow() {
  const window = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
    frame: false,
  })
  window.removeMenu()

  if (isDevelopment) {
    window.webContents.openDevTools()
  }

  window.loadURL(formatUrl({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file',
    slashes: true
  }))

  window.on('close', e => {
    if (status == 0) {
      e.preventDefault()
      window.webContents.send('app-close')
    }
  })

  window.on('closed', () => {
    mainWindow = null
  })

  // Clear all listeners on reload.
  window.on('reload', () => {
    window.removeAllListeners('move')
    window.removeAllListeners('resize')
    window.removeAllListeners('restore')
    window.removeAllListeners('maximize')
    window.removeAllListeners('unmaximize')
    window.removeAllListeners('enter-full-screen')
    window.removeAllListeners('leave-full-screen')
    window.removeAllListeners('enter-html-full-screen')
    window.removeAllListeners('leave-html-full-screen')
  })

  window.webContents.on('devtools-opened', () => {
    window.focus()
    setImmediate(() => {
      window.focus()
    })
  })

  return window
}

// quit application when all windows are closed
app.on('window-all-closed', () => {
  // on macOS it is common for applications to stay open until the user explicitly quits
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // on macOS it is common to re-create a window even after all windows have been closed
  if (mainWindow === null) {
    mainWindow = createMainWindow()
  }
})

// create main BrowserWindow when electron is ready
app.on('ready', () => {
  mainWindow = createMainWindow()
})

ipc.on('closed', _ => {
  status = 1
  app.quit()
})

// disable hardware acceleration on arm platforms for performance
if (os.arch().substring(0,3) === 'arm') {
  app.disableHardwareAcceleration()
}
