// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
import { parseCS }                                    from './parser.js'
import { initScene, buildScene, setGridBrightness, setFogDensity, setLabelsVisible, setGroupSolid,
         setCommonalitiesVisible, updateCommonalities,
         scene, camera, renderer, labelRenderer, ambientLight,
         nodeMeshes }                                  from './scene.js'
import { initControls, deselect, getState,
         updateControls, cancelClickTween }            from './controls.js'
import * as bookmarks                                  from './bookmarks.js'
import { CameraPath }                                  from './camera_path.js'
import { CameraPreAim }                                from './pre_aim.js'
import { marked }      from 'marked'
import markedKatex     from 'marked-katex-extension'
import 'katex/dist/katex.min.css'
import { basicSetup, EditorView } from 'codemirror'
import { EditorState }            from '@codemirror/state'
import { markdown }               from '@codemirror/lang-markdown'
import { oneDark }                from '@codemirror/theme-one-dark'

marked.use(markedKatex({ throwOnError: false }))

// ── DOM refs ──────────────────────────────────────────────────────────────────
const viewport          = document.getElementById('viewport')
const emptyState        = document.getElementById('empty-state')
const modeLabel         = document.getElementById('mode-label')
const keyHints          = document.getElementById('key-hints')
const groupToggle       = document.getElementById('group-toggle')
const fileNameEl        = document.getElementById('file-name')
const btnOpen           = document.getElementById('btn-open')
const gridBrightness    = document.getElementById('grid-brightness')
const fogDensity        = document.getElementById('fog-density')
const labelsToggle        = document.getElementById('labels-toggle')
const commonalitiesToggle = document.getElementById('commonalities-toggle')
const filePanel           = document.getElementById('file-panel')
const filePanelCard       = document.getElementById('file-panel-card')
const filePanelTitle      = document.getElementById('file-panel-title')
const filePanelContent    = document.getElementById('file-panel-content')
const filePanelBody       = document.getElementById('file-panel-body')
const filePanelClose      = document.getElementById('file-panel-close')
const filePanelBackdrop   = document.getElementById('file-panel-backdrop')
const filePanelEditorPane = document.getElementById('file-panel-editor-pane')
const filePanelSplitter   = document.getElementById('file-panel-splitter')
const filePanelEditToggle = document.getElementById('file-panel-edit-toggle')

const bookmarkSave          = document.getElementById('bookmark-save')
const bookmarkSaveInput     = document.getElementById('bookmark-save-input')
const bookmarkSaveOk        = document.getElementById('bookmark-save-ok')
const bookmarkSaveCancel    = document.getElementById('bookmark-save-cancel')
const bookmarkPicker        = document.getElementById('bookmark-picker')
const bookmarkPickerList    = document.getElementById('bookmark-picker-list')
const bookmarkPickerEmpty   = document.getElementById('bookmark-picker-empty')
const bookmarkPickerClose   = document.getElementById('bookmark-picker-close')

// ── Current file tracking (for Cmd/Ctrl+R reload) ────────────────────────────
let _currentFilePath = null   // Electron: absolute path on disk
let _currentFetchUrl = null   // Browser dev: fetch URL

// ── Group render toggle ────────────────────────────────────────────────────────
const groupSolidMap = new Map()   // groupId → boolean

groupToggle.addEventListener('click', () => {
  const { groupId, groupLabel } = groupToggle.dataset
  if (!groupId) return
  const solid = !groupSolidMap.get(groupId)
  groupSolidMap.set(groupId, solid)
  setGroupSolid(groupId, solid)
  _applyGroupToggleLabel(groupId, groupLabel, solid)
  saveSession()
})

function _applyGroupToggleLabel(groupId, groupLabel, solid) {
  groupToggle.dataset.groupId    = groupId
  groupToggle.dataset.groupLabel = groupLabel
  groupToggle.textContent = solid ? `${groupLabel} · solid` : `${groupLabel} · wireframe`
  groupToggle.classList.toggle('solid', solid)
}

// ── Boot ──────────────────────────────────────────────────────────────────────
initScene(viewport)

// File panel + bookmark overlay Escape handlers — registered BEFORE initControls
// so that stopImmediatePropagation() prevents the controls Escape (deselect)
// from firing while a modal is open.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return
  if (!bookmarkSave.classList.contains('hidden')) {
    closeBookmarkSaveOverlay()
    e.stopImmediatePropagation()
    return
  }
  if (!bookmarkPicker.classList.contains('hidden')) {
    closeBookmarkPickerOverlay()
    e.stopImmediatePropagation()
    return
  }
  if (!filePanel.classList.contains('hidden')) {
    closeNodeFile()
    e.stopImmediatePropagation()
  }
})

