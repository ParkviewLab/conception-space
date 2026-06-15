// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
import { app, BrowserWindow, ipcMain, dialog, Menu, protocol, net, shell } from 'electron'
import { join, dirname, resolve, extname } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import pkg from '../../package.json'

const isDev = !app.isPackaged

// Must be called before app is ready.
// Registers cs-file:// as a secure scheme so Chromium lets iframes load it.
protocol.registerSchemesAsPrivileged([{
  scheme:     'cs-file',
  privileges: { secure: true, supportFetchAPI: true, stream: true },
}])

let _currentFilePath = null   // last successfully opened file path

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    backgroundColor: '#090916',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
    },
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (isDev && devUrl) {
    win.loadURL(devUrl)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

let _aboutWin = null
function openAboutWindow() {
  if (_aboutWin && !_aboutWin.isDestroyed()) { _aboutWin.focus(); return }
  const html = `<!doctype html>
<meta charset="utf-8">
<style>
  html,body{margin:0;height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    background:#0b0b16;color:#e9e9f2;-webkit-user-select:none;cursor:default}
  .wrap{height:100%;box-sizing:border-box;padding:30px 34px;display:flex;flex-direction:column;
    align-items:center;justify-content:center;text-align:center}
  h1{margin:0;font-size:21px;font-weight:600;letter-spacing:.2px}
  .ver{margin:3px 0 18px;font-size:12px;color:#9494ac}
  p{margin:0 0 6px;font-size:13px;line-height:1.55;color:#d2d2e2;max-width:30em}
  .copy{margin:20px 0 12px;font-size:11px;color:#85859c;line-height:1.5}
  a{color:#7aa2ff;text-decoration:none;font-size:12px}
  a:hover{text-decoration:underline}
</style>
<div class="wrap">
  <h1>conception-space</h1>
  <div class="ver">Version ${pkg.version}</div>
  <p>Organize your knowledge in space.</p>
  <p>Build navigable places. Shape visible relationships. Discover emergent patterns.</p>
  <div class="copy">© 2026 Gary Frattarola — AGPL-3.0-or-later, or commercial</div>
  <a href="https://parkviewlab.ai" target="_blank" rel="noopener">parkviewlab.ai</a>
</div>`
  _aboutWin = new BrowserWindow({
    width: 460, height: 340,
    resizable: false, minimizable: false, maximizable: false, fullscreenable: false,
    backgroundColor: '#0b0b16',
    title: 'About conception-space',
    webPreferences: { contextIsolation: true, sandbox: true },
  })
  _aboutWin.setMenuBarVisibility(false)
  _aboutWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  // Open the parkviewlab.ai link in the user's real browser, never in-app.
  _aboutWin.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  _aboutWin.webContents.on('will-navigate', (e, url) => { e.preventDefault(); shell.openExternal(url) })
  _aboutWin.on('closed', () => { _aboutWin = null })
}

function buildMenu(win) {
  const fileMenu = {
    label: 'File',
    submenu: [
      { label: 'Open…',        accelerator: 'CmdOrCtrl+O', click: () => openFile(win) },
      { label: 'Reload File',  accelerator: 'CmdOrCtrl+R', click: () => reloadFile(win) },
      { type: 'separator' },
      process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' },
    ],
  }
  // Custom view menu: omit Reload/ForceReload (CmdOrCtrl+R is our file reload)
  const viewMenu = {
    label: 'View',
    submenu: [
      { label: 'Save Bookmark…',  accelerator: 'CmdOrCtrl+B',
        click: () => win.webContents.send('menu:save-bookmark') },
      { label: 'Go To Bookmark…', accelerator: 'CmdOrCtrl+J',
        click: () => win.webContents.send('menu:open-bookmarks') },
      { type: 'separator' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  }
  const template = [
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [
        { label: `About ${app.name}`, click: () => openAboutWindow() },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    fileMenu,
    { role: 'editMenu' },   // gives macOS cut/copy/paste/select-all routing
    viewMenu,
    { role: 'windowMenu' },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function openFile(win) {
  const { filePaths, canceled } = await dialog.showOpenDialog(win, {
    filters: [{ name: 'conception-space', extensions: ['cns', 'cs'] }],
    properties: ['openFile'],
  })
  if (canceled || !filePaths[0]) return
  _currentFilePath = filePaths[0]
  sendFile(win, _currentFilePath)
}

function reloadFile(win) {
  if (!_currentFilePath) return
  sendFile(win, _currentFilePath)
}

function sendFile(win, filePath) {
  try {
    const source = readFileSync(filePath, 'utf-8')
    win.setTitle(`${filePath.split('/').pop()} — conception-space`)
    win.webContents.send('file-loaded', { path: filePath, source })
  } catch (err) {
    console.error('[reload-file]', err.message)
  }
}

app.whenReady().then(() => {
  // cs-file:///<abs-path> → file:///<abs-path>
  // Streams straight from disk — no IPC, no base64, no memory copies.
  protocol.handle('cs-file', (req) => net.fetch(req.url.replace(/^cs-file:/, 'file:')))

  const win = createWindow()

  // Safety net: prevent the window from ever navigating away from the app.
  // Any external URL that slips through (e.g. a clicked link in an iframe) is
  // opened in the system browser instead.
  win.webContents.on('will-navigate', (e, url) => {
    const appUrl = isDev
      ? process.env['ELECTRON_RENDERER_URL']
      : `file://${join(__dirname, '../renderer/index.html')}`
    if (appUrl && !url.startsWith(appUrl)) {
      e.preventDefault()
      shell.openExternal(url)
    }
  })

  buildMenu(win)
  ipcMain.handle('open-file',      () => openFile(win))
  ipcMain.on('reload-file',        () => reloadFile(win))
  ipcMain.on('load-file',          (_e, filePath) => { _currentFilePath = filePath; sendFile(win, filePath) })
  ipcMain.handle('read-node-file', (_e, relPath) => {
    if (!_currentFilePath) return { error: 'no file loaded' }
    const abs = resolve(dirname(_currentFilePath), relPath)
    const ext = extname(abs).toLowerCase()
    try {
      if (ext === '.pdf') return { type: 'pdf', abs }
      return { type: 'md', content: readFileSync(abs, 'utf-8') }
    } catch (err) { return { error: err.message } }
  })
  ipcMain.handle('write-node-file', (_e, relPath, content) => {
    if (!_currentFilePath) return { error: 'no file loaded' }
    const abs = resolve(dirname(_currentFilePath), relPath)
    try { writeFileSync(abs, content, 'utf-8'); return { ok: true } }
    catch (err) { return { error: err.message } }
  })

  // Sidecar I/O. From foo.cns the sidecar is foo.<suffix>.json5 — v1 uses
  // suffix "views" for bookmarks; future kinds (annotations, colors, …) reuse
  // these same handlers with a different suffix string.
  const _sidecarPath = (suffix) =>
    _currentFilePath.replace(/\.(cns|cs)$/i, `.${suffix}.json5`)

  ipcMain.handle('read-sidecar', (_e, suffix) => {
    if (!_currentFilePath) return { error: 'no file loaded' }
    try { return { content: readFileSync(_sidecarPath(suffix), 'utf-8') } }
    catch (err) {
      if (err.code === 'ENOENT') return { content: null }   // no sidecar yet
      return { error: err.message }
    }
  })
  ipcMain.handle('write-sidecar', (_e, suffix, content) => {
    if (!_currentFilePath) return { error: 'no file loaded' }
    try { writeFileSync(_sidecarPath(suffix), content, 'utf-8'); return { ok: true } }
    catch (err) { return { error: err.message } }
  })
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
