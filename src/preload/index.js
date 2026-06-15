// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
import { contextBridge, ipcRenderer, shell } from 'electron'

contextBridge.exposeInMainWorld('cs', {
  openFile:     ()     => ipcRenderer.invoke('open-file'),
  reloadFile:   ()     => ipcRenderer.send('reload-file'),
  loadFile:     (path) => ipcRenderer.send('load-file', path),
  readNodeFile: (path) => ipcRenderer.invoke('read-node-file', path),
  onFileLoaded: (cb)   => ipcRenderer.on('file-loaded', (_e, data) => cb(data)),
  openExternal:  (url)           => shell.openExternal(url),
  writeNodeFile: (path, content) => ipcRenderer.invoke('write-node-file', path, content),

  // Sidecar I/O — `suffix` selects the kind ("views" today; annotations etc. later)
  readSidecar:   (suffix)          => ipcRenderer.invoke('read-sidecar', suffix),
  writeSidecar:  (suffix, content) => ipcRenderer.invoke('write-sidecar', suffix, content),

  // Menu → renderer notifications for bookmark commands
  onMenuSaveBookmark:  (cb) => ipcRenderer.on('menu:save-bookmark',  () => cb()),
  onMenuOpenBookmarks: (cb) => ipcRenderer.on('menu:open-bookmarks', () => cb()),
})