let orbit   // captured from initControls — needed for camera save/restore
;({ orbit } = initControls({
  camera,
  renderer,
  scene,
  nodeMeshes,
  onModeChange:      updateHUD,
  onNodeDoubleClick: openNodeFile,
}))

// Save camera state whenever the user stops orbiting/panning/zooming
orbit.addEventListener('end', saveSession)

// ── Render loop ───────────────────────────────────────────────────────────────
// `_pendingPreAim` and `_pendingPath` are declared up here (not down in the
// Bookmarks section) so the render loop can reference them without tripping
// the temporal dead zone — the loop runs on the very first frame, before
// later module code initializes.  A bookmark transition runs them in
// sequence: pre-aim first (pivot to look at the destination), then path
// (fly there).  See gotoBookmark for the chaining.
let _pendingPreAim = null
let _pendingPath   = null
let _lastFrameTime = performance.now()
;(function loop() {
  requestAnimationFrame(loop)
  const now = performance.now()
  const dt  = (now - _lastFrameTime) / 1000
  _lastFrameTime = now
  updateControls(dt)
  if (_pendingPreAim) _pendingPreAim.tick(dt)
  if (_pendingPath)   _pendingPath.tick(dt)
  updateCommonalities(dt)
  renderer.render(scene, camera)
  labelRenderer.render(scene, camera)
})()

// ── Session persistence (per-file map in localStorage) ───────────────────────
//
// Old (v0.x): single key 'cs.session' with one file's state.
// New (v0.5+): single key 'cs.sessions' with a map keyed by file path so
// reopening a previous file restores *its* camera/fog/labels/solidGroups
// instead of whatever the most recently closed file had.
//
// Schema:
//   { lastOpened: '/abs/path/foo.cns',
//     files: { '/abs/path/foo.cns': { camera, fogDensity, gridBrightness,
//                                     ambientIntensity, labelsVisible,
//                                     commonalitiesVisible,
//                                     solidGroups: ['id', …] } } }

const SESSIONS_KEY  = 'cs.sessions'
const OLD_KEY       = 'cs.session'
let _pendingCamera  = null   // camera state queued for the next loadSource call

function _loadSessions() {
  try {
    const data = JSON.parse(localStorage.getItem(SESSIONS_KEY))
    if (data && typeof data === 'object') {
      data.files = data.files ?? {}
      return data
    }
  } catch {}
  return { lastOpened: null, files: {} }
}
function _saveSessions(s) {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(s)) } catch {}
}

// One-time fold of the old single-key shape into the new per-file map.
function _migrateOldSession() {
  const raw = localStorage.getItem(OLD_KEY)
  if (!raw) return
  try {
    const old = JSON.parse(raw)
    if (old?.filePath) {
      const sessions = _loadSessions()
      sessions.files[old.filePath] = {
        camera:        old.camera,
        fogDensity:    old.fogDensity,
        labelsVisible: old.labelsVisible,
        // old `solidState` was [[id, bool], …]; new shape stores just the truthy ids
        solidGroups:   (old.solidState ?? []).filter(([,v]) => v).map(([id]) => id),
      }
      sessions.lastOpened = old.filePath
      _saveSessions(sessions)
    }
  } catch {}
  localStorage.removeItem(OLD_KEY)
}

// Snapshot of every adjustable parameter that defines "the current view."
// Used by both per-file session persistence and the bookmark feature.
function captureCurrentView() {
  return {
    camera: {
      px: camera.position.x, py: camera.position.y, pz: camera.position.z,
      tx: orbit.target.x,    ty: orbit.target.y,    tz: orbit.target.z,
    },
    fogDensity:           parseFloat(fogDensity.value),
    gridBrightness:       parseFloat(gridBrightness.value),
    ambientIntensity:     ambientLight.intensity,
    labelsVisible:        _labelsVisible,
    commonalitiesVisible: _commonalitiesVisible,
    solidGroups:          [...groupSolidMap.entries()].filter(([,v]) => v).map(([id]) => id),
  }
}

