// Native boundary double: no Electron application or user backend is started.
const { EventEmitter } = require("node:events")
const { mkdtempSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const windows = new Map()
class Contents extends EventEmitter {
  constructor() {
    super()
    this.mainFrame = {}
    this.id = 1
  }
  isDestroyed() {
    return false
  }
  getURL() {
    return "oc://renderer/"
  }
  getZoomFactor() {
    return 1
  }
  async capturePage() {
    return { isEmpty: () => false, toJPEG: () => Buffer.from([1, 2, 3]) }
  }
  send(channel, event) {
    this.emit("sent", channel, structuredClone(event))
  }
}
class Window extends EventEmitter {
  constructor(id = 1) {
    super()
    this.id = id
    this.webContents = new Contents()
    this.contentView = { addChildView() {}, removeChildView() {} }
    windows.set(id, this)
  }
  static fromId(id) {
    return windows.get(id)
  }
  static fromWebContents(contents) {
    return [...windows.values()].find((window) => window.webContents === contents)
  }
  isDestroyed() {
    return false
  }
  getContentSize() {
    return [1280, 900]
  }
  getBounds() {
    return { x: 0, y: 0, width: 1280, height: 900 }
  }
}
const handlers = new Map()
const ipcMain = new EventEmitter()
ipcMain.handle = (name, handler) => handlers.set(name, handler)
const app = new EventEmitter()
const directory = mkdtempSync(path.join(tmpdir(), "opencode-native-plugin-test-"))
Object.assign(app, {
  getPath: () => directory,
  getVersion: () => "2.2.1",
  isPackaged: false,
  getName: () => "test",
  relaunch() {},
  quit() {},
})
class Menu {
  constructor(items = []) {
    this.items = items
  }
  static buildFromTemplate(items) {
    return new Menu(items.map((item) => ({ ...item, submenu: new Menu() })))
  }
  static setApplicationMenu() {}
  insert(i, item) {
    this.items.splice(i, 0, item)
  }
}
class View extends EventEmitter {
  constructor() {
    super()
    this.webContents = new Contents()
    this.visible = false
  }
  setVisible(value) {
    this.visible = value
  }
  getVisible() {
    return this.visible
  }
  setBounds(bounds) {
    this.bounds = bounds
  }
  setBackgroundBlur() {}
  setImage() {}
}
const electron = {
  app,
  ipcMain,
  BrowserWindow: Window,
  Menu,
  MenuItem: class {
    constructor(options) {
      Object.assign(this, options)
    }
  },
  ImageView: View,
  WebContentsView: View,
  nativeImage: { createFromBuffer: () => ({}) },
  screen: Object.assign(new EventEmitter(), { getDisplayMatching: () => ({ scaleFactor: 1 }) }),
  powerSaveBlocker: { start: () => 1, stop() {} },
  dialog: {},
}
electron.__test = {
  directory,
  handlers,
  request(window, raw) {
    return handlers.get("opencode-front:plugin-request")(
      { sender: window.webContents, senderFrame: window.webContents.mainFrame },
      raw,
    )
  },
}
module.exports = electron