function saveSession() {
  const key = _currentFilePath ?? _currentFetchUrl
  if (!key) return
  const sessions = _loadSessions()
  sessions.files[key] = captureCurrentView()
  sessions.lastOpened = key
  _saveSessions(sessions)
}

// Apply a file's saved view state. Called before loadSource rebuilds the
// scene so groupSolidMap / _pendingCamera / fog / etc. are in place by the
// time loadSource walks them.
function applyFileState(path) {
  const state = _loadSessions().files[path]
  groupSolidMap.clear()
  _pendingCamera = null
  if (!state) return                                       // first visit — defaults
  for (const id of state.solidGroups ?? [])  groupSolidMap.set(id, true)
  if (state.fogDensity != null) {
    fogDensity.value = state.fogDensity
    setFogDensity(state.fogDensity)
  }
  if (state.gridBrightness != null) {
    gridBrightness.value = state.gridBrightness
    setGridBrightness(state.gridBrightness)
  }
  if (state.ambientIntensity != null) {
    ambientLight.intensity = state.ambientIntensity
  }
  if (state.labelsVisible !== undefined) {
    _labelsVisible = !!state.labelsVisible
    setLabelsVisible(_labelsVisible)
    labelsToggle.classList.toggle('active', _labelsVisible)
  }
  if (state.commonalitiesVisible !== undefined) {
    _commonalitiesVisible = !!state.commonalitiesVisible
    setCommonalitiesVisible(_commonalitiesVisible)
    commonalitiesToggle.classList.toggle('active', _commonalitiesVisible)
  }
  if (state.camera) _pendingCamera = state.camera
}

function restoreSession() {
  _migrateOldSession()
  const sessions = _loadSessions()
  const lastOpened = sessions.lastOpened

  if (window.cs) {
    if (lastOpened) {
      applyFileState(lastOpened)
      _currentFilePath = lastOpened
      window.cs.loadFile(lastOpened)
    }
    // else: wait for user to open a file
  } else {
    // Browser dev: always load solar.cns; per-file state applies if present.
    btnOpen.style.display = 'none'
    _currentFetchUrl = '/examples/solar.cns'
    applyFileState(_currentFetchUrl)
    fetch(_currentFetchUrl)
      .then(r => r.text())
      .then(src => loadSource(src, 'solar.cns'))
      .catch(() => console.warn('dev shim: could not load solar.cns'))
  }
}

// ── File loading ──────────────────────────────────────────────────────────────
function loadSource(source, name) {
  const { nodes, edges, groups, commonalities, errors } = parseCS(source)
  if (errors.length) console.warn('[parser]', errors.join('\n'))
  deselect()
  buildScene({ nodes, edges, groups, commonalities })

  // Retain solid state for groups that survived the reload; drop removed ones
  const newGroupIds = new Set(groups.map(g => g.id))
  for (const id of [...groupSolidMap.keys()])
    if (!newGroupIds.has(id)) groupSolidMap.delete(id)
  for (const [id, solid] of groupSolidMap)
    if (solid) setGroupSolid(id, true)

  // Restore camera if a pending state was queued (e.g. after session restore)
  if (_pendingCamera) {
    const c = _pendingCamera
    camera.position.set(c.px, c.py, c.pz)
    orbit.target.set(c.tx, c.ty, c.tz)
    orbit.update()
    _pendingCamera = null
  }

  emptyState.classList.add('hidden')
  fileNameEl.textContent = name
  updateHUD(getState())
  saveSession()

  // Bookmark sidecar is per-file — reload it whenever the loaded file changes.
  bookmarks.loadBookmarks().catch(e => console.warn('[bookmarks] load failed:', e))
}

function reloadCurrent() {
  if (window.cs && _currentFilePath) {
    window.cs.reloadFile()
  } else if (_currentFetchUrl) {
    fetch(_currentFetchUrl)
      .then(r => r.text())
      .then(src => loadSource(src, _currentFetchUrl.split('/').pop()))
      .catch(err => console.warn('[reload]', err))
  }
}

document.addEventListener('keydown', (e) => {
  if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return

  if (e.key === 'r') {
    e.preventDefault()
    reloadCurrent()
    return
  }
  if (e.key === 's') {
    if (_isEditMode && _editorView) {
      e.preventDefault()
      clearTimeout(_saveTimeout)
      _saveFile(_editorView.state.doc.toString())
    }
    return
  }

  // Bookmark hotkeys — skip while typing in an input / CodeMirror.
  // (In Electron, Cmd+B / Cmd+J trip the menu accelerator first and this
  // keydown never fires; the handler below covers browser-dev mode too.)
  const ae = document.activeElement
  const inInput = ae && (
    ['INPUT', 'TEXTAREA'].includes(ae.tagName) ||
    ae.isContentEditable
  )
  if (inInput) return

  if (e.key === 'b') {
    e.preventDefault()
    openBookmarkSaveOverlay()
    return
  }
  if (e.key === 'j') {
    e.preventDefault()
    openBookmarkPickerOverlay()
    return
  }
  if (/^[1-9]$/.test(e.key)) {
    const b = bookmarks.list()[parseInt(e.key, 10) - 1]
    if (b) {
      e.preventDefault()
      gotoBookmark(b.name)
    }
  }
})

// ── Node file viewer panel ────────────────────────────────────────────────────
let _editorView   = null   // CodeMirror instance
let _currentFile  = null   // relative path of the open node file (for save)
let _rawContent   = null   // original markdown source (preview is derived HTML)
let _isEditMode   = false
let _saveTimeout  = null

async function openNodeFile({ label, file }) {
  if (!file) return
  let result
  if (window.cs) {
    result = await window.cs.readNodeFile(file)
  } else {
    // Browser dev: fetch from public/examples/
    try {
      const r   = await fetch('/examples/' + file)
      if (!r.ok) throw new Error(r.statusText)
      const ext = file.split('.').pop().toLowerCase()
      result = ext === 'pdf'
        ? { type: 'pdf', src: r.url }
        : { type: 'md', content: await r.text() }
    } catch (e) { result = { error: e.message } }
  }

  if (result.error) { console.warn('[file-panel]', result.error); return }

  // Reset edit mode for each new file open
  _isEditMode = false
  _currentFile = file
  filePanelTitle.textContent = label

  if (result.type === 'pdf') {
    // PDFs are read-only — hide the edit toggle
    filePanelEditToggle.classList.add('hidden')
    _closeEditor()
    const src = result.abs ? `cs-file://${encodeURI(result.abs)}` : result.src
    filePanelBody.className = 'pdf-mode'
    filePanelBody.innerHTML = `<iframe src="${src}"></iframe>`
  } else {
    filePanelEditToggle.classList.remove('hidden')
    filePanelEditToggle.textContent = 'Edit'
    filePanelEditToggle.classList.remove('active')
    filePanelEditorPane.classList.remove('active')
    _closeEditor()
    _rawContent = result.content
    _renderPreview(result.content)
  }

  filePanel.classList.remove('hidden')
}

function _renderPreview(md) {
  filePanelBody.className = ''
  filePanelBody.innerHTML = marked.parse(md)
}

function _createEditor(content) {
  if (_editorView) { _editorView.destroy(); _editorView = null }
  _editorView = new EditorView({
    state: EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        markdown(),
        oneDark,
        EditorView.theme({ '&': { height: '100%' }, '.cm-scroller': { overflow: 'auto' } }),
        EditorView.updateListener.of((u) => {
          if (!u.docChanged) return
          const text = u.state.doc.toString()
          _rawContent = text
          _renderPreview(text)
          clearTimeout(_saveTimeout)
          _saveTimeout = setTimeout(() => _saveFile(text), 500)
        }),
      ],
    }),
    parent: filePanelEditorPane,
  })
}

function _closeEditor() {
  if (_editorView) { _editorView.destroy(); _editorView = null }
}

async function _saveFile(content) {
  if (!_currentFile || !window.cs) return
  const r = await window.cs.writeNodeFile(_currentFile, content)
  if (r?.error) console.warn('[save]', r.error)
}

function _applyEditMode() {
  filePanelCard.classList.toggle('edit-mode', _isEditMode)
  filePanelEditorPane.classList.toggle('active', _isEditMode)
  filePanelSplitter.classList.toggle('hidden', !_isEditMode)
  filePanelEditToggle.textContent = _isEditMode ? 'Preview' : 'Edit'
  filePanelEditToggle.classList.toggle('active', _isEditMode)
  if (_isEditMode && !_editorView) _createEditor(_rawContent ?? '')
}

filePanelEditToggle.addEventListener('click', () => {
  _isEditMode = !_isEditMode
  _applyEditMode()
})

// ── Splitter drag-to-resize ────────────────────────────────────────────────────
let _splitterStartX     = 0
let _splitterStartWidth = 0

filePanelSplitter.addEventListener('mousedown', (e) => {
  _splitterStartX     = e.clientX
  _splitterStartWidth = filePanelEditorPane.offsetWidth
  filePanelSplitter.classList.add('dragging')
  // Disable pointer events on iframe during drag (prevents event capture by iframe)
  filePanelBody.style.pointerEvents = 'none'
  document.addEventListener('mousemove', _onSplitterMove)
  document.addEventListener('mouseup',   _onSplitterUp, { once: true })
  e.preventDefault()
})

function _onSplitterMove(e) {
  const dx         = e.clientX - _splitterStartX
  const totalWidth = filePanelContent.offsetWidth
  const minPx      = 200
  const maxPx      = totalWidth - 200
  const newWidth   = Math.max(minPx, Math.min(maxPx, _splitterStartWidth + dx))
  filePanelEditorPane.style.width = newWidth + 'px'
}

function _onSplitterUp() {
  filePanelSplitter.classList.remove('dragging')
  filePanelBody.style.pointerEvents = ''
  document.removeEventListener('mousemove', _onSplitterMove)
}

function closeNodeFile() {
  clearTimeout(_saveTimeout)
  _closeEditor()
  _isEditMode = false; _currentFile = null; _rawContent = null
  filePanelCard.classList.remove('edit-mode')
  filePanelEditorPane.classList.remove('active')
  filePanelEditorPane.style.width = ''   // reset to CSS 50% for next open
  filePanelSplitter.classList.add('hidden')
  filePanelEditToggle.classList.remove('active')
  filePanelEditToggle.textContent = 'Edit'
  filePanel.classList.add('hidden')
  filePanelBody.innerHTML = ''
  filePanelBody.className = ''
}

filePanelClose.addEventListener('click',   closeNodeFile)
filePanelBackdrop.addEventListener('click', closeNodeFile)

// Intercept link clicks inside the rendered markdown — open externally instead
// of navigating the Electron window. Internal #anchors are left alone.
filePanelBody.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]')
  if (!a) return
  const href = a.getAttribute('href')
  if (href.startsWith('#')) return          // in-page anchor — let browser scroll
  e.preventDefault()
  if (window.cs) window.cs.openExternal(a.href)
  else            window.open(a.href, '_blank')
})

// ── Grid brightness ───────────────────────────────────────────────────────────
gridBrightness.addEventListener('input', () => setGridBrightness(parseFloat(gridBrightness.value)))

// ── Fog density ───────────────────────────────────────────────────────────────
fogDensity.addEventListener('input', () => {
  setFogDensity(parseFloat(fogDensity.value))
  saveSession()
})

// ── Labels toggle ─────────────────────────────────────────────────────────────
let _labelsVisible = true
labelsToggle.addEventListener('click', () => {
  _labelsVisible = !_labelsVisible
  setLabelsVisible(_labelsVisible)
  labelsToggle.classList.toggle('active', _labelsVisible)
  saveSession()
})

// ── Commonalities toggle ──────────────────────────────────────────────────────
let _commonalitiesVisible = true
commonalitiesToggle.addEventListener('click', () => {
  _commonalitiesVisible = !_commonalitiesVisible
  setCommonalitiesVisible(_commonalitiesVisible)
  commonalitiesToggle.classList.toggle('active', _commonalitiesVisible)
  saveSession()
})

// ── Bookmarks ─────────────────────────────────────────────────────────────────
// Save overlay
function openBookmarkSaveOverlay() {
  bookmarkSaveInput.value = ''
  bookmarkSave.classList.remove('hidden')
  // setTimeout(0) lets the browser commit the display change before focus
  setTimeout(() => bookmarkSaveInput.focus(), 0)
}
function closeBookmarkSaveOverlay() {
  bookmarkSave.classList.add('hidden')
}
async function commitBookmarkSave() {
  const name = bookmarkSaveInput.value.trim()
  if (!name) return
  if (bookmarks.has(name) &&
      !confirm(`Bookmark "${name}" already exists. Overwrite?`)) return
  await bookmarks.save(name, captureCurrentView())
  closeBookmarkSaveOverlay()
}
bookmarkSaveOk.addEventListener('click', commitBookmarkSave)
bookmarkSaveCancel.addEventListener('click', closeBookmarkSaveOverlay)
bookmarkSaveInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter')  { e.preventDefault(); commitBookmarkSave() }
  if (e.key === 'Escape') { e.preventDefault(); closeBookmarkSaveOverlay() }
})
bookmarkSave.querySelector('.overlay-backdrop')
  .addEventListener('click', closeBookmarkSaveOverlay)

// Picker overlay
function openBookmarkPickerOverlay() {
  _renderBookmarkPicker()
  bookmarkPicker.classList.remove('hidden')
}
function closeBookmarkPickerOverlay() {
  bookmarkPicker.classList.add('hidden')
}
function _renderBookmarkPicker() {
  const items = bookmarks.list()
  bookmarkPickerList.innerHTML = ''
  bookmarkPickerEmpty.classList.toggle('hidden', items.length > 0)
  items.forEach((b, i) => {
    const li        = document.createElement('li')
    const nameBtn   = document.createElement('button')
    nameBtn.className = 'bookmark-row-name'
    const shortcut  = (i < 9) ? `<span class="shortcut">⌘${i + 1}</span>` : ''
    nameBtn.innerHTML = `${_escapeHtml(b.name)}${shortcut}`
    nameBtn.addEventListener('click', () => {
      closeBookmarkPickerOverlay()
      gotoBookmark(b.name)
    })
    const delBtn    = document.createElement('button')
    delBtn.className = 'bookmark-row-del'
    delBtn.textContent = '×'
    delBtn.title = `Delete "${b.name}"`
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation()
      if (!confirm(`Delete bookmark "${b.name}"?`)) return
      await bookmarks.remove(b.name)
      _renderBookmarkPicker()
    })
    li.append(nameBtn, delBtn)
    bookmarkPickerList.append(li)
  })
}
bookmarkPickerClose.addEventListener('click', closeBookmarkPickerOverlay)
bookmarkPicker.querySelector('.overlay-backdrop')
  .addEventListener('click', closeBookmarkPickerOverlay)

function _escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ))
}

// Snap discrete state, then start a 2-second camera tween to the bookmark view.
function gotoBookmark(name) {
  const b = bookmarks.get(name)
  if (!b) return

  // 1. Snap discrete state BEFORE the camera moves
  if (b.fogDensity != null) {
    fogDensity.value = b.fogDensity
    setFogDensity(b.fogDensity)
  }
  if (b.gridBrightness != null) {
    gridBrightness.value = b.gridBrightness
    setGridBrightness(b.gridBrightness)
  }
  if (b.ambientIntensity != null) {
    ambientLight.intensity = b.ambientIntensity
  }
  if (b.labelsVisible !== undefined) {
    _labelsVisible = !!b.labelsVisible
    setLabelsVisible(_labelsVisible)
    labelsToggle.classList.toggle('active', _labelsVisible)
  }
  if (b.commonalitiesVisible !== undefined) {
    _commonalitiesVisible = !!b.commonalitiesVisible
    setCommonalitiesVisible(_commonalitiesVisible)
    commonalitiesToggle.classList.toggle('active', _commonalitiesVisible)
  }
  // Reconcile solid-group set: turn on those in bookmark, turn off others.
  // Missing IDs (group removed from .cns since bookmark was saved) just
  // silently fail to apply — setGroupSolid is a no-op for unknown IDs.
  const want   = new Set(b.solidGroups ?? [])
  const allIds = new Set([...groupSolidMap.keys(), ...want])
  for (const id of allIds) {
    const target  = want.has(id)
    const current = groupSolidMap.get(id) ?? false
    if (current !== target) {
      groupSolidMap.set(id, target)
      setGroupSolid(id, target)
    }
  }
  updateHUD(getState())

  // 2. Start the camera tween.  Two-phase: first pivot in place to look
  //    at the destination (CameraPreAim, 1.5 s), then fly there along
  //    the spline path (CameraPath, 3.5 s).  Total wall-clock = 5.0 s.
  //
  //    Chaining notes:
  //    • Both tween classes fire onComplete on cancel as well as natural
  //      completion (consistent API).  Without a guard, our pre-aim
  //      onComplete would chain into CameraPath even when the user
  //      cancelled mid-pivot.
  //    • We guard with an *identity check* (`_pendingPreAim === myPreAim`):
  //      cancel and new-bookmark both null out / replace the slot before
  //      calling cancel(), so the cancelled instance's onComplete sees
  //      the mismatch and bails.
  if (_pendingPreAim) { const t = _pendingPreAim; _pendingPreAim = null; t.cancel() }
  if (_pendingPath)   { const t = _pendingPath;   _pendingPath   = null; t.cancel() }
  cancelClickTween()    // v0.6.13: stop any in-flight click→target tween so it doesn't fight the bookmark
  const from = captureCurrentView().camera

  const myPreAim = new CameraPreAim({
    camera, orbit, from,
    aimAt: { x: b.camera.px, y: b.camera.py, z: b.camera.pz },
    duration: 1.5,
    onComplete: () => {
      if (_pendingPreAim !== myPreAim) return    // cancelled or superseded
      _pendingPreAim = null
      // Chain into the spline travel.  Re-capture the view so CameraPath's
      // `from` reflects the post-pivot orientation — its internal _d0
      // (fromTarget − fromPos) will then be the chord direction, so the
      // start blend has zero rotational workload at launch.
      const fromAimed = captureCurrentView().camera
      const myPath = new CameraPath({
        camera, orbit,
        from: fromAimed, to: b.camera,
        duration: 3.5,
        onComplete: () => {
          if (_pendingPath !== myPath) return    // cancelled or superseded
          _pendingPath = null
          saveSession()
        },
      })
      _pendingPath = myPath
    },
  })
  _pendingPreAim = myPreAim

  // Cancel the active tween (pre-aim or path) if the user grabs orbit
  // controls mid-glide.  One-shot listener attached in capture phase so
  // it fires before OrbitControls processes the same pointerdown for
  // orbit start.  Null out the slot BEFORE calling cancel so the
  // cancelled instance's onComplete identity check correctly bails.
  const canvas = renderer.domElement
  const onCancel = () => {
    if (_pendingPreAim) { const t = _pendingPreAim; _pendingPreAim = null; t.cancel() }
    if (_pendingPath)   { const t = _pendingPath;   _pendingPath   = null; t.cancel() }
    saveSession()
    canvas.removeEventListener('pointerdown', onCancel, true)
  }
  canvas.addEventListener('pointerdown', onCancel, true)
}

// ── Electron IPC / browser dev shim ──────────────────────────────────────────
if (window.cs) {
  window.cs.onFileLoaded(({ source, path }) => {
    // Reload (Cmd+R) sends the same path → preserve in-memory view state.
    // A genuinely different file → reset to that file's saved state.
    const isNewFile = path !== _currentFilePath
    _currentFilePath = path
    if (isNewFile) applyFileState(path)
    loadSource(source, path.split('/').pop())
  })
  btnOpen.addEventListener('click', () => window.cs.openFile())

  // Menu → renderer notifications for bookmark commands
  window.cs.onMenuSaveBookmark(openBookmarkSaveOverlay)
  window.cs.onMenuOpenBookmarks(openBookmarkPickerOverlay)
}

restoreSession()

// ── HUD ───────────────────────────────────────────────────────────────────────
function updateHUD({ selected, selectedGroupId, selectedGroupLabel, directGroupSelected, transformMode, ambientIntensity } = {}) {
  const ambient = ambientIntensity ?? 0.5

  if (directGroupSelected) {
    modeLabel.textContent = selectedGroupLabel.toUpperCase()
    modeLabel.classList.add('selected')
    keyHints.textContent = `Esc deselect  ·  +/− ambient (${ambient.toFixed(1)})`
    const solid = groupSolidMap.get(selectedGroupId) ?? false
    _applyGroupToggleLabel(selectedGroupId, selectedGroupLabel, solid)
    groupToggle.classList.remove('hidden')
  } else if (selected) {
    modeLabel.textContent = `${selected.toUpperCase()} · ${transformMode.toUpperCase()}`
    modeLabel.classList.add('selected')
    keyHints.textContent = `G move · R rotate · S scale · Esc deselect  ·  +/− ambient (${ambient.toFixed(1)})`
    if (selectedGroupId) {
      const solid = groupSolidMap.get(selectedGroupId) ?? false
      _applyGroupToggleLabel(selectedGroupId, selectedGroupLabel, solid)
      groupToggle.classList.remove('hidden')
    } else {
      groupToggle.classList.add('hidden')
    }
  } else {
    modeLabel.textContent = 'NAVIGATE'
    modeLabel.classList.remove('selected')
    keyHints.textContent = `click a node to select  ·  +/− ambient (${ambient.toFixed(1)})`
    groupToggle.classList.add('hidden')
  }
}
