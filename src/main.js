import './style.css'
import Matter from 'matter-js'
import decomp from 'poly-decomp'
window.decomp = decomp

const { Engine, Render, Runner, Bodies, Body, Composite, Mouse, MouseConstraint, Events, Query, Constraint } = Matter

// Lower resting threshold: below this relative normal velocity, restitution is suppressed (default 2)
//Matter.Resolver._restingThresh = 0.001

// --- DOM ---
document.querySelector('#app').innerHTML = `
  <div id="toolbar">
    <div class="tb-row">
      <span class="title">Physics</span>
      <div class="toolbar-sep"></div>

      <div class="tb-group">
        <div class="tb-popover-wrap" id="spawn-wrap">
          <button id="add-circle" class="toggle-btn" data-tooltip="円を追加">● 円</button>
          <button id="add-box" class="toggle-btn" data-tooltip="四角を追加">■ 四角</button>
          <button id="btn-tri-eq"  class="toggle-btn" data-tooltip="正三角形を追加">△ 正三</button>
          <button id="btn-tri-arb" class="toggle-btn" data-tooltip="任意三角形を追加">△ 任意</button>
          <button id="btn-polygon" class="toggle-btn" data-tooltip="多角形を追加">⬡ 多角</button>
          <div class="tb-popover" id="spawn-panel">
            <div class="spawn-panel-header">
              <span id="spawn-panel-title" class="spawn-panel-title"></span>
              <button id="spawn-panel-collapse" title="折りたたむ">▲</button>
            </div>
            <div class="pop-row" id="spawn-size-row">
              <span class="pop-label spawn-label" id="spawn-size-label">幅</span>
              <input type="range" id="spawn-size" min="10" max="200" step="1" value="80">
              <span class="pop-val" id="spawn-size-val">80px</span>
            </div>
            <div class="pop-row" id="spawn-height-row">
              <span class="pop-label spawn-label">高さ</span>
              <input type="range" id="spawn-height" min="10" max="200" step="1" value="80">
              <span class="pop-val" id="spawn-height-val">80px</span>
            </div>
            <div class="pop-row">
              <span class="pop-label spawn-label">質量</span>
              <input type="range" id="spawn-mass" min="0.5" max="20" step="0.5" value="1">
              <span class="pop-val" id="spawn-mass-val">1.0</span>
            </div>
            <div class="pop-row">
              <span class="pop-label spawn-label">反発係数</span>
              <input type="range" id="spawn-restitution" min="0" max="1" step="0.01" value="0.5">
              <span class="pop-val" id="spawn-rest-val">0.50</span>
            </div>
            <div class="pop-row">
              <span class="pop-label spawn-label">摩擦係数</span>
              <input type="range" id="spawn-friction" min="0" max="1" step="0.01" value="0.1">
              <span class="pop-val" id="spawn-fric-val">0.10</span>
            </div>
            <div class="pop-row">
              <span class="pop-label spawn-label">空気抵抗</span>
              <input type="range" id="spawn-frictionair" min="0" max="0.1" step="0.001" value="0">
              <span class="pop-val" id="spawn-fair-val">0.000</span>
            </div>
            <div class="pop-row">
              <label class="pop-label spawn-label" for="spawn-collision">衝突判定</label>
              <input type="checkbox" id="spawn-collision" checked>
            </div>
          </div>
        </div>
      </div>

      <div class="toolbar-sep"></div>

      <div class="tb-group">
        <select id="preset-select"></select>
        <button id="btn-preset" data-tooltip="プリセットを配置">配置</button>
      </div>

      <div class="toolbar-sep"></div>

      <div class="tb-group">
        <button id="btn-pause" data-tooltip="一時停止 / 再開">⏸ 停止</button>
        <button id="reset" data-tooltip="一時保存があればその状態へ、なければ全クリア">↺ リセット</button>
        <button id="btn-reset-view" data-tooltip="ズーム・パンをデフォルトに戻す">⊞ View</button>
      </div>

      <div class="toolbar-sep"></div>

      <div class="tb-group">
        <span style="font-size:0.72rem;color:#aaa;white-space:nowrap">速度</span>
        <input type="range" id="time-scale" min="0.1" max="3" step="0.05" value="1" style="width:60px;accent-color:#e94560" data-tooltip="シミュレーション速度 (×0.1〜×3)">
        <span id="time-scale-val" style="font-size:0.72rem;font-family:monospace;color:#e2b96f;min-width:28px">×1.0</span>
      </div>

      <div class="toolbar-sep"></div>

      <div class="tb-group" data-tooltip="停止中に全オブジェクトの回転を強制ロックする">
        <label style="font-size:0.72rem;color:#aaa;white-space:nowrap;cursor:pointer;display:flex;align-items:center;gap:4px">
          <input type="checkbox" id="pause-rot-lock">停止中回転固定
        </label>
      </div>
    </div>

    <div class="tb-row">
      <div class="tb-group">
        <button id="btn-connect" class="toggle-btn" data-tooltip="接続モード切替">⚡ 接続</button>
        <button id="btn-pin" class="toggle-btn" data-tooltip="釘打ちモード切替">📌 釘</button>
        <div id="connect-options">
          <button id="btn-type-spring" class="type-btn active" data-type="spring" data-tooltip="バネで接続">バネ</button>
          <button id="btn-type-joint"  class="type-btn"        data-type="joint"  data-tooltip="関節で接続">関節</button>
          <span class="toolbar-sep-v"></span>
          <button class="type-btn attach-btn active" data-attach="snap" data-tooltip="スナップ点に接続">スナップ</button>
          <button class="type-btn attach-btn"        data-attach="edge" data-tooltip="エッジ上の点に接続">エッジ</button>
          <button class="type-btn attach-btn"        data-attach="free" data-tooltip="クリック位置に接続">自由</button>
          <button id="btn-clear-constraints" data-tooltip="全接続を削除">✕ 接続</button>
        </div>
      </div>

      <div class="toolbar-sep"></div>

      <div class="tb-group">
        <button id="btn-snapshot" data-tooltip="現在の状態を一時保存">💾 保存</button>
        <button id="btn-export" data-tooltip="現在のシーンをJSONで書き出す">↓ 書出</button>
        <button id="btn-import" data-tooltip="JSONファイルからシーンを読み込む">↑ 読込</button>
        <input type="file" id="file-import" accept=".json" style="display:none">
      </div>

      <div class="toolbar-sep"></div>

      <div class="tb-popover-wrap" id="settings-wrap">
        <button id="btn-settings" data-tooltip="重力・空間サイズの設定">⚙ 設定</button>
        <div class="tb-popover" id="settings-panel">
          <div class="pop-row">
            <span class="pop-label">重力</span>
            <input type="range" id="gravity-slider" min="0" max="3" step="0.05" value="1">
            <span id="gravity-val" class="pop-val">1.00</span>
          </div>
          <div class="pop-row">
            <span class="pop-label">空間 W</span>
            <input type="range" id="world-width-slider" min="200" max="3000" step="50">
            <input type="number" id="world-width-num" min="200" max="3000" step="50" class="num-input">
          </div>
          <div class="pop-row">
            <span class="pop-label">空間 H</span>
            <input type="range" id="world-height-slider" min="200" max="2000" step="50">
            <input type="number" id="world-height-num" min="200" max="2000" step="50" class="num-input">
          </div>
        </div>
      </div>

      <button id="btn-show-vel" class="toggle-btn" data-tooltip="速度ベクトルを表示">→ 速度</button>

      <div class="toolbar-sep"></div>

      <div class="tb-group">
        <button id="btn-grid-snap" class="toggle-btn" data-tooltip="グリッドスナップ ON/OFF (G)">⊞ グリッド</button>
        <input type="number" id="grid-size-input" min="5" max="200" step="5" value="20" class="num-input" data-tooltip="グリッドサイズ (world単位)">
      </div>
    </div>

    <div class="tb-row hint-row">
      <span id="connect-hint"></span>
    </div>
  </div>
  <div id="scene">
    <canvas id="canvas"></canvas>
    <div id="zoom-display">100%</div>
    <div id="info-panel" class="hidden">
      <div class="panel-header">
        <span id="panel-title">オブジェクト情報</span>
        <div class="panel-header-actions">
          <button id="panel-delete" class="btn-danger">削除</button>
          <button id="panel-close">✕</button>
        </div>
      </div>
      <div class="panel-body">

        <!-- 接続選択時のみ表示 -->
        <div id="constraint-display" class="hidden">
          <div class="section-label">接続情報</div>
          <div class="param-row"><span class="param-key">種類</span><span class="param-val" id="c-type">-</span></div>
          <div class="section-label" id="c-spring-section">バネ設定</div>
          <div id="c-spring-params">
            <label class="slider-row">
              <span class="param-key">バネ定数</span>
              <input type="range" id="s-springk" min="0.00001" max="0.002" step="0.00001" value="0.0003">
              <span class="slider-val" id="v-springk">-</span>
            </label>
            <label class="slider-row">
              <span class="param-key">自然長</span>
              <input type="range" id="s-springlen" min="0" max="800" step="1" value="100">
              <span class="slider-val" id="v-springlen">-</span>
            </label>
          </div>
          <div id="c-joint-params" class="hidden">
            <label class="slider-row">
              <span class="param-key">Stiffness</span>
              <input type="range" id="s-jointstiff" min="0.01" max="1" step="0.01" value="1">
              <span class="slider-val" id="v-jointstiff">-</span>
            </label>
          </div>
          <div id="c-motor-section" class="hidden">
            <div class="section-label">モーター設定</div>
            <label class="param-row">
              <input type="checkbox" id="c-motor-active">
              <span class="param-key">モーター ON</span>
            </label>
            <label class="slider-row">
              <span class="param-key">回転速度</span>
              <input type="range" id="s-motor-speed" min="0.1" max="20" step="0.1" value="5">
              <span class="slider-val" id="v-motor-speed">-</span>
            </label>
            <div class="param-row">
              <span class="param-key">方向</span>
              <label><input type="radio" name="motor-dir" value="1"> CW</label>
              <label><input type="radio" name="motor-dir" value="-1"> CCW</label>
            </div>
            <label class="slider-row">
              <span class="param-key">トルク</span>
              <input type="range" id="s-motor-torque" min="0.001" max="0.5" step="0.001" value="0.05">
              <span class="slider-val" id="v-motor-torque">-</span>
            </label>
          </div>
        </div>

        <!-- 単体選択時のみ表示 -->
        <div id="panel-display">
          <div class="section-label">種類・位置</div>
          <div class="param-row"><span class="param-key">タイプ</span><span class="param-val" id="p-type">-</span></div>
          <div class="param-row"><span class="param-key">X</span><span class="param-val" id="p-x">-</span></div>
          <div class="param-row"><span class="param-key">Y</span><span class="param-val" id="p-y">-</span></div>
          <div class="param-row"><span class="param-key">角度</span><span class="param-val" id="p-angle">-</span></div>

          <div class="section-label">速度</div>
          <div class="param-row"><span class="param-key">Vx</span><span class="param-val" id="p-vx">-</span></div>
          <div class="param-row"><span class="param-key">Vy</span><span class="param-val" id="p-vy">-</span></div>
          <div class="param-row"><span class="param-key">速さ</span><span class="param-val" id="p-speed">-</span></div>
          <div class="param-row"><span class="param-key">角速度</span><span class="param-val" id="p-angv">-</span></div>

          <div class="section-label">運動エネルギー</div>
          <div class="param-row"><span class="param-key">KE</span><span class="param-val" id="p-ke">-</span></div>
          <canvas id="speed-graph" width="198" height="60"></canvas>

          <div id="size-edit-section">
            <div class="section-label">サイズ変更</div>
            <!-- 円用 -->
            <div id="size-circle" class="hidden">
              <div class="slider-num-row">
                <span class="param-key">半径</span>
                <input type="range" id="s-radius" min="5" max="150" step="1">
                <input type="number" id="n-radius" min="5" max="150" step="1" class="num-input">
                <span class="slider-val">px</span>
              </div>
            </div>
            <!-- 四角用 -->
            <div id="size-rect" class="hidden">
              <div class="slider-num-row">
                <span class="param-key">幅</span>
                <input type="range" id="s-width" min="5" max="300" step="1">
                <input type="number" id="n-width" min="5" max="300" step="1" class="num-input">
                <span class="slider-val">px</span>
              </div>
              <div class="slider-num-row">
                <span class="param-key">高さ</span>
                <input type="range" id="s-height" min="5" max="300" step="1">
                <input type="number" id="n-height" min="5" max="300" step="1" class="num-input">
                <span class="slider-val">px</span>
              </div>
            </div>
          </div>
        </div>

        <div id="body-params">
        <!-- ボディ選択時に表示 -->
        <div class="section-label">パラメータ編集</div>
        <label class="slider-row">
          <span class="param-key">質量</span>
          <input type="range" id="s-mass" min="0.5" max="20" step="0.5" value="1">
          <span class="slider-val" id="v-mass">-</span>
        </label>
        <label class="slider-row">
          <span class="param-key">反発係数</span>
          <input type="range" id="s-restitution" min="0" max="1" step="0.01" value="0.5">
          <span class="slider-val" id="v-restitution">-</span>
        </label>
        <label class="slider-row">
          <span class="param-key">摩擦係数</span>
          <input type="range" id="s-friction" min="0" max="1" step="0.01" value="0.1">
          <span class="slider-val" id="v-friction">-</span>
        </label>
        <label class="slider-row">
          <span class="param-key">空気抵抗</span>
          <input type="range" id="s-frictionair" min="0" max="0.1" step="0.001" value="0">
          <span class="slider-val" id="v-frictionair">-</span>
        </label>
        <label class="slider-row">
          <span class="param-key">慣性モーメント</span>
          <span class="param-val" id="p-inertia">-</span>
        </label>
        <label class="slider-row">
          <span class="param-key">衝突判定</span>
          <input type="checkbox" id="p-collision" checked>
        </label>
        <label class="slider-row">
          <span class="param-key">回転ロック</span>
          <input type="checkbox" id="p-rot-lock">
        </label>
        <label class="slider-row">
          <span class="param-key">重心表示</span>
          <input type="checkbox" id="p-show-com">
        </label>
        </div>
      </div>
    </div>
  </div>
`

const canvas        = document.getElementById('canvas')
const infoPanel     = document.getElementById('info-panel')
const panelDisplay  = document.getElementById('panel-display')
const speedGraphCanvas = document.getElementById('speed-graph')
const speedGraphCtx    = speedGraphCanvas.getContext('2d')
const connectHint   = document.getElementById('connect-hint')

// Cached panel elements (avoid repeated getElementById in afterUpdate hot path)
const elPType    = document.getElementById('p-type')
const elPX       = document.getElementById('p-x')
const elPY       = document.getElementById('p-y')
const elPAngle   = document.getElementById('p-angle')
const elPVx      = document.getElementById('p-vx')
const elPVy      = document.getElementById('p-vy')
const elPSpeed   = document.getElementById('p-speed')
const elPAngV    = document.getElementById('p-angv')
const elPKE      = document.getElementById('p-ke')
const elPInertia = document.getElementById('p-inertia')
const elZoom     = document.getElementById('zoom-display')

// Return focus to body after any toolbar button click so keyboard shortcuts keep working
document.getElementById('toolbar').addEventListener('click', e => {
  if (e.target.closest('button')) e.target.closest('button').blur()
})

function getCanvasSize() {
  return {
    width:  window.innerWidth,
    height: window.innerHeight - document.getElementById('toolbar').offsetHeight,
  }
}

// ============================================================
// Engine
// ============================================================
const engine = Engine.create()
engine.constraintIterations = 2  // default 2 → improves chain rigidity (propagates corrections across linked constraints)
const { width, height } = getCanvasSize()

// Mutable world bounds — updated when user changes space size
let worldBounds = { left: 0, right: width, top: 0, bottom: height }

// Collision filter categories
const CAT_BOUNDARY = 0x0001
const CAT_BODY     = 0x0002
const CAT_GHOST    = 0x0004
const FILTER_BOUNDARY = { category: CAT_BOUNDARY, mask: CAT_BODY | CAT_GHOST, group: 0 }
const FILTER_BODY     = { category: CAT_BODY,     mask: CAT_BOUNDARY | CAT_BODY, group: 0 }
const FILTER_GHOST    = { category: CAT_GHOST,    mask: CAT_BOUNDARY, group: 0 }

const render = Render.create({
  canvas, engine,
  options: { width, height, background: '#1a1a2e', wireframes: false },
})

function createBoundaries() {
  const t = 50
  const { left, right, top, bottom } = worldBounds
  const w = right - left
  const h = bottom - top
  const cx = (left + right) / 2
  const cy = (top + bottom) / 2
  return [
    Bodies.rectangle(cx, bottom + t / 2, w + t * 2, t, { isStatic: true, label: 'ground',    friction: 0, frictionStatic: 0, restitution: 1, collisionFilter: FILTER_BOUNDARY }),
    Bodies.rectangle(cx, top    - t / 2, w + t * 2, t, { isStatic: true, label: 'ceiling',   friction: 0, frictionStatic: 0, restitution: 1, collisionFilter: FILTER_BOUNDARY }),
    Bodies.rectangle(left  - t / 2, cy, t, h + t * 2, { isStatic: true, label: 'wall-left',  friction: 0, frictionStatic: 0, restitution: 1, collisionFilter: FILTER_BOUNDARY }),
    Bodies.rectangle(right + t / 2, cy, t, h + t * 2, { isStatic: true, label: 'wall-right', friction: 0, frictionStatic: 0, restitution: 1, collisionFilter: FILTER_BOUNDARY }),
  ]
}

let boundaries = createBoundaries()
Composite.add(engine.world, boundaries)

function rebuildBoundaries() {
  Composite.remove(engine.world, boundaries)
  boundaries = createBoundaries()
  Composite.add(engine.world, boundaries)
}

function addInitialBodies() {
  const rect = Bodies.rectangle(width * 0.5, 80, 80, 80, { restitution: 0.5, frictionAir: 0, collisionFilter: FILTER_BODY, render: { fillStyle: '#4a90d9' } })
  rect._w = 80; rect._h = 80
  Composite.add(engine.world, [
    Bodies.circle(width * 0.3, 100, 40, { restitution: 0.7, friction: 0, frictionAir: 0, collisionFilter: FILTER_BODY, render: { fillStyle: '#e94560' } }),
    rect,
    Bodies.circle(width * 0.7, 120, 30, { restitution: 0.9, friction: 0, frictionAir: 0, collisionFilter: FILTER_BODY, render: { fillStyle: '#e2b96f' } }),
  ])
}
// Mouse
const mouse = Mouse.create(canvas)
const mouseConstraint = MouseConstraint.create(engine, {
  mouse,
  constraint: { stiffness: 0.2, render: { visible: false } },
})
Composite.add(engine.world, mouseConstraint)
render.mouse = mouse

// ticket 04: pan state
let isPanning  = false
let wasPanning = false   // stays true through mouseup so spawn handler can ignore it
let panStart   = null    // { x, y, offsetX, offsetY }

canvas.addEventListener('contextmenu', (e) => e.preventDefault())

const spawnPanel = document.getElementById('spawn-panel')
canvas.addEventListener('mouseenter', () => {
  if (spawnMode || drawMode) spawnPanel.classList.add('spawn-panel-hidden')
})
canvas.addEventListener('mouseleave', () => {
  spawnPanel.classList.remove('spawn-panel-hidden')
})

// ticket 03: wheel zoom — zoom toward mouse cursor
canvas.addEventListener('wheel', (e) => {
  e.preventDefault()
  const factor = e.deltaY < 0 ? 1.025 : 1 / 1.025
  const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, camera.scale * factor))
  const rect = canvas.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  camera.offsetX = mx - (mx - camera.offsetX) * (newScale / camera.scale)
  camera.offsetY = my - (my - camera.offsetY) * (newScale / camera.scale)
  camera.scale = newScale
  clampCamera()
  applyCamera()
}, { passive: false })

// ticket 04: pan start — middle button or Shift + left drag
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
    isPanning  = true
    wasPanning = true
    panStart = { x: e.clientX, y: e.clientY, offsetX: camera.offsetX, offsetY: camera.offsetY }
    e.preventDefault()
  }
})

window.addEventListener('mousemove', (e) => {
  if (!isPanning) return
  camera.offsetX = panStart.offsetX + (e.clientX - panStart.x)
  camera.offsetY = panStart.offsetY + (e.clientY - panStart.y)
  clampCamera()
  applyCamera()
})

window.addEventListener('mouseup', () => {
  if (isPanning) {
    isPanning = false
    panStart = null
  }
})

// Runner 停止中でも MouseConstraint イベントが発火するよう Engine.update を1回叩く
function pauseTick() {
  const saved = mouseConstraint.constraint.stiffness
  mouseConstraint.constraint.stiffness = 0
  Engine.update(engine, 16)
  mouseConstraint.constraint.stiffness = saved
}
canvas.addEventListener('mousedown', () => { if (paused) pauseTick() })
canvas.addEventListener('mousemove', () => { if (paused) pauseTick() })
canvas.addEventListener('mouseup',   () => { if (paused) pauseTick() })

// ============================================================
// Rotation handle state
// ============================================================
const HANDLE_OFFSET     = 30  // px screen-space, distance above AABB top
const HANDLE_RADIUS     = 8   // px screen-space, visual radius
const HANDLE_HIT_RADIUS = 12  // px screen-space, hit test radius

let rotateDragging          = false
let rotateHandleHover       = false
let rotateDragCenter        = null   // { x, y } world coords
let rotateDragStartMAngle   = 0      // atan2 of mouse at drag start
let rotateDragStartStates   = new Map() // body → { angle, dx, dy }

// Resize handle state
const RESIZE_HANDLE_RADIUS     = 5   // px screen-space, visual half-size
const RESIZE_HANDLE_HIT_RADIUS = 9   // px screen-space, hit test radius
let resizeHandleHover     = null   // handle id string or null
let resizeDragging        = false
let resizeDragHandle      = null   // handle descriptor at drag start
let resizeDragAnchorWorld = null   // world coords of anchor (fixed during drag)
let resizeDragAngle       = null   // body.angle at drag start
let _resizeHandleCache    = null   // { body, x, y, angle, handles: [{...h, wp}] }

function getUnionBounds(bodies) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  bodies.forEach(b => {
    minX = Math.min(minX, b.bounds.min.x)
    minY = Math.min(minY, b.bounds.min.y)
    maxX = Math.max(maxX, b.bounds.max.x)
    maxY = Math.max(maxY, b.bounds.max.y)
  })
  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } }
}

const TOOLBAR_SCREEN_H = 90  // px, threshold to flip handle below object

function getRotateHandlePos(bodies) {
  const bounds  = getUnionBounds(bodies)
  const cx      = (bounds.min.x + bounds.max.x) / 2
  const aboveWorldY = bounds.min.y - HANDLE_OFFSET / camera.scale
  const aboveScreenY = aboveWorldY * camera.scale + camera.offsetY
  const below = aboveScreenY < TOOLBAR_SCREEN_H
  return {
    x: cx,
    y: below ? bounds.max.y + HANDLE_OFFSET / camera.scale : aboveWorldY,
    below
  }
}

function getRotateCenter(bodies) {
  const cx = bodies.reduce((s, b) => s + b.position.x, 0) / bodies.length
  const cy = bodies.reduce((s, b) => s + b.position.y, 0) / bodies.length
  return { x: cx, y: cy }
}

function getResizeHandles(body) {
  if (body.label === 'Circle Body') {
    const r = body.circleRadius
    return [{ id: 'e', localPos: { x: r, y: 0 }, anchorLocal: { x: -r, y: 0 }, resizeX: true, resizeY: false }]
  }
  if (body.label === 'Rectangle Body') {
    const hw = (body._w ?? 50) / 2, hh = (body._h ?? 50) / 2
    return [
      { id: 'tl', localPos: { x: -hw, y: -hh }, anchorLocal: { x:  hw, y:  hh }, resizeX: true,  resizeY: true  },
      { id: 't',  localPos: { x:   0, y: -hh }, anchorLocal: { x:   0, y:  hh }, resizeX: false, resizeY: true  },
      { id: 'tr', localPos: { x:  hw, y: -hh }, anchorLocal: { x: -hw, y:  hh }, resizeX: true,  resizeY: true  },
      { id: 'r',  localPos: { x:  hw, y:   0 }, anchorLocal: { x: -hw, y:   0 }, resizeX: true,  resizeY: false },
      { id: 'br', localPos: { x:  hw, y:  hh }, anchorLocal: { x: -hw, y: -hh }, resizeX: true,  resizeY: true  },
      { id: 'b',  localPos: { x:   0, y:  hh }, anchorLocal: { x:   0, y: -hh }, resizeX: false, resizeY: true  },
      { id: 'bl', localPos: { x: -hw, y:  hh }, anchorLocal: { x:  hw, y: -hh }, resizeX: true,  resizeY: true  },
      { id: 'l',  localPos: { x: -hw, y:   0 }, anchorLocal: { x:  hw, y:   0 }, resizeX: true,  resizeY: false },
    ]
  }
  return []
}

function getResizeCursor(body, handleId) {
  if (handleId === 'e') return 'ew-resize'
  const dirs = { tl: [-1,-1], t: [0,-1], tr: [1,-1], r: [1,0], br: [1,1], b: [0,1], bl: [-1,1], l: [-1,0] }
  const [lx, ly] = dirs[handleId] ?? [0, 0]
  const cos = Math.cos(body.angle), sin = Math.sin(body.angle)
  const wx = lx * cos - ly * sin, wy = lx * sin + ly * cos
  const deg = ((Math.atan2(wy, wx) * 180 / Math.PI) + 360) % 360
  if (deg < 22.5 || deg >= 337.5) return 'ew-resize'
  if (deg < 67.5)  return 'nwse-resize'
  if (deg < 112.5) return 'ns-resize'
  if (deg < 157.5) return 'nesw-resize'
  if (deg < 202.5) return 'ew-resize'
  if (deg < 247.5) return 'nwse-resize'
  if (deg < 292.5) return 'ns-resize'
  return 'nesw-resize'
}

// ============================================================
// Selection state
// ============================================================
let selectedBody  = null   // single-select
let originalStroke = null
let selectedBodies = []    // multi-select (mutually exclusive with selectedBody)
let selectedBgConstraints = []  // bg-fixed constraint endpoints captured by rect-select
let mouseDownPos   = null
let rectSelect     = null  // { x1, y1, x2, y2 } while dragging
let spawnDrag      = null  // { x1, y1, x2, y2 } while drag-spawning
const SPEED_HISTORY = 150

// ============================================================
// Grid snap state
// ============================================================
let gridSnapEnabled = false
let gridSize        = 20

function snapToGrid(x, y) {
  if (!gridSnapEnabled) return { x, y }
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize,
  }
}
let speedBuffer = []

function fmt(n, d = 2) { return Number(n).toFixed(d) }

// ============================================================
// Camera state  (ticket 01)
// ============================================================
const camera = { offsetX: 0, offsetY: 0, scale: 1.0 }

// ticket 02: bounds constants
const MIN_SCALE = 0.2
const MAX_SCALE = 5.0
const MAX_PAN_X = 4000
const MAX_PAN_Y = 3000

function clampCamera() {
  const s = camera.scale
  camera.offsetX = Math.max(-MAX_PAN_X * s, Math.min(MAX_PAN_X * s, camera.offsetX))
  camera.offsetY = Math.max(-MAX_PAN_Y * s, Math.min(MAX_PAN_Y * s, camera.offsetY))
}

// Apply camera to Matter renderer and mouse
function applyCamera() {
  const w = render.options.width, h = render.options.height
  const s = camera.scale
  render.bounds.min = { x: -camera.offsetX / s, y: -camera.offsetY / s }
  render.bounds.max = { x: (w - camera.offsetX) / s, y: (h - camera.offsetY) / s }
  render.options.hasBounds = true
  Mouse.setOffset(mouse, { x: -camera.offsetX / s, y: -camera.offsetY / s })
  Mouse.setScale(mouse, { x: 1 / s, y: 1 / s })
  if (elZoom) elZoom.textContent = Math.round(s * 100) + '%'
}

// ticket 08: panel side uses screen-space X with hysteresis (Schmitt-trigger style)
const PANEL_HYSTERESIS = 120  // px — dead-band on each side of center before switching
let _panelOnLeft = false
function updatePanelSide(worldX) {
  const sx = worldX * camera.scale + camera.offsetX
  const mid = render.options.width / 2
  if (!_panelOnLeft && sx > mid + PANEL_HYSTERESIS) {
    _panelOnLeft = true
  } else if (_panelOnLeft && sx < mid - PANEL_HYSTERESIS) {
    _panelOnLeft = false
  }
  infoPanel.classList.toggle('panel-left', _panelOnLeft)
}

function updateInfoPanel() {
  if (selectedBody) {
    updatePanelSide(selectedBody.position.x)
  } else if (selectedBodies.length > 0) {
    const avgX = selectedBodies.reduce((s, b) => s + b.position.x, 0) / selectedBodies.length
    updatePanelSide(avgX)
  } else if (selectedConstraint) {
    const { pA, pB } = constraintWorldPoints(selectedConstraint)
    updatePanelSide((pA.x + pB.x) / 2)
  }

  if (!selectedBody) return
  const b   = selectedBody
  const buf = paused ? (velocityBuffer.get(b) ?? { vx: 0, vy: 0, av: 0 }) : null
  const vx  = buf ? buf.vx : b.velocity.x
  const vy  = buf ? buf.vy : b.velocity.y
  const av  = buf ? buf.av : b.angularVelocity
  const speed = Math.hypot(vx, vy)
  const ke    = 0.5 * b.mass * speed * speed

  speedBuffer.push(speed)
  if (speedBuffer.length > SPEED_HISTORY) speedBuffer.shift()

  elPType.textContent    = getBodyType(b)
  elPX.textContent       = fmt(b.position.x) + ' px'
  elPY.textContent       = fmt(b.position.y) + ' px'
  elPAngle.textContent   = fmt(b.angle * 180 / Math.PI) + ' °'
  elPVx.textContent      = fmt(vx) + ' px/s'
  elPVy.textContent      = fmt(vy) + ' px/s'
  elPSpeed.textContent   = fmt(speed) + ' px/s'
  elPAngV.textContent    = fmt(av, 4) + ' rad/s'
  elPKE.textContent      = fmt(ke, 1)
  elPInertia.textContent = fmt(b.inertia, 1)

  drawSpeedGraph()
}

function getTargets() {
  return selectedBody ? [selectedBody] : selectedBodies
}

function syncSliders(body) {
  document.getElementById('s-mass').value        = body.mass
  document.getElementById('s-restitution').value = body.restitution
  document.getElementById('s-friction').value    = body.friction
  document.getElementById('s-frictionair').value = body.frictionAir
  document.getElementById('v-mass').textContent        = fmt(body.mass)
  document.getElementById('v-restitution').textContent = fmt(body.restitution)
  document.getElementById('v-friction').textContent    = fmt(body.friction)
  document.getElementById('v-frictionair').textContent = fmt(body.frictionAir, 3)
  document.getElementById('p-collision').checked = body.collisionFilter.category !== CAT_GHOST
}

// Clear multi-select highlights
function clearMultiSelect() {
  selectedBodies.forEach(b => {
    b.render.strokeStyle = b._msOrigStroke
    b.render.lineWidth   = 1
    delete b._msOrigStroke
  })
  selectedBodies = []
  selectedBgConstraints = []
}

// Single select
function selectBody(body) {
  clearMultiSelect()
  clearConstraintSelect()
  if (selectedBody) {
    selectedBody.render.strokeStyle = originalStroke
    selectedBody.render.lineWidth   = 1
  }
  selectedBody = body
  speedBuffer  = []
  if (body) {
    originalStroke = body.render.strokeStyle
    body.render.strokeStyle = '#ffffff'
    body.render.lineWidth   = 3
    infoPanel.classList.remove('hidden')
    updatePanelSide(body.position.x)
    panelDisplay.classList.remove('hidden')
    document.getElementById('body-params').classList.remove('hidden')
    document.getElementById('panel-title').textContent = 'オブジェクト情報'
    syncSliders(body)
    document.getElementById('p-rot-lock').checked = paused
      ? (pauseRotBuffer.get(body)?.wasLocked ?? !!body._rotLocked)
      : !!body._rotLocked
    document.getElementById('p-show-com').checked = showCOM
    const isCircle = body.label === 'Circle Body'
    const isRect   = body.label === 'Rectangle Body'
    document.getElementById('size-circle').classList.toggle('hidden', !isCircle)
    document.getElementById('size-rect').classList.toggle('hidden', !isRect)
    if (isCircle) {
      const r = Math.round(body.circleRadius)
      document.getElementById('s-radius').value = r
      document.getElementById('n-radius').value = r
    }
    if (isRect) {
      const w = Math.round(body._w ?? 50), h = Math.round(body._h ?? 50)
      document.getElementById('s-width').value  = w
      document.getElementById('n-width').value  = w
      document.getElementById('s-height').value = h
      document.getElementById('n-height').value = h
    }
    updateInfoPanel()
  } else {
    infoPanel.classList.add('hidden')
  }
}

// Multi select
function setMultiSelect(bodies) {
  // clear single select
  if (selectedBody) {
    selectedBody.render.strokeStyle = originalStroke
    selectedBody.render.lineWidth   = 1
    selectedBody = null
    speedBuffer  = []
  }
  clearMultiSelect()
  clearConstraintSelect()
  selectedBodies = bodies
  bodies.forEach(b => {
    b._msOrigStroke         = b.render.strokeStyle
    b.render.strokeStyle    = '#53d8fb'
    b.render.lineWidth      = 2
  })
  infoPanel.classList.remove('hidden')
  const avgX = bodies.reduce((s, b) => s + b.position.x, 0) / bodies.length
  updatePanelSide(avgX)
  panelDisplay.classList.add('hidden')
  document.getElementById('body-params').classList.remove('hidden')
  document.getElementById('panel-title').textContent = `${bodies.length}個選択中`
  syncSliders(bodies[0])
  updateInfoPanel()
}

function clearConstraintSelect() {
  selectedConstraint = null
  document.getElementById('constraint-display').classList.add('hidden')
}

function clearAllSelection() {
  selectBody(null)
  clearMultiSelect()
  clearConstraintSelect()
  infoPanel.classList.add('hidden')
}

// Delete selected (single or multi)
function deleteSelected() {
  pushUndo()
  getTargets().forEach(b => {
    velocityBuffer.delete(b)
    pauseRotBuffer.delete(b)
    const toRemove = allConstraints().filter(c => c.bodyA === b || c.bodyB === b)
    toRemove.forEach(c => {
      Composite.remove(engine.world, c)
      removeConstraint(c)
    })
    Composite.remove(engine.world, b)
  })
  clearAllSelection()
}

function resizeBody(body, newW, newH) {
  if (body.label === 'Circle Body') {
    const scale = newW / body.circleRadius
    Body.scale(body, scale, scale, body.position)
  } else if (body.label === 'Rectangle Body') {
    const angle = body.angle
    Body.setAngle(body, 0)
    const scaleX = newW / (body._w ?? newW)
    const scaleY = newH / (body._h ?? newH)
    Body.scale(body, scaleX, scaleY, body.position)
    body._w = newW
    body._h = newH
    Body.setAngle(body, angle)
  }
  springs.forEach(c => {
    if (c.bodyA === body || c.bodyB === body) {
      const { pA, pB } = constraintWorldPoints(c)
      c.length = Math.hypot(pB.x - pA.x, pB.y - pA.y)
    }
  })
}

function countBgPins(body) {
  return pins.filter(c => c.bodyA === body && !c.bodyB).length
}

function selectConstraint(c) {
  clearAllSelection()
  selectedConstraint = c
  infoPanel.classList.remove('hidden')
  const { pA, pB } = constraintWorldPoints(c)
  updatePanelSide((pA.x + pB.x) / 2)
  if (c.label === 'pin') {
    document.getElementById('panel-title').textContent = '釘情報'
  } else {
    document.getElementById('panel-title').textContent = c.label === 'spring' ? 'バネ情報' : '関節情報'
  }
  document.getElementById('constraint-display').classList.remove('hidden')
  document.getElementById('body-params').classList.add('hidden')
  if (c.label === 'pin') {
    document.getElementById('c-type').textContent = c.bodyB ? 'オブジェクト間' : '背景固定'
  } else {
    document.getElementById('c-type').textContent = c.label === 'spring' ? 'バネ' : '関節'
  }
  document.getElementById('c-spring-params').classList.toggle('hidden', c.label !== 'spring')
  document.getElementById('c-spring-section').classList.toggle('hidden', c.label !== 'spring')
  document.getElementById('c-joint-params').classList.toggle('hidden', c.label !== 'joint')
  const showMotor = c.label === 'pin'
  document.getElementById('c-motor-section').classList.toggle('hidden', !showMotor)
  if (c.label === 'spring') {
    document.getElementById('s-springk').value = c._springK ?? SPRING_K
    document.getElementById('v-springk').textContent = (c._springK ?? SPRING_K).toFixed(5)
    document.getElementById('s-springlen').value = Math.round(c.length)
    document.getElementById('v-springlen').textContent = Math.round(c.length) + ' px'
  } else if (c.label === 'joint') {
    document.getElementById('s-jointstiff').value = c.stiffness
    document.getElementById('v-jointstiff').textContent = c.stiffness.toFixed(2)
  }
  if (showMotor) {
    document.getElementById('c-motor-active').checked = c._motorActive ?? false
    const spd = c._motorSpeed ?? 2.0
    document.getElementById('s-motor-speed').value = spd
    document.getElementById('v-motor-speed').textContent = spd.toFixed(1)
    const dir = c._motorDir ?? 1
    document.querySelector(`input[name="motor-dir"][value="${dir}"]`).checked = true
    const torq = c._motorTorque ?? 0.05
    document.getElementById('s-motor-torque').value = torq
    document.getElementById('v-motor-torque').textContent = torq.toFixed(3)
  }
  updateInfoPanel()
}

function pointToSegmentDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq < 0.001) return Math.hypot(px - ax, py - ay)
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function deleteSelectedConstraint() {
  if (!selectedConstraint) return
  pushUndo()
  if (selectedConstraint.label === 'joint' || selectedConstraint.label === 'pin') Composite.remove(engine.world, selectedConstraint)
  removeConstraint(selectedConstraint)
  clearAllSelection()
}

// ============================================================
// Pause
// ============================================================
let paused = false
let spawnMode = null  // null | 'circle' | 'box'
const spawnParams = { size: 80, sizeCircle: 40, sizeBox: 80, sizeTri: 40, height: 80, mass: 1, restitution: 0.5, friction: 0.1, frictionAir: 0, noCollision: false }
let drawMode     = null   // null | 'tri-eq' | 'tri-arb' | 'polygon'
let drawVertices = []
let drawMousePos = null
const MAX_POLY_VERTS = 12
const CLOSE_DIST     = 15
let showAllVelocities = false
let showCOM = false
let velDragging       = false
let velDragBodies     = []
const VEL_SCALE       = 30
const VEL_TIP_RADIUS  = 12
const velocityBuffer  = new Map()  // body → { vx, vy, av }
const pauseRotBuffer  = new Map()  // body → { wasLocked, origInertia }
let pauseDragBody   = null         // body grabbed during pause
let pauseDragOffset = { x: 0, y: 0 } // world-space offset: body.position - mouse

let _dynBodiesCache = null
function dynamicBodies() {
  if (!_dynBodiesCache)
    _dynBodiesCache = Composite.allBodies(engine.world).filter(b => !b.isStatic)
  return _dynBodiesCache
}
Events.on(engine.world, 'afterAdd', (event) => {
  _dynBodiesCache = null
  const obj = event.object
  if (obj.type === 'body' && !obj.isStatic) {
    obj.render.strokeStyle = 'rgba(0,0,0,0.3)'
    obj.render.lineWidth   = 1
  }
})
Events.on(engine.world, 'afterRemove', () => { _dynBodiesCache = null })
let pauseForceRotLock = false

function togglePause() {
  paused = !paused
  engine.gravity.scale = paused ? 0 : 0.001
  document.getElementById('btn-pause').classList.toggle('active', paused)
  document.getElementById('btn-pause').textContent = paused ? '▶ 再開' : '⏸ 停止'
  if (paused) {
    Runner.stop(runner)
    Composite.allBodies(engine.world).forEach(b => {
      if (b.isStatic) return
      velocityBuffer.set(b, { vx: b.velocity.x, vy: b.velocity.y, av: b.angularVelocity })
      const wasLocked   = !!b._rotLocked
      const origInertia = wasLocked ? (b._origInertia ?? b.inertia) : b.inertia
      pauseRotBuffer.set(b, { wasLocked, origInertia })
      Body.setVelocity(b, { x: 0, y: 0 })
      Body.setAngularVelocity(b, 0)
      if (!wasLocked && pauseForceRotLock) {
        Body.setInertia(b, Infinity)
      }
    })
  } else {
    pauseRotBuffer.forEach((data, b) => {
      if (data.wasLocked) {
        b._rotLocked    = true
        b._origInertia  = data.origInertia
        Body.setInertia(b, Infinity)
      } else {
        b._rotLocked    = false
        b._origInertia  = null
        Body.setInertia(b, data.origInertia)
      }
    })
    pauseRotBuffer.clear()
    velocityBuffer.forEach((vel, b) => {
      Body.setVelocity(b, { x: vel.vx, y: vel.vy })
      Body.setAngularVelocity(b, vel.av)
    })
    velocityBuffer.clear()
    Runner.run(runner, engine)
  }
}

document.getElementById('btn-pause').addEventListener('click', togglePause)

// ============================================================
// Preset helpers
// ============================================================

function resolveCoord(coord, axis, ctx) {
  const { width, height, floorY } = ctx
  if (axis === 'x') {
    if ('r' in coord) return coord.r * width
    if ('c' in coord) return width / 2 + coord.c
    if ('a' in coord) return coord.a
  } else {
    if ('f' in coord) return floorY + coord.f
    if ('r' in coord) return coord.r * height
    if ('a' in coord) return coord.a
  }
  throw new Error(`Unknown coord tag: ${JSON.stringify(coord)}`)
}

function expandLayout(layout, template, ctx) {
  const specs = []
  const cx = resolveCoord(layout.x, 'x', ctx)
  const cy = resolveCoord(layout.y, 'y', ctx)
  const w = template.w ?? 0
  const h = template.h ?? 0
  const r = template.radius ?? 0

  if (layout.type === 'row') {
    const { count, spacing } = layout
    const startX = cx - (count - 1) * spacing / 2
    for (let i = 0; i < count; i++) {
      specs.push({ ...template, x: startX + i * spacing, y: cy })
    }
  } else if (layout.type === 'stack') {
    const { count } = layout
    for (let i = 0; i < count; i++) {
      specs.push({ ...template, x: cx, y: cy - i * h })
    }
  } else if (layout.type === 'grid') {
    const { cols, rows, gap } = layout
    const totalW = (cols - 1) * gap
    const totalH = (rows - 1) * gap
    const startX = cx - totalW / 2
    const startY = cy - totalH
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        specs.push({ ...template, x: startX + col * gap, y: startY + row * gap })
      }
    }
  } else if (layout.type === 'ring') {
    const { count, radius } = layout
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI / count) * i
      specs.push({ ...template, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) })
    }
  } else if (layout.type === 'pyramid') {
    const { rows } = layout
    for (let row = 0; row < rows; row++) {
      const count = rows - row
      const rowY = cy - row * h
      const startX = cx - (count - 1) * w / 2
      for (let col = 0; col < count; col++) {
        specs.push({ ...template, x: startX + col * w, y: rowY })
      }
    }
  }
  return specs
}

function instantiateBodies(specs) {
  return specs.map(spec => {
    const opts = {
      collisionFilter: { ...(spec.noCollision ? FILTER_GHOST : FILTER_BODY) },
      ...(spec.options ?? {}),
      render: { fillStyle: nextColor() }
    }
    let b
    if (spec.type === 'rectangle') {
      b = Bodies.rectangle(spec.x, spec.y, spec.w, spec.h, opts)
      b._w = spec.w
      b._h = spec.h
    } else if (spec.type === 'circle') {
      b = Bodies.circle(spec.x, spec.y, spec.radius, opts)
    } else if (spec.type === 'polygon') {
      const cx = spec.vertices.reduce((s, v) => s + v.x, 0) / spec.vertices.length
      const cy = spec.vertices.reduce((s, v) => s + v.y, 0) / spec.vertices.length
      const local = spec.vertices.map(v => ({ x: v.x - cx, y: v.y - cy }))
      b = Bodies.fromVertices(cx, cy, local, { ...opts, label: 'Polygon Body' })
      if (b) setOriginalVertices(b, spec.vertices)
    }
    return b
  }).filter(Boolean)
}

function instantiateConstraints(specs, bodies) {
  const result = []
  for (const spec of specs) {
    const opts = {
      bodyA: bodies[spec.bodyA],
      pointA: spec.pointA ?? { x: 0, y: 0 },
      pointB: spec.pointB ?? { x: 0, y: 0 },
      length: spec.length ?? 0,
      stiffness: spec.stiffness ?? 0.8,
      label: spec.label ?? 'joint'
    }
    if (spec.bodyB != null) opts.bodyB = bodies[spec.bodyB]
    if (spec.pointAWorld) {
      delete opts.bodyA
      opts.pointA = spec.pointAWorld
    }
    if (spec.label === 'pin') opts.render = { visible: false }
    const c = Constraint.create(opts)
    if (spec._springK != null) c._springK = spec._springK
    if (spec.label === 'pin') {
      if (spec._motorActive != null) c._motorActive = spec._motorActive
      if (spec._motorSpeed != null) c._motorSpeed = spec._motorSpeed
      if (spec._motorDir != null) c._motorDir = spec._motorDir
      if (spec._motorTorque != null) c._motorTorque = spec._motorTorque
    }
    result.push(c)
  }
  return result
}

// ============================================================
// Generators
// ============================================================
const GENERATORS = {
  chain(params, ctx) {
    const { count, bw, bh, spacing, frictionAir } = params
    const { cx, floorY } = ctx
    const totalWidth = (count - 1) * spacing
    const startX = cx - totalWidth / 2
    const bodyY = floorY * 0.55
    const anchorY = floorY * 0.3

    const links = []
    for (let i = 0; i < count; i++) {
      const b = Bodies.rectangle(startX + i * spacing, bodyY, bw, bh, {
        restitution: 0.1, frictionAir, collisionFilter: { ...FILTER_BODY }, render: { fillStyle: nextColor() }
      })
      b._w = bw; b._h = bh
      Composite.add(engine.world, b)
      links.push(b)
    }

    for (let i = 0; i < count - 1; i++) {
      const c = Constraint.create({
        bodyA: links[i], pointA: { x: bw / 2, y: 0 },
        bodyB: links[i + 1], pointB: { x: -bw / 2, y: 0 },
        stiffness: 0.8, length: 0, label: 'joint'
      })
      Composite.add(engine.world, c)
      addConstraint(c)
    }

    const anchorL = Constraint.create({
      pointA: { x: startX, y: anchorY },
      bodyB: links[0], pointB: { x: -bw / 2, y: 0 },
      stiffness: 1.0, length: 0, label: 'joint'
    })
    const anchorR = Constraint.create({
      pointA: { x: startX + (count - 1) * spacing, y: anchorY },
      bodyB: links[count - 1], pointB: { x: bw / 2, y: 0 },
      stiffness: 1.0, length: 0, label: 'joint'
    })
    Composite.add(engine.world, anchorL)
    Composite.add(engine.world, anchorR)
    addConstraint(anchorL); addConstraint(anchorR)
  },

  newton(params, ctx) {
    const { count, radius, stringLength, anchorYRel, launchAngleDeg } = params
    const { cx, floorY } = ctx
    const spacing = radius * 2
    const totalWidth = (count - 1) * spacing
    const firstAnchorX = cx - totalWidth / 2
    const anchorY = floorY * anchorYRel
    const restY = anchorY + stringLength
    const launchAngle = launchAngleDeg * Math.PI / 180

    for (let i = 0; i < count; i++) {
      const anchorX = firstAnchorX + i * spacing
      let bx = anchorX
      let by = restY

      if (i === 0) {
        bx = anchorX - stringLength * Math.sin(launchAngle)
        by = anchorY + stringLength * Math.cos(launchAngle)
      }

      const b = Bodies.circle(bx, by, radius, {
        restitution: 1.0, friction: 0, frictionAir: 0,
        collisionFilter: { ...FILTER_BODY }, render: { fillStyle: nextColor() }
      })
      Composite.add(engine.world, b)

      const c = Constraint.create({
        pointA: { x: anchorX, y: anchorY },
        bodyB: b,
        length: stringLength,
        stiffness: 1.0,
        label: 'joint'
      })
      Composite.add(engine.world, c)
      addConstraint(c)
    }
  },
}

// ============================================================
// Presets
// ============================================================
const presetCache = new Map()

async function loadPreset(id) {
  if (presetCache.has(id)) return presetCache.get(id)
  const res = await fetch(`/presets/${id}.json`)
  const data = await res.json()
  presetCache.set(id, data)
  return data
}

function applyPresetData(data) {
  pushUndo()
  const width = worldBounds.right - worldBounds.left
  const height = worldBounds.bottom - worldBounds.top
  const floorY = worldBounds.bottom
  const cx = (worldBounds.left + worldBounds.right) / 2
  const ctx = { width, height, floorY }

  if (data.generator) {
    GENERATORS[data.generator](data.params, { cx, floorY })
    return
  }

  let bodySpecs
  if (data.layout) {
    bodySpecs = expandLayout(data.layout, data.template, ctx)
  } else if (data.bodies) {
    bodySpecs = data.bodies
  } else {
    return
  }

  const bodies = instantiateBodies(bodySpecs)
  Composite.add(engine.world, bodies)

  if (data.constraints) {
    const constraints = instantiateConstraints(data.constraints, bodies)
    for (const c of constraints) {
      if (c.label !== 'spring') Composite.add(engine.world, c)
      addConstraint(c)
    }
  }
}

async function applyPreset(id) {
  const data = await loadPreset(id)
  applyPresetData(data)
}

fetch('/presets/index.json')
  .then(r => r.json())
  .then(list => {
    const sel = document.getElementById('preset-select')
    for (const { id, label } of list) {
      const opt = document.createElement('option')
      opt.value = id
      opt.textContent = label
      sel.appendChild(opt)
    }
  })

document.getElementById('btn-preset').addEventListener('click', () => {
  applyPreset(document.getElementById('preset-select').value)
})

let savedSnapshot = null

function captureSnapshot() {
  const allBodies = Composite.allBodies(engine.world).filter(b => !b.isStatic)
  const idToIndex = new Map(allBodies.map((b, i) => [b.id, i]))

  const bodies = allBodies.map(b => {
    const buf = velocityBuffer.get(b)
    const base = {
      restitution: b.restitution,
      frictionAir: b.frictionAir,
      friction: b.friction,
      mass: b.mass,
      fillStyle: b.render.fillStyle,
      vx: buf ? buf.vx : b.velocity.x,
      vy: buf ? buf.vy : b.velocity.y,
      angularVelocity: buf ? buf.av : b.angularVelocity,
    }
    const noCollision = b.collisionFilter.category === CAT_GHOST
    if (b.label === 'Circle Body') {
      return { type: 'circle', x: b.position.x, y: b.position.y, radius: b.circleRadius, noCollision, ...base }
    } else if (b._w !== undefined) {
      return { type: 'rectangle', x: b.position.x, y: b.position.y,
               w: b._w, h: b._h, angle: b.angle, noCollision, ...base }
    } else {
      return { type: 'polygon', vertices: polyWorldVerts(b), noCollision, ...base }
    }
  })

  const constraints = allConstraints().map(c => {
    const spec = {
      label: c.label,
      pointB: { x: c.pointB.x, y: c.pointB.y },
      length: c.length,
      stiffness: c.stiffness,
    }
    if (c.bodyA) {
      spec.bodyA = idToIndex.get(c.bodyA.id)
      spec.pointA = { x: c.pointA.x, y: c.pointA.y }
    } else {
      spec.pointAWorld = { x: c.pointA.x, y: c.pointA.y }
    }
    if (c.bodyB) spec.bodyB = idToIndex.get(c.bodyB.id)
    if (c._springK != null) spec._springK = c._springK
    if (c.label === 'pin') {
      if (c._motorActive != null) spec._motorActive = c._motorActive
      if (c._motorSpeed != null) spec._motorSpeed = c._motorSpeed
      if (c._motorDir != null) spec._motorDir = c._motorDir
      if (c._motorTorque != null) spec._motorTorque = c._motorTorque
    }
    return spec
  })

  return { bodies, constraints, gravity: engine.gravity.y, colorIndex }
}

function restoreSnapshot(snap) {
  if (drawMode) setDrawMode(null)
  if (paused) togglePause()
  showAllVelocities = false
  document.getElementById('btn-show-vel').classList.remove('active')
  velDragging = false; velDragBodies = []
  velocityBuffer.clear()
  setConnectMode(false)
  setPinMode(false)
  clearAllSelection()
  rectSelect = null
  clearConstraints()
  Composite.clear(engine.world)
  boundaries = createBoundaries()
  Composite.add(engine.world, boundaries)
  Composite.add(engine.world, mouseConstraint)

  colorIndex = snap.colorIndex

  const bodies = snap.bodies.map(spec => {
    const opts = {
      restitution: spec.restitution,
      frictionAir: spec.frictionAir,
      friction: spec.friction,
      render: { fillStyle: spec.fillStyle },
      collisionFilter: { ...(spec.noCollision ? FILTER_GHOST : FILTER_BODY) },
    }
    let b
    if (spec.type === 'circle') {
      b = Bodies.circle(spec.x, spec.y, spec.radius, opts)
    } else if (spec.type === 'rectangle') {
      b = Bodies.rectangle(spec.x, spec.y, spec.w, spec.h, { ...opts, angle: spec.angle })
      b._w = spec.w; b._h = spec.h
    } else {
      const cx = spec.vertices.reduce((s, v) => s + v.x, 0) / spec.vertices.length
      const cy = spec.vertices.reduce((s, v) => s + v.y, 0) / spec.vertices.length
      const local = spec.vertices.map(v => ({ x: v.x - cx, y: v.y - cy }))
      b = Bodies.fromVertices(cx, cy, local, { ...opts, label: 'Polygon Body' })
      if (b) setOriginalVertices(b, spec.vertices)
    }
    if (b) {
      Body.setMass(b, spec.mass)
      Body.setVelocity(b, { x: spec.vx, y: spec.vy })
      Body.setAngularVelocity(b, spec.angularVelocity)
    }
    return b
  }).filter(Boolean)

  Composite.add(engine.world, bodies)

  if (snap.constraints && snap.constraints.length > 0) {
    const constraints = instantiateConstraints(snap.constraints, bodies)
    for (const c of constraints) {
      if (c.label !== 'spring') Composite.add(engine.world, c)
      addConstraint(c)
    }
  }

  engine.gravity.y = snap.gravity
  gravitySlider.value = snap.gravity
  gravityVal.textContent = snap.gravity.toFixed(2)
  if (!paused) togglePause()
  applyCamera()
}

// ============================================================
// Undo / Redo
// ============================================================
const UNDO_LIMIT = 50
const undoStack = []
const redoStack = []

function pushUndo() {
  undoStack.push(captureSnapshot())
  if (undoStack.length > UNDO_LIMIT) undoStack.shift()
  redoStack.length = 0
}

function undo() {
  if (!undoStack.length) return
  redoStack.push(captureSnapshot())
  const wasConnect = connectMode
  const wasPin = pinMode
  restoreSnapshot(undoStack.pop())
  if (wasConnect) setConnectMode(true)
  if (wasPin) setPinMode(true)
}

function redo() {
  if (!redoStack.length) return
  undoStack.push(captureSnapshot())
  const wasConnect = connectMode
  const wasPin = pinMode
  restoreSnapshot(redoStack.pop())
  if (wasConnect) setConnectMode(true)
  if (wasPin) setPinMode(true)
}

function bringToFront(targets) {
  const nonStatic = targets.filter(b => !b.isStatic)
  if (!nonStatic.length) return
  pushUndo()
  nonStatic.forEach(b => { Composite.remove(engine.world, b); Composite.add(engine.world, b) })
}

function sendToBack(targets) {
  const nonStatic = targets.filter(b => !b.isStatic)
  if (!nonStatic.length) return
  pushUndo()
  nonStatic.forEach(b => Composite.remove(engine.world, b))
  let insertIdx = 0
  engine.world.bodies.forEach((b, i) => { if (b.isStatic) insertIdx = i + 1 })
  nonStatic.forEach((b, i) => engine.world.bodies.splice(insertIdx + i, 0, b))
}

function exportScene() {
  const allBodies = Composite.allBodies(engine.world).filter(b => !b.isStatic)
  const idToIndex = new Map(allBodies.map((b, i) => [b.id, i]))

  const bodies = allBodies.map(b => {
    const baseOpts = { restitution: b.restitution, frictionAir: b.frictionAir }
    if (b.label === 'Circle Body') {
      return { type: 'circle', x: b.position.x, y: b.position.y,
               radius: b.circleRadius, options: baseOpts }
    } else if (b._w !== undefined) {
      return { type: 'rectangle', x: b.position.x, y: b.position.y,
               w: b._w, h: b._h, options: { ...baseOpts, angle: b.angle } }
    } else {
      return { type: 'polygon', vertices: polyWorldVerts(b), options: baseOpts }
    }
  })

  const constraints = allConstraints().map(c => {
    const spec = {
      label: c.label,
      pointB: { x: c.pointB.x, y: c.pointB.y },
      length: c.length,
      stiffness: c.stiffness,
    }
    if (c.bodyA) {
      spec.bodyA = idToIndex.get(c.bodyA.id)
      spec.pointA = { x: c.pointA.x, y: c.pointA.y }
    } else {
      spec.pointAWorld = { x: c.pointA.x, y: c.pointA.y }
    }
    if (c.bodyB) spec.bodyB = idToIndex.get(c.bodyB.id)
    if (c._springK != null) spec._springK = c._springK
    return spec
  })

  const json = JSON.stringify({ bodies, constraints }, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'scene.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

document.getElementById('btn-export').addEventListener('click', () => {
  exportScene()
})

// ============================================================
// Copy / Paste
// ============================================================
function copySelected() {
  const toCopy = selectedBodies.length > 0 ? selectedBodies : (selectedBody ? [selectedBody] : [])
  if (toCopy.length === 0) return

  const centroid = {
    x: toCopy.reduce((s, b) => s + b.position.x, 0) / toCopy.length,
    y: toCopy.reduce((s, b) => s + b.position.y, 0) / toCopy.length,
  }
  const idxMap = new Map(toCopy.map((b, i) => [b.id, i]))

  const bodies = toCopy.map(b => {
    const base = {
      restitution: b.restitution,
      frictionAir: b.frictionAir,
      friction: b.friction,
      mass: b.mass,
      fillStyle: b.render.fillStyle,
      noCollision: b.collisionFilter.category === CAT_GHOST,
      relX: b.position.x - centroid.x,
      relY: b.position.y - centroid.y,
      angle: b.angle,
      _rotLocked: !!b._rotLocked,
    }
    if (b.label === 'Circle Body') return { ...base, type: 'circle', radius: b.circleRadius }
    if (b._w !== undefined) return { ...base, type: 'rectangle', w: b._w, h: b._h }
    return { ...base, type: 'polygon', vertices: polyWorldVerts(b) }
  })

  const constraints = allConstraints()
    .filter(c => c.bodyA && idxMap.has(c.bodyA.id) && (!c.bodyB || idxMap.has(c.bodyB.id)))
    .map(c => {
      const spec = {
        label: c.label,
        bodyAIdx: idxMap.get(c.bodyA.id),
        bodyBIdx: c.bodyB ? idxMap.get(c.bodyB.id) : null,
        pointA: { x: c.pointA.x, y: c.pointA.y },
        pointB: { x: c.pointB.x, y: c.pointB.y },
        length: c.length,
        stiffness: c.stiffness,
      }
      if (!c.bodyB) {
        spec.pointBRelX = c.pointB.x - centroid.x
        spec.pointBRelY = c.pointB.y - centroid.y
      }
      if (c._springK != null) spec._springK = c._springK
      if (c.label === 'pin') {
        spec._motorActive = c._motorActive
        spec._motorSpeed  = c._motorSpeed
        spec._motorDir    = c._motorDir
        spec._motorTorque = c._motorTorque
      }
      return spec
    })

  clipboard = { centroid, bodies, constraints }
}

function pasteClipboard(worldPos) {
  if (!clipboard) return

  const newBodies = clipboard.bodies.map(spec => {
    const x = worldPos.x + spec.relX
    const y = worldPos.y + spec.relY
    const opts = {
      restitution: spec.restitution,
      frictionAir: spec.frictionAir,
      friction: spec.friction,
      render: { fillStyle: spec.fillStyle },
      collisionFilter: { ...(spec.noCollision ? FILTER_GHOST : FILTER_BODY) },
    }
    let b
    if (spec.type === 'circle') {
      b = Bodies.circle(x, y, spec.radius, opts)
    } else if (spec.type === 'rectangle') {
      b = Bodies.rectangle(x, y, spec.w, spec.h, { ...opts, angle: spec.angle })
      b._w = spec.w; b._h = spec.h
    } else {
      const origCx = spec.vertices.reduce((s, v) => s + v.x, 0) / spec.vertices.length
      const origCy = spec.vertices.reduce((s, v) => s + v.y, 0) / spec.vertices.length
      const local = spec.vertices.map(v => ({ x: v.x - origCx, y: v.y - origCy }))
      b = Bodies.fromVertices(x, y, local, { ...opts, label: 'Polygon Body' })
      if (b) {
        const pastedVerts = spec.vertices.map(v => ({ x: v.x + (x - origCx), y: v.y + (y - origCy) }))
        setOriginalVertices(b, pastedVerts)
      }
    }
    if (b) {
      Body.setMass(b, spec.mass)
      if (spec._rotLocked) { b._rotLocked = true; b._origInertia = b.inertia; Body.setInertia(b, Infinity) }
    }
    return b
  }).filter(Boolean)

  Composite.add(engine.world, newBodies)

  for (const spec of clipboard.constraints) {
    const bA = newBodies[spec.bodyAIdx]
    if (!bA) continue
    const bB = spec.bodyBIdx != null ? newBodies[spec.bodyBIdx] : null
    const opts = {
      bodyA: bA,
      pointA: { x: spec.pointA.x, y: spec.pointA.y },
      pointB: bB
        ? { x: spec.pointB.x, y: spec.pointB.y }
        : { x: worldPos.x + spec.pointBRelX, y: worldPos.y + spec.pointBRelY },
      length: spec.length,
      stiffness: spec.stiffness,
      label: spec.label,
    }
    if (bB) opts.bodyB = bB
    if (spec.label === 'pin') opts.render = { visible: false }
    const c = Constraint.create(opts)
    if (spec._springK != null) c._springK = spec._springK
    if (spec.label === 'pin') {
      if (spec._motorActive != null) c._motorActive = spec._motorActive
      if (spec._motorSpeed  != null) c._motorSpeed  = spec._motorSpeed
      if (spec._motorDir    != null) c._motorDir    = spec._motorDir
      if (spec._motorTorque != null) c._motorTorque = spec._motorTorque
    }
    if (spec.label !== 'spring') Composite.add(engine.world, c)
    addConstraint(c)
  }

  if (newBodies.length === 1) {
    selectBody(newBodies[0])
  } else if (newBodies.length > 1) {
    setMultiSelect(newBodies)
  }
}

document.getElementById('btn-import').addEventListener('click', () => {
  document.getElementById('file-import').click()
})

document.getElementById('file-import').addEventListener('change', (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result)
      applyPresetData(data)
    } catch (err) {
      console.error('JSONの読み込みに失敗しました:', err)
    }
  }
  reader.readAsText(file)
  e.target.value = ''
})

document.getElementById('btn-show-vel').addEventListener('click', () => {
  showAllVelocities = !showAllVelocities
  document.getElementById('btn-show-vel').classList.toggle('active', showAllVelocities)
})

document.getElementById('btn-grid-snap').addEventListener('click', () => {
  gridSnapEnabled = !gridSnapEnabled
  document.getElementById('btn-grid-snap').classList.toggle('active', gridSnapEnabled)
})
document.getElementById('grid-size-input').addEventListener('change', (e) => {
  const v = parseInt(e.target.value)
  if (v >= 5 && v <= 200) gridSize = v
})

// ============================================================
// Pin mode
// ============================================================
let pinMode      = false
let pinHoverBody  = null
let pinHoverPoint = null

// Connect mode
// ============================================================
let connectMode  = false
let connectType  = 'spring'
let attachMode   = 'snap'
let connectFirst = null
let connectFirstStroke = null
let connectFirstPoint = null  // { x, y } local coords of chosen point; null = center
let connectHoverBody  = null  // body under mouse in connect mode
let connectHoverPoint = null  // { local, world } snap candidate under mouse, or null
let _snapCacheConnect = null  // { body, x, y, candidates }
let _snapCachePin     = null

// Overlap cycling — right-click to lock onto a specific body
let cycleLockBody = null  // body locked via right-click
let cycleLockPos  = null  // world pos where lock was made
let cycleBodies   = []    // bodies at lock position
let cycleIndex    = 0     // current index in cycleBodies

let lastMouseButton = 0   // button captured on mousedown (e.mouse.button is -1 by mouseup)
let clipboard = null              // copy-paste clipboard { centroid, bodies, constraints }
let lastMouseWorldPos = { x: 0, y: 0 } // last known mouse world position for paste

const springs = []
const pins    = []
const joints  = []

function addConstraint(c) {
  if (c.label === 'spring') springs.push(c)
  else if (c.label === 'pin') pins.push(c)
  else joints.push(c)
}

function removeConstraint(c) {
  const arr = c.label === 'spring' ? springs : c.label === 'pin' ? pins : joints
  const idx = arr.indexOf(c)
  if (idx !== -1) arr.splice(idx, 1)
}

function clearConstraints() {
  springs.length = 0
  pins.length    = 0
  joints.length  = 0
}

function allConstraints() {
  return [...springs, ...joints, ...pins]
}

let selectedConstraint = null

function setConnectMode(active) {
  if (active && spawnMode) { spawnMode = null; document.getElementById('add-circle').classList.remove('active'); document.getElementById('add-box').classList.remove('active'); document.getElementById('btn-tri-eq').classList.remove('active'); document.getElementById('spawn-panel').classList.remove('open'); canvas.style.cursor = '' }
  if (active && drawMode) setDrawMode(null)
  if (active && pinMode) setPinMode(false)
  connectMode = active
  document.getElementById('btn-connect').classList.toggle('active', active)
  if (!active) {
    cancelConnectFirst()
    connectHint.textContent = ''
    connectHoverBody = null
    connectHoverPoint = null
    cycleLockBody = null; cycleLockPos = null; cycleBodies = []; cycleIndex = 0
  } else {
    connectHint.textContent = '1つ目のオブジェクトをクリック'
    selectBody(null)
  }
}

function setPinMode(active) {
  if (active && spawnMode) { spawnMode = null; document.getElementById('add-circle').classList.remove('active'); document.getElementById('add-box').classList.remove('active'); document.getElementById('btn-tri-eq').classList.remove('active'); document.getElementById('spawn-panel').classList.remove('open'); canvas.style.cursor = '' }
  if (active && drawMode) setDrawMode(null)
  if (active && connectMode) setConnectMode(false)
  pinMode = active
  document.getElementById('btn-pin').classList.toggle('active', active)
  if (!active) {
    pinHoverBody  = null
    pinHoverPoint = null
    cycleLockBody = null; cycleLockPos = null; cycleBodies = []; cycleIndex = 0
    connectHint.textContent = ''
  } else {
    connectHint.textContent = 'オブジェクトをクリックして釘を打つ'
  }
}

function cancelConnectFirst() {
  if (connectFirst) {
    connectFirst.render.strokeStyle = connectFirstStroke
    connectFirst.render.lineWidth   = 1
    connectFirst = null
    connectFirstPoint = null
  }
  cycleLockBody = null; cycleLockPos = null; cycleBodies = []; cycleIndex = 0
}

function setDrawMode(mode) {
  if (mode && spawnMode) { spawnMode = null; document.getElementById('add-circle').classList.remove('active'); document.getElementById('add-box').classList.remove('active'); document.getElementById('btn-tri-eq').classList.remove('active'); document.getElementById('spawn-panel').classList.remove('open'); canvas.style.cursor = '' }
  drawMode = mode
  drawVertices = []
  drawMousePos = null
  const modeMap = { 'tri-arb': 'btn-tri-arb', 'polygon': 'btn-polygon' }
  ;['btn-tri-arb', 'btn-polygon'].forEach(id => document.getElementById(id).classList.remove('active'))
  if (mode && modeMap[mode]) document.getElementById(modeMap[mode]).classList.add('active')
  const panel    = document.getElementById('spawn-panel')
  const titleEl  = document.getElementById('spawn-panel-title')
  const sizeRow  = document.getElementById('spawn-size-row')
  const heightRow = document.getElementById('spawn-height-row')
  if (mode) {
    connectHint.textContent = mode === 'tri-arb' ? '頂点1をクリック (3点)'
                            : '頂点をクリック (最大8点, Enterまたは始点で閉じる)'
    setConnectMode(false)
    titleEl.textContent = mode === 'tri-arb' ? '△ 任意 を配置' : '⬡ 多角 を配置'
    sizeRow.style.display = 'none'
    heightRow.style.display = 'none'
    panel.classList.add('open')
    canvas.style.cursor = 'crosshair'
  } else {
    connectHint.textContent = ''
    panel.classList.remove('open')
    panel.classList.remove('spawn-panel-hidden')
    sizeRow.style.display = ''
    heightRow.style.display = ''
    canvas.style.cursor = ''
  }
}

function setSpawnMode(mode) {
  spawnMode = (spawnMode === mode) ? null : mode
  document.getElementById('add-circle').classList.toggle('active', spawnMode === 'circle')
  document.getElementById('add-box').classList.toggle('active', spawnMode === 'box')
  document.getElementById('btn-tri-eq').classList.toggle('active', spawnMode === 'tri-eq')
  const panel = document.getElementById('spawn-panel')
  if (spawnMode) {
    panel.classList.add('open')
    const sizeLabel  = document.getElementById('spawn-size-label')
    const sizeSlider = document.getElementById('spawn-size')
    const heightRow  = document.getElementById('spawn-height-row')
    const titleEl    = document.getElementById('spawn-panel-title')
    if (spawnMode === 'circle') {
      titleEl.textContent = '● 円 を配置'
      sizeLabel.textContent = '半径'
      sizeSlider.min = 5; sizeSlider.max = 150
      heightRow.style.display = 'none'
    } else if (spawnMode === 'tri-eq') {
      titleEl.textContent = '△ 正三 を配置'
      sizeLabel.textContent = '外接円半径'
      sizeSlider.min = 10; sizeSlider.max = 150
      heightRow.style.display = 'none'
    } else {
      titleEl.textContent = '■ 四角 を配置'
      sizeLabel.textContent = '幅'
      sizeSlider.min = 10; sizeSlider.max = 200
      heightRow.style.display = ''
    }
    const modeKey = spawnMode === 'circle' ? 'sizeCircle' : spawnMode === 'tri-eq' ? 'sizeTri' : 'sizeBox'
    spawnParams.size = spawnParams[modeKey]
    sizeSlider.value = spawnParams[modeKey]
    document.getElementById('spawn-size-val').textContent = Math.round(spawnParams[modeKey]) + 'px'
    canvas.style.cursor = 'crosshair'
    if (drawMode) setDrawMode(null)
    if (connectMode) setConnectMode(false)
    if (pinMode) setPinMode(false)
  } else {
    panel.classList.remove('open')
    panel.classList.remove('spawn-panel-hidden')
    canvas.style.cursor = ''
    spawnDrag = null
  }
}

function spawnBody(type, x, y) {
  pushUndo()
  const opts = {
    restitution: spawnParams.restitution,
    friction: spawnParams.friction,
    frictionAir: spawnParams.frictionAir,
    collisionFilter: { ...(spawnParams.noCollision ? FILTER_GHOST : FILTER_BODY) },
    render: { fillStyle: nextColor() }
  }
  let b
  if (type === 'circle') {
    b = Bodies.circle(x, y, spawnParams.size, opts)
  } else if (type === 'tri-eq') {
    b = Bodies.polygon(x, y, 3, spawnParams.size, opts)
  } else {
    const w = spawnParams.size, h = spawnParams.height
    b = Bodies.rectangle(x, y, w, h, opts)
    b._w = w; b._h = h
  }
  Body.setMass(b, spawnParams.mass)
  Composite.add(engine.world, b)
  if (paused) {
    velocityBuffer.set(b, { vx: 0, vy: 0, av: 0 })
    pauseRotBuffer.set(b, { wasLocked: false, origInertia: b.inertia })
    if (pauseForceRotLock) Body.setInertia(b, Infinity)
  }
}

function spawnBodyFromRect(type, cx, cy, w, h) {
  pushUndo()
  const opts = {
    restitution: spawnParams.restitution,
    friction: spawnParams.friction,
    frictionAir: spawnParams.frictionAir,
    collisionFilter: { ...(spawnParams.noCollision ? FILTER_GHOST : FILTER_BODY) },
    render: { fillStyle: nextColor() }
  }
  let b
  if (type === 'circle') {
    const r = Math.min(w, h) / 2
    b = Bodies.circle(cx, cy, r, opts)
  } else if (type === 'tri-eq') {
    // vertices at angles 0, 2π/3, 4π/3 → bbox: width=R*1.5, height=R*√3
    const R = Math.min(w / 1.5, h / Math.sqrt(3))
    b = Bodies.polygon(cx, cy, 3, R, opts)
  } else {
    b = Bodies.rectangle(cx, cy, w, h, opts)
    b._w = w; b._h = h
  }
  Body.setMass(b, spawnParams.mass)
  Composite.add(engine.world, b)
  if (paused) {
    velocityBuffer.set(b, { vx: 0, vy: 0, av: 0 })
    pauseRotBuffer.set(b, { wasLocked: false, origInertia: b.inertia })
    if (pauseForceRotLock) Body.setInertia(b, Infinity)
  }
}

;(function initSpawnSliders() {
  const defs = [
    { id: 'spawn-size',        valId: 'spawn-size-val',   key: 'size',        fmt: v => Math.round(v) + 'px' },
    { id: 'spawn-height',      valId: 'spawn-height-val', key: 'height',      fmt: v => Math.round(v) + 'px' },
    { id: 'spawn-mass',        valId: 'spawn-mass-val',   key: 'mass',        fmt: v => Number(v).toFixed(1) },
    { id: 'spawn-restitution', valId: 'spawn-rest-val',   key: 'restitution', fmt: v => Number(v).toFixed(2) },
    { id: 'spawn-friction',    valId: 'spawn-fric-val',   key: 'friction',    fmt: v => Number(v).toFixed(2) },
    { id: 'spawn-frictionair', valId: 'spawn-fair-val',   key: 'frictionAir', fmt: v => Number(v).toFixed(3) },
  ]
  defs.forEach(({ id, valId, key, fmt }) => {
    const slider = document.getElementById(id)
    const valEl  = document.getElementById(valId)
    slider.addEventListener('input', () => {
      spawnParams[key] = parseFloat(slider.value)
      valEl.textContent = fmt(slider.value)
    })
    valEl.textContent = fmt(slider.value)
  })
})()

document.getElementById('spawn-size').addEventListener('input', () => {
  const modeKey = spawnMode === 'circle' ? 'sizeCircle' : spawnMode === 'tri-eq' ? 'sizeTri' : 'sizeBox'
  spawnParams[modeKey] = spawnParams.size
})

document.getElementById('spawn-collision').addEventListener('change', e => {
  spawnParams.noCollision = !e.target.checked
})

function segmentsIntersect(a, b, c, d) {
  const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  const d1 = cross(c, d, a), d2 = cross(c, d, b)
  const d3 = cross(a, b, c), d4 = cross(a, b, d)
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

function hasSelfIntersection(verts, newPt) {
  const n = verts.length
  if (n < 2) return false
  for (let i = 0; i < n - 2; i++) {
    if (segmentsIntersect(verts[n - 1], newPt, verts[i], verts[i + 1])) return true
  }
  if (n >= 3) {
    for (let i = 1; i < n - 1; i++) {
      if (segmentsIntersect(newPt, verts[0], verts[i], verts[i + 1])) return true
    }
  }
  return false
}

function polyWorldVerts(b) {
  if (b._originalVertices) {
    const cos = Math.cos(b.angle), sin = Math.sin(b.angle)
    return b._originalVertices.map(v => ({
      x: b.position.x + v.x * cos - v.y * sin,
      y: b.position.y + v.x * sin + v.y * cos
    }))
  }
  return b.vertices.map(v => ({ x: v.x, y: v.y }))
}

function setOriginalVertices(body, worldVerts) {
  body._originalVertices = worldVerts.map(v => ({
    x: v.x - body.position.x,
    y: v.y - body.position.y
  }))
}

function finalizePolygon(verts) {
  if (verts.length < 3) return
  pushUndo()
  const cx = verts.reduce((s, v) => s + v.x, 0) / verts.length
  const cy = verts.reduce((s, v) => s + v.y, 0) / verts.length
  const localVerts = verts.map(v => ({ x: v.x - cx, y: v.y - cy }))
  const body = Bodies.fromVertices(cx, cy, localVerts, {
    restitution: spawnParams.restitution,
    friction: spawnParams.friction,
    frictionAir: spawnParams.frictionAir,
    collisionFilter: { ...(spawnParams.noCollision ? FILTER_GHOST : FILTER_BODY) },
    label: 'Polygon Body',
    render: { fillStyle: nextColor() }
  })
  if (body) {
    setOriginalVertices(body, verts)
    Body.setMass(body, spawnParams.mass)
    Composite.add(engine.world, body)
    if (paused) {
      velocityBuffer.set(body, { vx: 0, vy: 0, av: 0 })
      pauseRotBuffer.set(body, { wasLocked: false, origInertia: body.inertia })
      if (pauseForceRotLock) Body.setInertia(body, Infinity)
    }
  }
  drawVertices = []
  drawMousePos = null
  connectHint.textContent = drawMode === 'tri-arb' ? '頂点1をクリック (3点)'
                          : '頂点をクリック (最大12点, Enterまたは始点で閉じる)'
}

document.querySelectorAll('.type-btn:not(.attach-btn)').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.type-btn:not(.attach-btn)').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    connectType = btn.dataset.type
  })
})

document.querySelectorAll('.attach-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.attach-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    attachMode = btn.dataset.attach
  })
})

document.getElementById('btn-connect').addEventListener('click', () => setConnectMode(!connectMode))
document.getElementById('btn-pin').addEventListener('click', () => setPinMode(!pinMode))

document.getElementById('time-scale').addEventListener('input', e => {
  const v = parseFloat(e.target.value)
  engine.timing.timeScale = v
  document.getElementById('time-scale-val').textContent = '×' + v.toFixed(2)
})

document.getElementById('pause-rot-lock').addEventListener('change', e => {
  pauseForceRotLock = e.target.checked
  if (!paused) return
  pauseRotBuffer.forEach((data, b) => {
    if (data.wasLocked) return
    if (pauseForceRotLock) {
      Body.setInertia(b, Infinity)
      Body.setAngularVelocity(b, 0)
    } else {
      Body.setInertia(b, data.origInertia)
    }
  })
})

document.getElementById('spawn-panel-collapse').addEventListener('click', e => {
  e.stopPropagation()
  const panel = document.getElementById('spawn-panel')
  const collapsed = panel.classList.toggle('spawn-panel-collapsed')
  e.currentTarget.textContent = collapsed ? '▼' : '▲'
})

document.getElementById('btn-tri-eq').addEventListener('click',  () => setSpawnMode('tri-eq'))
document.getElementById('btn-tri-arb').addEventListener('click', () => setDrawMode(drawMode === 'tri-arb' ? null : 'tri-arb'))
document.getElementById('btn-polygon').addEventListener('click', () => setDrawMode(drawMode === 'polygon' ? null : 'polygon'))

document.getElementById('btn-clear-constraints').addEventListener('click', () => {
  allConstraints().forEach(c => Composite.remove(engine.world, c))
  clearConstraints()
})

Events.on(mouseConstraint, 'startdrag', () => {
  if (connectMode || pinMode || rectSelect || velDragging || drawMode || isPanning) {
    mouseConstraint.body = null
    mouse.button = -1
  } else {
    pushUndo()
  }
})

// Force-based spring constant (Hooke's law: F = k * extension, applied via Body.applyForce)
// This conserves energy in Verlet integration, unlike PBD constraints.
const SPRING_K = 0.0003
const ARROW_ACCEL = 0.005  // arrow-key control: acceleration magnitude (uniform across masses)
const arrowKeysDown = new Set()
let nudgePendingUndo = true

function queryPointByZ(bodies, pos) {
  const hits = Query.point(bodies, pos)
  const order = new Map(Composite.allBodies(engine.world).map((b, i) => [b.id, i]))
  hits.sort((a, b) => (order.get(b.id) ?? 0) - (order.get(a.id) ?? 0))
  return hits
}

function handleConnect(pos, shift) {
  const aPos = gridSnapEnabled ? { x: snapToGrid(pos.x, pos.y).x, y: snapToGrid(pos.x, pos.y).y } : pos
  const all = Composite.allBodies(engine.world).filter(b => !b.isStatic)
  const hit = queryPointByZ(all, pos)

  // Right-click: cycle lock to select which overlapping body to use
  if (shift) {
    if (hit.length === 0) return
    const THRESH = 15 / camera.scale
    if (cycleLockPos && Math.hypot(pos.x - cycleLockPos.x, pos.y - cycleLockPos.y) < THRESH && cycleBodies.length > 1) {
      cycleIndex = (cycleIndex + 1) % cycleBodies.length
    } else {
      cycleBodies = hit; cycleIndex = 1 % hit.length
      cycleLockPos = { x: pos.x, y: pos.y }
    }
    cycleLockBody = cycleBodies[cycleIndex]
    connectHoverBody = cycleLockBody
    if (attachMode === 'edge') {
      connectHoverPoint = findEdgePoint(connectHoverBody, pos)
    } else if (attachMode === 'free') {
      connectHoverPoint = { local: worldToLocal(pos, connectHoverBody), world: pos }
    } else {
      connectHoverPoint = findSnapPoint(connectHoverBody, pos)
    }
    const n = cycleBodies.length
    const suffix = connectFirst ? '/ クリックで接続' : '/ クリックで選択'
    connectHint.textContent = `${n}個重複 (${cycleIndex + 1}/${n}) — 右クリックで切替 ${suffix}`
    return
  }

  if (!connectFirst) {
    if (hit.length === 0) { setConnectMode(false); return }
    // Normal click: select first body (use locked body if available)
    const target = connectHoverBody ?? hit[0]
    if (!target) return
    connectFirst       = target
    connectFirstStroke = target.render.strokeStyle
    target.render.strokeStyle = '#e2b96f'
    target.render.lineWidth   = 3
    connectFirstPoint  = computeAttachPoint(target, aPos, attachMode).local
    const n = hit.length
    connectHint.textContent = n > 1
      ? `${n}個重複 — 右クリックで切替 / クリックで接続`
      : '2つ目またはキャンバスをクリック (Esc でキャンセル)'
    return
  }

  // Normal click: create connection to second body (use locked body if available)
  const target = connectHoverBody ?? hit[0] ?? null
  if (target === connectFirst) return

  pushUndo()
  // pointA for spring: true local coords (worldToLocal); Matter.js never touches spring constraints.
  // pointA for joint: raw world offset (vertex - body.position); Matter.js rotates this each step.
  const springPointA = connectFirstPoint ?? { x: 0, y: 0 }
  const pAworld = localToWorld(springPointA, connectFirst)
  const jointPointA = { x: pAworld.x - connectFirst.position.x, y: pAworld.y - connectFirst.position.y }

  let c
  if (target) {
    const attach  = computeAttachPoint(target, aPos, attachMode)
    const pBworld = attach.world
    const dx = pBworld.x - pAworld.x, dy = pBworld.y - pAworld.y
    if (connectType === 'spring') {
      const pointB = attach.local
      c = Constraint.create({
        bodyA: connectFirst, pointA: springPointA,
        bodyB: target, pointB,
        length: Math.hypot(dx, dy),
        stiffness: 0,
        label: 'spring', render: { visible: false },
      })
      c._springK = SPRING_K
    } else {
      const pointB = { x: pBworld.x - target.position.x, y: pBworld.y - target.position.y }
      c = Constraint.create({
        bodyA: connectFirst, pointA: jointPointA,
        bodyB: target, pointB,
        length: Math.hypot(dx, dy),
        stiffness: 1, label: 'joint',
        render: { visible: false },
      })
    }
  } else {
    const dx = aPos.x - pAworld.x, dy = aPos.y - pAworld.y
    if (connectType === 'spring') {
      c = Constraint.create({
        bodyA: connectFirst, pointA: springPointA,
        pointB: { x: aPos.x, y: aPos.y },
        length: Math.hypot(dx, dy),
        stiffness: 0,
        label: 'spring', render: { visible: false },
      })
      c._springK = SPRING_K
    } else {
      c = Constraint.create({
        bodyA: connectFirst, pointA: jointPointA,
        pointB: { x: aPos.x, y: aPos.y },
        length: Math.hypot(dx, dy),
        stiffness: 1, label: 'joint',
        render: { visible: false },
      })
    }
  }

  if (c.label !== 'spring') Composite.add(engine.world, c)
  addConstraint(c)
  cancelConnectFirst()
  connectHint.textContent = '1つ目のオブジェクトをクリック'
}

function _placePin(body, worldPt) {
  const pointA = { x: worldPt.x - body.position.x, y: worldPt.y - body.position.y }
  const c = Constraint.create({
    bodyA: body, pointA,
    pointB: { x: worldPt.x, y: worldPt.y },
    length: 0, stiffness: 1, label: 'pin',
    render: { visible: false },
  })
  Composite.add(engine.world, c)
  addConstraint(c)
}

function handlePin(pos, isRightClick) {
  const aPos = gridSnapEnabled ? { x: snapToGrid(pos.x, pos.y).x, y: snapToGrid(pos.x, pos.y).y } : pos
  const all = Composite.allBodies(engine.world).filter(b => !b.isStatic)
  const hit = queryPointByZ(all, pos)
  if (hit.length === 0) { setPinMode(false); return }

  if (isRightClick) {
    const THRESH = 15 / camera.scale
    if (cycleLockPos && Math.hypot(pos.x - cycleLockPos.x, pos.y - cycleLockPos.y) < THRESH && cycleBodies.length > 1) {
      cycleIndex = (cycleIndex + 1) % cycleBodies.length
    } else {
      cycleBodies = hit; cycleIndex = 1 % hit.length
      cycleLockPos = { x: pos.x, y: pos.y }
    }
    cycleLockBody = cycleBodies[cycleIndex]
    pinHoverBody = cycleLockBody
    pinHoverPoint = computeAttachPoint(cycleLockBody, pos, attachMode)
    const n = cycleBodies.length
    connectHint.textContent = `${n}個重複 (${cycleIndex + 1}/${n}) — 右クリックで切替 / クリックで釘を打つ`
    return
  }

  const target = cycleLockBody ?? hit[0]
  if (!target) return

  pushUndo()
  if (!cycleLockBody && hit.length > 1) {
    // Multiple bodies, no lock: pin consecutive pairs together
    for (let i = 0; i < hit.length - 1; i++) {
      const bA = hit[i], bB = hit[i + 1]
      const c = Constraint.create({
        bodyA: bA, pointA: { x: aPos.x - bA.position.x, y: aPos.y - bA.position.y },
        bodyB: bB, pointB: { x: aPos.x - bB.position.x, y: aPos.y - bB.position.y },
        length: 0, stiffness: 1, label: 'pin',
        render: { visible: false },
      })
      Composite.add(engine.world, c)
      addConstraint(c)
    }
  } else {
    const attach = computeAttachPoint(target, aPos, attachMode)
    _placePin(target, attach.world)
  }
}

// ============================================================
// Mouse events
// ============================================================
Events.on(mouseConstraint, 'mousedown', (e) => {
  lastMouseButton = e.mouse.button
  const pos = e.mouse.position
  mouseDownPos = { x: pos.x, y: pos.y }

  if (spawnMode) {
    mouseConstraint.body = null
    mouse.button = -1
    spawnDrag = { x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y }
    return
  }

  if (pinMode) {
    mouseConstraint.body = null
    mouse.button = -1
    return
  }

  if (paused) {
    const targets = getTargets()
    for (const b of targets) {
      const vel = velocityBuffer.get(b) ?? { vx: 0, vy: 0 }
      const tx = b.position.x + vel.vx * VEL_SCALE
      const ty = b.position.y + vel.vy * VEL_SCALE
      if (Math.hypot(pos.x - tx, pos.y - ty) < VEL_TIP_RADIUS / camera.scale) {
        velDragging   = true
        velDragBodies = targets
        infoPanel.classList.add('hidden')
        mouseConstraint.body = null
        mouse.button = -1
        return
      }
    }
  }

  // Resize handle hit test
  if (selectedBody && !connectMode && !drawMode && !spawnMode && !pinMode) {
    const rHandles = getResizeHandles(selectedBody)
    const hitR = RESIZE_HANDLE_HIT_RADIUS / camera.scale
    for (const h of rHandles) {
      const wp = localToWorld(h.localPos, selectedBody)
      if (Math.hypot(pos.x - wp.x, pos.y - wp.y) < hitR) {
        pushUndo()
        resizeDragging        = true
        resizeDragHandle      = h
        resizeDragAnchorWorld = localToWorld(h.anchorLocal, selectedBody)
        resizeDragAngle       = selectedBody.angle
        mouseConstraint.body  = null
        mouse.button          = -1
        return
      }
    }
  }

  // Rotation handle hit test
  const _rhTargets = getTargets().filter(b => !b.isStatic)
  if (_rhTargets.length > 0 && !connectMode && !drawMode && !spawnMode && !pinMode) {
    const handle  = getRotateHandlePos(_rhTargets)
    const hitR    = HANDLE_HIT_RADIUS / camera.scale
    if (Math.hypot(pos.x - handle.x, pos.y - handle.y) < hitR) {
      pushUndo()
      rotateDragging        = true
      rotateDragCenter      = getRotateCenter(_rhTargets)
      rotateDragStartMAngle = Math.atan2(pos.y - rotateDragCenter.y, pos.x - rotateDragCenter.x)
      rotateDragStartStates.clear()
      _rhTargets.forEach(b => rotateDragStartStates.set(b, {
        angle: b.angle,
        dx: b.position.x - rotateDragCenter.x,
        dy: b.position.y - rotateDragCenter.y
      }))
      mouseConstraint.body = null
      mouse.button = -1
      return
    }
  }

  // Pause drag: grab body via Query.point (Runner is stopped, so mouseConstraint won't move it)
  if (paused && !connectMode && !drawMode) {
    const movable = Composite.allBodies(engine.world).filter(b => !b.isStatic)
    const hits = Query.point(movable, pos)
    if (hits.length > 0) {
      pauseDragBody   = hits[0]
      pauseDragOffset = { x: pauseDragBody.position.x - pos.x, y: pauseDragBody.position.y - pos.y }
      mouseConstraint.body = null
      mouse.button = -1
      return
    }
  }

  // Start rectangle select when clicking empty space (not in connect or draw mode)
  if (!connectMode && !drawMode) {
    const movable = Composite.allBodies(engine.world).filter(b => !b.isStatic)
    if (Query.point(movable, pos).length === 0) {
      rectSelect = { x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y }
    }
  }
})

Events.on(mouseConstraint, 'mousemove', (e) => {
  const _mvPos = e.mouse.position
  lastMouseWorldPos = { x: _mvPos.x, y: _mvPos.y }

  // Resize drag (circle only in this phase)
  if (resizeDragging && selectedBody && resizeDragHandle) {
    const mpos   = _mvPos
    const angle  = resizeDragAngle
    const anchor = resizeDragAnchorWorld
    const cos = Math.cos(angle), sin = Math.sin(angle)
    const vx = mpos.x - anchor.x, vy = mpos.y - anchor.y
    const vLocalX = vx * cos + vy * sin

    if (resizeDragHandle.id === 'e') {
      // Circle: anchor=left edge, handle=right edge, span=2r → new_r = vLocalX/2
      const new_r = Math.max(5, vLocalX / 2)
      resizeBody(selectedBody, new_r, new_r)
      Body.setPosition(selectedBody, { x: anchor.x + new_r * cos, y: anchor.y + new_r * sin })
      document.getElementById('s-radius').value = Math.round(new_r)
      document.getElementById('n-radius').value = Math.round(new_r)
    } else if (selectedBody.label === 'Rectangle Body') {
      // Rectangle: project onto body-local axes, keep anchor fixed
      const h = resizeDragHandle
      const vLocalY = -vx * sin + vy * cos
      let new_w = selectedBody._w ?? 50
      let new_h = selectedBody._h ?? 50
      let anchorNewLocalX = h.anchorLocal.x
      let anchorNewLocalY = h.anchorLocal.y
      if (h.resizeX) {
        const xDir = Math.sign(h.localPos.x)
        new_w = Math.max(10, xDir * vLocalX)
        anchorNewLocalX = -xDir * new_w / 2
      }
      if (h.resizeY) {
        const yDir = Math.sign(h.localPos.y)
        new_h = Math.max(10, yDir * vLocalY)
        anchorNewLocalY = -yDir * new_h / 2
      }
      // New center = anchor + rotate(-anchorNewLocal, angle)
      const offX = -anchorNewLocalX, offY = -anchorNewLocalY
      const newCx = anchor.x + offX * cos - offY * sin
      const newCy = anchor.y + offX * sin + offY * cos
      resizeBody(selectedBody, new_w, new_h)
      Body.setPosition(selectedBody, { x: newCx, y: newCy })
      document.getElementById('s-width').value  = Math.round(new_w)
      document.getElementById('n-width').value  = Math.round(new_w)
      document.getElementById('s-height').value = Math.round(new_h)
      document.getElementById('n-height').value = Math.round(new_h)
    }
    return
  }

  // Rotation drag: apply angle delta to all target bodies
  if (rotateDragging) {
    const currentAngle = Math.atan2(_mvPos.y - rotateDragCenter.y, _mvPos.x - rotateDragCenter.x)
    let delta = currentAngle - rotateDragStartMAngle
    if (e.mouse.sourceEvents?.mousemove?.shiftKey) {
      const snap = Math.PI / 12  // 15°
      delta = Math.round(delta / snap) * snap
    }
    const cos = Math.cos(delta), sin = Math.sin(delta)
    rotateDragStartStates.forEach((s, b) => {
      Body.setAngle(b, s.angle + delta)
      Body.setPosition(b, {
        x: rotateDragCenter.x + cos * s.dx - sin * s.dy,
        y: rotateDragCenter.y + sin * s.dx + cos * s.dy
      })
    })
    return
  }

  // Pause drag: move grabbed body and propagate delta to multi-select and bg constraints
  if (paused && pauseDragBody) {
    const pos     = e.mouse.position
    const { x: targetX, y: targetY } = snapToGrid(pos.x + pauseDragOffset.x, pos.y + pauseDragOffset.y)
    const dx = targetX - pauseDragBody.position.x
    const dy = targetY - pauseDragBody.position.y
    Body.setPosition(pauseDragBody, { x: targetX, y: targetY })
    if (selectedBodies.length > 1 && selectedBodies.includes(pauseDragBody)) {
      selectedBodies.forEach(b => {
        if (b === pauseDragBody || b.isStatic) return
        Body.setPosition(b, { x: b.position.x + dx, y: b.position.y + dy })
      })
    }
    selectedBgConstraints.forEach(({ c, fixedEnd }) => {
      if (fixedEnd === 'A') { c.pointA.x += dx; c.pointA.y += dy }
      else                  { c.pointB.x += dx; c.pointB.y += dy }
    })
    updateInfoPanel()
    return
  }

  // Hover detection for rotation handle
  const _hvTargets = getTargets().filter(b => !b.isStatic)
  if (_hvTargets.length > 0 && !connectMode && !drawMode && !spawnMode && !pinMode) {
    const handle = getRotateHandlePos(_hvTargets)
    const hitR   = HANDLE_HIT_RADIUS / camera.scale
    const hover  = Math.hypot(_mvPos.x - handle.x, _mvPos.y - handle.y) < hitR
    if (hover !== rotateHandleHover) {
      rotateHandleHover = hover
      render.canvas.style.cursor = hover ? 'crosshair' : ''
    }
  } else if (rotateHandleHover) {
    rotateHandleHover = false
    render.canvas.style.cursor = ''
  }

  // Hover detection for resize handles
  if (selectedBody && !connectMode && !drawMode && !spawnMode && !pinMode && !rotateDragging) {
    const rHandles = getResizeHandles(selectedBody)
    const hitR = RESIZE_HANDLE_HIT_RADIUS / camera.scale
    let found = null
    for (const h of rHandles) {
      const wp = localToWorld(h.localPos, selectedBody)
      if (Math.hypot(_mvPos.x - wp.x, _mvPos.y - wp.y) < hitR) { found = h.id; break }
    }
    if (found !== resizeHandleHover) {
      resizeHandleHover = found
      if (found) {
        render.canvas.style.cursor = getResizeCursor(selectedBody, found)
        rotateHandleHover = false
      } else if (!rotateHandleHover) {
        render.canvas.style.cursor = ''
      }
    }
  } else if (resizeHandleHover) {
    resizeHandleHover = null
    if (!rotateHandleHover) render.canvas.style.cursor = ''
  }

  if (velDragging && velDragBodies.length > 0) {
    const pos = e.mouse.position
    const ref = velDragBodies[0]
    const newVx = (pos.x - ref.position.x) / VEL_SCALE
    const newVy = (pos.y - ref.position.y) / VEL_SCALE
    velDragBodies.forEach(b => {
      const cur = velocityBuffer.get(b) ?? { av: 0 }
      velocityBuffer.set(b, { vx: newVx, vy: newVy, av: cur.av })
    })
    if (paused) updateInfoPanel()
  }
  if (drawMode) drawMousePos = { x: e.mouse.position.x, y: e.mouse.position.y }
  if (rectSelect) {
    rectSelect.x2 = e.mouse.position.x
    rectSelect.y2 = e.mouse.position.y
  }
  if (spawnDrag) {
    spawnDrag.x2 = e.mouse.position.x
    spawnDrag.y2 = e.mouse.position.y
  }
  if (connectMode || pinMode) {
    const movable = dynamicBodies()
    const mpos    = e.mouse.position
    const hit     = queryPointByZ(movable, mpos)

    // Release cycle lock when mouse leaves the locked body
    if (cycleLockBody && !Query.point([cycleLockBody], mpos).length) {
      cycleLockBody = null; cycleLockPos = null; cycleBodies = []; cycleIndex = 0
    }

    const hb = cycleLockBody ?? hit[0] ?? null
    const n  = hit.length

    if (connectMode) {
      connectHoverBody = hb
      if (!connectHoverBody) {
        connectHoverPoint = null
      } else if (attachMode === 'edge') {
        connectHoverPoint = findEdgePoint(connectHoverBody, mpos)
      } else if (attachMode === 'free') {
        connectHoverPoint = { local: worldToLocal(mpos, connectHoverBody), world: mpos }
      } else {
        connectHoverPoint = findSnapPoint(connectHoverBody, mpos)
      }
      if (!connectFirst) {
        if (cycleLockBody && cycleBodies.length > 1) {
          connectHint.textContent = `${cycleBodies.length}個重複 (${cycleIndex + 1}/${cycleBodies.length}) — 右クリックで切替 / クリックで選択`
        } else if (n > 1) {
          connectHint.textContent = `${n}個重複 — 右クリックで切替 / クリックで選択`
        } else {
          connectHint.textContent = '1つ目のオブジェクトをクリック'
        }
      } else {
        if (cycleLockBody && cycleBodies.length > 1) {
          connectHint.textContent = `${cycleBodies.length}個重複 (${cycleIndex + 1}/${cycleBodies.length}) — 右クリックで切替 / クリックで接続`
        } else if (n > 1) {
          connectHint.textContent = `${n}個重複 — 右クリックで切替 / クリックで接続`
        } else {
          connectHint.textContent = '2つ目またはキャンバスをクリック (Esc でキャンセル)'
        }
      }
    }

    if (pinMode) {
      pinHoverBody = cycleLockBody ?? hit[0] ?? null
      pinHoverPoint = pinHoverBody ? computeAttachPoint(pinHoverBody, mpos, attachMode) : null
      if (cycleLockBody && cycleBodies.length > 1) {
        connectHint.textContent = `${cycleBodies.length}個重複 (${cycleIndex + 1}/${cycleBodies.length}) — 右クリックで切替 / クリックで釘を打つ`
      } else if (n > 1) {
        connectHint.textContent = `${n}個重複 — 右クリックで切替 / クリックで釘を打つ`
      } else {
        connectHint.textContent = 'オブジェクトをクリックして釘を打つ'
      }
    }
  }
})

Events.on(mouseConstraint, 'mouseup', (e) => {
  if (pauseDragBody) {
    const wasDrag = mouseDownPos &&
      Math.hypot(e.mouse.position.x - mouseDownPos.x, e.mouse.position.y - mouseDownPos.y) > 5
    pauseDragBody   = null
    pauseDragOffset = { x: 0, y: 0 }
    if (wasDrag) return  // genuine drag: skip click/select logic
    // click (minimal movement): fall through to body selection below
  }
  if (resizeDragging) {
    resizeDragging = false
    resizeDragHandle = null
    resizeDragAnchorWorld = null
    resizeDragAngle = null
    render.canvas.style.cursor = ''
    return
  }
  if (rotateDragging) {
    rotateDragging = false
    rotateDragStartStates.clear()
    render.canvas.style.cursor = ''
    return
  }
  if (velDragging) {
    velDragging = false
    velDragBodies = []
    if (selectedBody || selectedBodies.length > 0 || selectedConstraint) {
      infoPanel.classList.remove('hidden')
    }
    return
  }
  if (!mouseDownPos) return
  const dx = e.mouse.position.x - mouseDownPos.x
  const dy = e.mouse.position.y - mouseDownPos.y
  mouseDownPos = null

  if (rectSelect) {
    const rs = rectSelect
    rectSelect = null
    const w = Math.abs(rs.x2 - rs.x1)
    const h = Math.abs(rs.y2 - rs.y1)
    if (w > 5 || h > 5) {
      const x = Math.min(rs.x1, rs.x2), y = Math.min(rs.y1, rs.y2)
      const rect = { min: { x, y }, max: { x: x + w, y: y + h } }
      const movable = Composite.allBodies(engine.world).filter(b => !b.isStatic)
      const found = Query.region(movable, rect)
      if (found.length === 1)      selectBody(found[0])
      else if (found.length > 1)   setMultiSelect(found)
      else                         clearAllSelection()
      if (found.length >= 1) selectedBgConstraints = captureBgConstraintsInRect(found, rect)
      return
    }
    // Tiny drag → treat as plain click below
  }

  if (wasPanning) { wasPanning = false; spawnDrag = null; return }

  if (spawnMode) {
    const sd = spawnDrag
    spawnDrag = null
    const sw = sd ? Math.abs(sd.x2 - sd.x1) : 0
    const sh = sd ? Math.abs(sd.y2 - sd.y1) : 0
    if (sw > 10 || sh > 10) {
      const { x: cx, y: cy } = snapToGrid((sd.x1 + sd.x2) / 2, (sd.y1 + sd.y2) / 2)
      spawnBodyFromRect(spawnMode, cx, cy, sw, sh)
    } else {
      const { x: sx, y: sy } = snapToGrid(e.mouse.position.x, e.mouse.position.y)
      spawnBody(spawnMode, sx, sy)
    }
    return
  }

  if (Math.sqrt(dx * dx + dy * dy) > 5) return

  if (drawMode) {
    const pos = e.mouse.position
    if (drawMode === 'tri-arb') {
      drawVertices.push({ x: pos.x, y: pos.y })
      if (drawVertices.length === 3) {
        finalizePolygon(drawVertices)
      } else {
        connectHint.textContent = `頂点${drawVertices.length + 1}をクリック (${3 - drawVertices.length}点残り)`
      }
      return
    }
    if (drawMode === 'polygon') {
      if (drawVertices.length >= 3) {
        const fp = drawVertices[0]
        if (Math.hypot(pos.x - fp.x, pos.y - fp.y) < CLOSE_DIST) {
          finalizePolygon(drawVertices)
          return
        }
      }
      if (drawVertices.length >= MAX_POLY_VERTS) {
        finalizePolygon(drawVertices)
        return
      }
      if (hasSelfIntersection(drawVertices, pos)) {
        connectHint.textContent = '自己交差する頂点は追加できません'
        return
      }
      drawVertices.push({ x: pos.x, y: pos.y })
      connectHint.textContent = `頂点${drawVertices.length}個 (Enterまたは始点で閉じる)`
      return
    }
  }

  if (pinMode) {
    handlePin(e.mouse.position, lastMouseButton === 2)
    return
  }

  if (connectMode) {
    handleConnect(e.mouse.position, lastMouseButton === 2)
    return
  }

  // クリック地点の全候補をリストアップ: ピン → ボディ → 接続（サイクル選択のため）
  const clickCandidates = []
  const pinHitRadius = 10 / camera.scale
  const movable = Composite.allBodies(engine.world).filter(b => !b.isStatic)
  const bodyZOrder = new Map(movable.map((b, i) => [b.id, i]))
  const constraintZ = c => Math.max(
    c.bodyA ? (bodyZOrder.get(c.bodyA.id) ?? -1) : -1,
    c.bodyB ? (bodyZOrder.get(c.bodyB.id) ?? -1) : -1
  )

  const pinHits = []
  pins.forEach(c => {
    const { pA, pB } = constraintWorldPoints(c)
    const dA = Math.hypot(e.mouse.position.x - pA.x, e.mouse.position.y - pA.y)
    const dB = c.bodyB ? Math.hypot(e.mouse.position.x - pB.x, e.mouse.position.y - pB.y) : Infinity
    if (dA < pinHitRadius || dB < pinHitRadius) pinHits.push(c)
  })
  pinHits.sort((a, b) => constraintZ(b) - constraintZ(a))
  pinHits.forEach(c => clickCandidates.push(c))

  const bodyHits = Query.point(movable, e.mouse.position)
  bodyHits.sort((a, b) => (bodyZOrder.get(b.id) ?? 0) - (bodyZOrder.get(a.id) ?? 0))
  bodyHits.forEach(b => clickCandidates.push(b))

  const connHits = []
  ;[...springs, ...joints].forEach(c => {
    const { pA, pB } = constraintWorldPoints(c)
    if (pointToSegmentDist(e.mouse.position.x, e.mouse.position.y, pA.x, pA.y, pB.x, pB.y) < 12) connHits.push(c)
  })
  connHits.sort((a, b) => constraintZ(b) - constraintZ(a))
  connHits.forEach(c => clickCandidates.push(c))

  if (clickCandidates.length === 0) { clearAllSelection(); return }

  // 現在の選択が候補に含まれていれば次へ、なければ先頭
  const current = selectedConstraint ?? selectedBody
  const curIdx = clickCandidates.indexOf(current)
  const next = clickCandidates[(curIdx >= 0 ? curIdx + 1 : 0) % clickCandidates.length]
  if (next.type === 'body') selectBody(next)
  else selectConstraint(next)
})

// ============================================================
// Keyboard shortcuts
// ============================================================
window.addEventListener('keydown', (e) => {
  if (e.target !== document.body) return

  if (e.code === 'Space') {
    e.preventDefault()
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault(); undo(); return
  }
  if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault(); redo(); return
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
    e.preventDefault(); copySelected(); return
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
    e.preventDefault(); const { x: _px, y: _py } = snapToGrid(lastMouseWorldPos.x, lastMouseWorldPos.y); pasteClipboard({ x: _px, y: _py }); return
  }
  if (e.key === 'g' || e.key === 'G') {
    gridSnapEnabled = !gridSnapEnabled
    document.getElementById('btn-grid-snap').classList.toggle('active', gridSnapEnabled)
  }
  if (e.key === 'c' || e.key === 'C') {
    setConnectMode(!connectMode)
  }
  if (e.key === 'p' || e.key === 'P') {
    setPinMode(!pinMode)
  }
  if (e.key === 'Escape') {
    if (spawnMode) { setSpawnMode(null); return }
    if (drawMode)  { setDrawMode(null); return }
    if (pinMode)   { setPinMode(false); return }
    if (connectFirst) { cancelConnectFirst(); connectHint.textContent = '1つ目のオブジェクトをクリック' }
    else setConnectMode(false)
  }
  if (e.key === 'Enter') {
    if (drawMode === 'polygon' && drawVertices.length >= 3) {
      finalizePolygon(drawVertices)
    }
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedConstraint) deleteSelectedConstraint()
    else if (getTargets().length > 0) deleteSelected()
  }
  if (e.key === 'f' && getTargets().length > 0) bringToFront(getTargets())
  if (e.key === 'b' && getTargets().length > 0) sendToBack(getTargets())
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    if (getTargets().length > 0) e.preventDefault()
    if (paused && getTargets().length > 0) {
      if (nudgePendingUndo) { pushUndo(); nudgePendingUndo = false }
      const step = e.shiftKey ? 10 : 1
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
      const dy = e.key === 'ArrowUp'   ? -step : e.key === 'ArrowDown'  ? step : 0
      getTargets().filter(b => !b.isStatic).forEach(b => {
        Body.setPosition(b, { x: b.position.x + dx, y: b.position.y + dy })
        Body.setVelocity(b, { x: 0, y: 0 })
      })
      updateInfoPanel()
    } else {
      arrowKeysDown.add(e.key)
    }
  }
})

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    togglePause()
  }
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    arrowKeysDown.delete(e.key)
    nudgePendingUndo = true
  }
})

// ============================================================
// Spring drawing
// ============================================================
function captureBgConstraintsInRect(foundBodies, rect) {
  const bodySet = new Set(foundBodies.map(b => b.id))
  const result = []
  allConstraints().forEach(c => {
    let fixedEnd = null, worldPt = null, bodyEnd = null
    if (!c.bodyA && c.bodyB) {
      fixedEnd = 'A'; worldPt = c.pointA; bodyEnd = c.bodyB
    } else if (c.bodyA && !c.bodyB) {
      fixedEnd = 'B'; worldPt = c.pointB; bodyEnd = c.bodyA
    }
    if (!fixedEnd || !bodySet.has(bodyEnd.id)) return
    if (worldPt.x >= rect.min.x && worldPt.x <= rect.max.x &&
        worldPt.y >= rect.min.y && worldPt.y <= rect.max.y) {
      result.push({ c, fixedEnd })
    }
  })
  return result
}

function localToWorld(localPt, body) {
  const cos = Math.cos(body.angle), sin = Math.sin(body.angle)
  return {
    x: body.position.x + localPt.x * cos - localPt.y * sin,
    y: body.position.y + localPt.x * sin + localPt.y * cos,
  }
}

function worldToLocal(worldPt, body) {
  const cos = Math.cos(body.angle), sin = Math.sin(body.angle)
  const dx = worldPt.x - body.position.x, dy = worldPt.y - body.position.y
  return { x: cos * dx + sin * dy, y: -sin * dx + cos * dy }
}

function constraintWorldPoints(c) {
  if (c.label === 'joint' || c.label === 'pin') {
    // Matter.js mutates pointA/pointB in-place each step via incremental rotation;
    // world position is simply body.position + current pointA (no extra rotation).
    return {
      pA: c.bodyA ? { x: c.bodyA.position.x + c.pointA.x, y: c.bodyA.position.y + c.pointA.y } : c.pointA,
      pB: c.bodyB ? { x: c.bodyB.position.x + c.pointB.x, y: c.bodyB.position.y + c.pointB.y } : c.pointB,
    }
  }
  return {
    pA: c.bodyA ? localToWorld(c.pointA, c.bodyA) : c.pointA,
    pB: c.bodyB ? localToWorld(c.pointB, c.bodyB) : c.pointB,
  }
}

function getSnapCandidates(body) {
  const center = { x: body.position.x, y: body.position.y }
  if (body.label === 'Circle Body') {
    const r = body.circleRadius
    return [center, ...Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2
      return { x: body.position.x + r * Math.cos(a), y: body.position.y + r * Math.sin(a) }
    })]
  }
  return [center, ...body.vertices.map(v => ({ x: v.x, y: v.y }))]
}

function getCachedSnap(body, cache) {
  if (cache && cache.body === body &&
      cache.x === body.position.x && cache.y === body.position.y) return cache
  return { body, x: body.position.x, y: body.position.y, candidates: getSnapCandidates(body) }
}

function findSnapPoint(body, pos, snapDist = 15 / camera.scale) {
  let nearest = null, nearestDist = snapDist
  getSnapCandidates(body).forEach(world => {
    const d = Math.hypot(pos.x - world.x, pos.y - world.y)
    if (d < nearestDist) { nearestDist = d; nearest = world }
  })
  return nearest ? { local: worldToLocal(nearest, body), world: nearest } : null
}

function findEdgePoint(body, pos) {
  if (body.label === 'Circle Body') {
    const dx = pos.x - body.position.x, dy = pos.y - body.position.y
    const len = Math.hypot(dx, dy) || 1
    const world = { x: body.position.x + (dx / len) * body.circleRadius, y: body.position.y + (dy / len) * body.circleRadius }
    return { local: worldToLocal(world, body), world }
  }
  const verts = body.vertices
  let bestDist = Infinity, bestPt = null
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i], b = verts[(i + 1) % verts.length]
    const abx = b.x - a.x, aby = b.y - a.y
    const abLen2 = abx * abx + aby * aby
    let t = abLen2 > 0 ? ((pos.x - a.x) * abx + (pos.y - a.y) * aby) / abLen2 : 0
    t = Math.max(0, Math.min(1, t))
    const px = a.x + t * abx, py = a.y + t * aby
    const d = Math.hypot(pos.x - px, pos.y - py)
    if (d < bestDist) { bestDist = d; bestPt = { x: px, y: py } }
  }
  return { local: worldToLocal(bestPt, body), world: bestPt }
}

function computeAttachPoint(body, pos, mode) {
  if (mode === 'snap') {
    const snap = findSnapPoint(body, pos)
    if (snap) return snap
    const world = { x: body.position.x, y: body.position.y }
    return { local: { x: 0, y: 0 }, world }
  }
  if (mode === 'edge') return findEdgePoint(body, pos)
  const local = worldToLocal(pos, body)
  return { local, world: pos }
}

function drawVelocityArrow(ctx, body, highlight = false) {
  const vel = velocityBuffer.get(body) ?? { vx: 0, vy: 0 }
  const vx = vel.vx * VEL_SCALE
  const vy = vel.vy * VEL_SCALE
  const cx = body.position.x, cy = body.position.y
  const tx = cx + vx, ty = cy + vy

  ctx.strokeStyle = highlight ? '#ffffff' : '#53d8fb'
  ctx.lineWidth   = highlight ? 2 : 1.5
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(tx, ty)
  ctx.stroke()

  const speed = Math.hypot(vx, vy)
  if (speed > 2) {
    const angle = Math.atan2(vy, vx)
    const headLen = 10
    ctx.fillStyle = highlight ? '#ffffff' : '#53d8fb'
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(tx - headLen * Math.cos(angle - 0.4), ty - headLen * Math.sin(angle - 0.4))
    ctx.lineTo(tx - headLen * Math.cos(angle + 0.4), ty - headLen * Math.sin(angle + 0.4))
    ctx.closePath()
    ctx.fill()
  }

  // 先端クリック判定用の円
  ctx.fillStyle   = 'rgba(0,0,0,0.25)'
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'
  ctx.lineWidth   = 1.5 / camera.scale
  ctx.beginPath()
  ctx.arc(tx, ty, VEL_TIP_RADIUS / camera.scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

function drawJointLine(ctx, pA, pB, isSelected = false) {
  ctx.strokeStyle = isSelected ? '#ffffff' : '#aaaaaa'
  ctx.lineWidth   = isSelected ? 3 : 2
  ctx.beginPath()
  ctx.moveTo(pA.x, pA.y)
  ctx.lineTo(pB.x, pB.y)
  ctx.stroke()

  ctx.fillStyle = isSelected ? '#ffffff' : '#aaaaaa'
  ;[pA, pB].forEach(p => {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 3 / camera.scale, 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawPinPoint(ctx, pt, isSelected = false) {
  const r = 6 / camera.scale
  const arm = r * 0.9
  ctx.strokeStyle = isSelected ? '#ffffff' : '#ffd700'
  ctx.fillStyle   = isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(255,215,0,0.15)'
  ctx.lineWidth   = 2 / camera.scale
  ctx.beginPath()
  ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(pt.x - arm, pt.y); ctx.lineTo(pt.x + arm, pt.y)
  ctx.moveTo(pt.x, pt.y - arm); ctx.lineTo(pt.x, pt.y + arm)
  ctx.stroke()
}

function drawSpringLine(ctx, pA, pB, isSelected = false) {
  const dx = pB.x - pA.x, dy = pB.y - pA.y
  const len = Math.hypot(dx, dy)
  if (len < 2) return

  const ux = dx / len, uy = dy / len
  const vx = -uy,     vy = ux
  const endLen = Math.min(12, len * 0.12)
  const screenLen = len * camera.scale
  const coils = screenLen < 20 ? 2 : screenLen < 50 ? 3 : screenLen < 100 ? 5 : 8
  const amp = 7

  ctx.strokeStyle = isSelected ? '#ffffff' : '#aaaaaa'
  ctx.lineWidth   = isSelected ? 2.5 : 1.5
  ctx.beginPath()
  ctx.moveTo(pA.x, pA.y)
  const sx = pA.x + ux * endLen, sy = pA.y + uy * endLen
  ctx.lineTo(sx, sy)
  const zigLen = len - 2 * endLen
  for (let i = 0; i <= coils * 2; i++) {
    const t = i / (coils * 2), side = (i % 2 === 0) ? amp : -amp
    ctx.lineTo(sx + ux * zigLen * t + vx * side, sy + uy * zigLen * t + vy * side)
  }
  ctx.lineTo(pB.x, pB.y)
  ctx.stroke()

  ctx.fillStyle = isSelected ? '#ffffff' : '#aaaaaa99'
  ;[pA, pB].forEach(p => {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 3 / camera.scale, 0, Math.PI * 2)
    ctx.fill()
  })
}

Events.on(render, 'afterRender', () => {
  const ctx = render.context

  // --- World-space drawing (camera transform applied) ---
  ctx.save()
  ctx.setTransform(camera.scale, 0, 0, camera.scale, camera.offsetX, camera.offsetY)

  // Grid snap overlay (drawn first, behind everything)
  if (gridSnapEnabled) {
    const minScreenSpacing = 20
    let gs = gridSize
    while (gs * camera.scale < minScreenSpacing) gs *= 2
    const b = render.bounds
    const x0 = Math.floor(b.min.x / gs) * gs
    const y0 = Math.floor(b.min.y / gs) * gs
    ctx.strokeStyle = 'rgba(180,180,180,0.18)'
    ctx.lineWidth = 1 / camera.scale
    ctx.beginPath()
    for (let x = x0; x <= b.max.x; x += gs) { ctx.moveTo(x, b.min.y); ctx.lineTo(x, b.max.y) }
    for (let y = y0; y <= b.max.y; y += gs) { ctx.moveTo(b.min.x, y); ctx.lineTo(b.max.x, y) }
    ctx.stroke()
  }

  // World boundary lines
  ctx.strokeStyle = 'rgba(100, 140, 220, 0.75)'
  ctx.lineWidth = 4 / camera.scale
  ctx.strokeRect(worldBounds.left, worldBounds.top, worldBounds.right - worldBounds.left, worldBounds.bottom - worldBounds.top)

  // Circle rotation indicator
  const vMin = render.bounds.min, vMax = render.bounds.max
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'
  ctx.lineWidth   = 1 / camera.scale
  dynamicBodies().forEach(b => {
    if (b.label !== 'Circle Body') return
    if (b.position.x + b.circleRadius < vMin.x || b.position.x - b.circleRadius > vMax.x ||
        b.position.y + b.circleRadius < vMin.y || b.position.y - b.circleRadius > vMax.y) return
    const ex = b.position.x + b.circleRadius * Math.cos(b.angle)
    const ey = b.position.y + b.circleRadius * Math.sin(b.angle)
    ctx.beginPath()
    ctx.moveTo(b.position.x, b.position.y)
    ctx.lineTo(ex, ey)
    ctx.stroke()
  })

  // Constraints
  springs.forEach(c => {
    const { pA, pB } = constraintWorldPoints(c)
    if (Math.min(pA.x, pB.x) > vMax.x || Math.max(pA.x, pB.x) < vMin.x ||
        Math.min(pA.y, pB.y) > vMax.y || Math.max(pA.y, pB.y) < vMin.y) return
    drawSpringLine(ctx, pA, pB, c === selectedConstraint)
  })
  joints.forEach(c => {
    const { pA, pB } = constraintWorldPoints(c)
    if (Math.min(pA.x, pB.x) > vMax.x || Math.max(pA.x, pB.x) < vMin.x ||
        Math.min(pA.y, pB.y) > vMax.y || Math.max(pA.y, pB.y) < vMin.y) return
    drawJointLine(ctx, pA, pB, c === selectedConstraint)
  })
  pins.forEach(c => {
    const { pA, pB } = constraintWorldPoints(c)
    if (pA.x > vMax.x || pA.x < vMin.x || pA.y > vMax.y || pA.y < vMin.y) return
    const isSel = c === selectedConstraint
    drawPinPoint(ctx, pA, isSel)
    if (c.bodyB) drawPinPoint(ctx, pB, isSel)
  })

  // Connect mode: snap point indicators
  if (connectMode) {
    if (connectHoverBody) {
      if (attachMode === 'snap') {
        _snapCacheConnect = getCachedSnap(connectHoverBody, _snapCacheConnect)
        _snapCacheConnect.candidates.forEach(world => {
          ctx.fillStyle = 'rgba(255,255,255,0.45)'
          ctx.beginPath()
          ctx.arc(world.x, world.y, 4 / camera.scale, 0, Math.PI * 2)
          ctx.fill()
        })
      }
      if (connectHoverPoint) {
        ctx.fillStyle   = '#ffffff'
        ctx.strokeStyle = '#444444'
        ctx.lineWidth   = 1.5 / camera.scale
        ctx.beginPath()
        ctx.arc(connectHoverPoint.world.x, connectHoverPoint.world.y, 6 / camera.scale, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
    }
    if (connectFirst) {
      const chosenWorld = connectFirstPoint
        ? localToWorld(connectFirstPoint, connectFirst)
        : connectFirst.position
      ctx.fillStyle   = '#ffffff'
      ctx.strokeStyle = '#444444'
      ctx.lineWidth   = 2 / camera.scale
      ctx.beginPath()
      ctx.arc(chosenWorld.x, chosenWorld.y, 7 / camera.scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }

  // Pin mode: hover preview
  if (pinMode && pinHoverBody) {
    if (attachMode === 'snap') {
      _snapCachePin = getCachedSnap(pinHoverBody, _snapCachePin)
      _snapCachePin.candidates.forEach(world => {
        ctx.fillStyle = 'rgba(255,215,0,0.5)'
        ctx.beginPath()
        ctx.arc(world.x, world.y, 4 / camera.scale, 0, Math.PI * 2)
        ctx.fill()
      })
    }
    if (pinHoverPoint) {
      ctx.strokeStyle = '#ffd700'
      ctx.fillStyle   = 'rgba(255,215,0,0.3)'
      ctx.lineWidth   = 2 / camera.scale
      ctx.beginPath()
      ctx.arc(pinHoverPoint.world.x, pinHoverPoint.world.y, 6 / camera.scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }

  // Rectangle selection (world-space coords)
  if (rectSelect) {
    const x = Math.min(rectSelect.x1, rectSelect.x2)
    const y = Math.min(rectSelect.y1, rectSelect.y2)
    const w = Math.abs(rectSelect.x2 - rectSelect.x1)
    const h = Math.abs(rectSelect.y2 - rectSelect.y1)
    ctx.strokeStyle = '#53d8fb'
    ctx.lineWidth   = 1 / camera.scale
    ctx.setLineDash([5 / camera.scale, 3 / camera.scale])
    ctx.strokeRect(x, y, w, h)
    ctx.fillStyle = 'rgba(83,216,251,0.06)'
    ctx.fillRect(x, y, w, h)
    ctx.setLineDash([])
  }

  // Spawn drag preview
  if (spawnDrag) {
    const sd = spawnDrag
    const x = Math.min(sd.x1, sd.x2)
    const y = Math.min(sd.y1, sd.y2)
    const w = Math.abs(sd.x2 - sd.x1)
    const h = Math.abs(sd.y2 - sd.y1)
    const cx = x + w / 2
    const cy = y + h / 2
    ctx.strokeStyle = '#ffcc00'
    ctx.lineWidth   = 1.5 / camera.scale
    ctx.setLineDash([5 / camera.scale, 3 / camera.scale])
    ctx.fillStyle   = 'rgba(255,204,0,0.08)'
    if (spawnMode === 'box') {
      ctx.strokeRect(x, y, w, h)
      ctx.fillRect(x, y, w, h)
    } else if (spawnMode === 'circle') {
      const r = Math.min(w, h) / 2
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else if (spawnMode === 'tri-eq') {
      const R = Math.min(w / 1.5, h / Math.sqrt(3))
      ctx.beginPath()
      for (let i = 0; i < 3; i++) {
        const a = i * 2 * Math.PI / 3
        const px = cx + R * Math.cos(a)
        const py = cy + R * Math.sin(a)
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    ctx.setLineDash([])
  }

  // Velocity arrows (paused only)
  if (paused) {
    const velTargets = showAllVelocities
      ? dynamicBodies()
      : getTargets()
    velTargets.forEach(b => drawVelocityArrow(ctx, b, selectedBody === b))
  }

  // Draw mode preview
  if (drawMode && (drawVertices.length > 0 || drawMousePos)) {
    const pts = drawMousePos && drawVertices.length > 0 ? [...drawVertices, drawMousePos] : drawVertices
    if (pts.length >= 2) {
      ctx.strokeStyle = '#a8ff78'
      ctx.lineWidth   = 1.5 / camera.scale
      ctx.setLineDash([5 / camera.scale, 3 / camera.scale])
      ctx.beginPath()
      pts.forEach((v, i) => i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y))
      ctx.stroke()
      ctx.setLineDash([])
    }
    drawVertices.forEach((v, i) => {
      ctx.fillStyle = i === 0 ? '#ffffff' : '#a8ff78'
      ctx.beginPath()
      ctx.arc(v.x, v.y, (i === 0 ? 5 : 3) / camera.scale, 0, Math.PI * 2)
      ctx.fill()
    })
    if (drawMode === 'polygon' && drawVertices.length >= 3) {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      ctx.lineWidth = 1 / camera.scale
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.arc(drawVertices[0].x, drawVertices[0].y, CLOSE_DIST / camera.scale, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  // Rotation handle
  const _rotTargets = getTargets().filter(b => !b.isStatic)
  if (_rotTargets.length > 0 && !connectMode && !drawMode && !spawnMode && !pinMode) {
    const handle   = getRotateHandlePos(_rotTargets)
    const bounds   = getUnionBounds(_rotTargets)
    const topCx    = (bounds.min.x + bounds.max.x) / 2
    const topCy    = handle.below ? bounds.max.y : bounds.min.y
    const active   = rotateHandleHover || rotateDragging
    const lineCol  = active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)'
    const fillCol  = active ? '#ffffff' : 'rgba(255,255,255,0.65)'
    const r        = HANDLE_RADIUS / camera.scale

    ctx.strokeStyle = lineCol
    ctx.lineWidth   = 1.5 / camera.scale
    ctx.setLineDash([4 / camera.scale, 3 / camera.scale])
    ctx.beginPath()
    ctx.moveTo(topCx, topCy)
    ctx.lineTo(handle.x, handle.y)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle   = fillCol
    ctx.strokeStyle = 'rgba(80,80,80,0.7)'
    ctx.lineWidth   = 1 / camera.scale
    ctx.beginPath()
    ctx.arc(handle.x, handle.y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Curved arrow icon inside handle
    const ir = r * 0.55
    ctx.strokeStyle = active ? '#333' : 'rgba(60,60,60,0.85)'
    ctx.lineWidth   = 1.2 / camera.scale
    ctx.beginPath()
    ctx.arc(handle.x, handle.y, ir, -Math.PI * 0.75, Math.PI * 0.5)
    ctx.stroke()
    const arrowTipAngle = Math.PI * 0.5
    const ax = handle.x + ir * Math.cos(arrowTipAngle)
    const ay = handle.y + ir * Math.sin(arrowTipAngle)
    const as = ir * 0.45
    ctx.beginPath()
    ctx.moveTo(ax - as * Math.cos(arrowTipAngle - Math.PI * 0.4), ay - as * Math.sin(arrowTipAngle - Math.PI * 0.4))
    ctx.lineTo(ax, ay)
    ctx.lineTo(ax - as * Math.cos(arrowTipAngle + Math.PI * 0.4), ay - as * Math.sin(arrowTipAngle + Math.PI * 0.4))
    ctx.stroke()
  }

  // Resize handles (single body selected, circle or rectangle only)
  if (selectedBody && !connectMode && !drawMode && !spawnMode && !pinMode) {
    const b = selectedBody
    if (!_resizeHandleCache ||
        _resizeHandleCache.body !== b ||
        _resizeHandleCache.x !== b.position.x ||
        _resizeHandleCache.y !== b.position.y ||
        _resizeHandleCache.angle !== b.angle) {
      const rHandles = getResizeHandles(b)
      _resizeHandleCache = {
        body: b, x: b.position.x, y: b.position.y, angle: b.angle,
        handles: rHandles.map(h => ({ ...h, wp: localToWorld(h.localPos, b) }))
      }
    }
    if (_resizeHandleCache.handles.length > 0) {
      const rs = RESIZE_HANDLE_RADIUS / camera.scale
      _resizeHandleCache.handles.forEach(h => {
        const active = resizeHandleHover === h.id
        ctx.fillStyle   = active ? '#ffffff' : 'rgba(255,255,255,0.75)'
        ctx.strokeStyle = active ? '#e94560' : 'rgba(233,69,96,0.7)'
        ctx.lineWidth   = 1.5 / camera.scale
        ctx.beginPath()
        ctx.rect(h.wp.x - rs, h.wp.y - rs, rs * 2, rs * 2)
        ctx.fill()
        ctx.stroke()
      })
    }
  }

  // Center of mass display
  if (showCOM && selectedBody) {
    const { x, y } = selectedBody.position
    const r = 8 / camera.scale
    ctx.strokeStyle = '#ff6b6b'
    ctx.lineWidth = 2 / camera.scale
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke()
    ctx.strokeStyle = 'rgba(255,107,107,0.6)'
    ctx.beginPath(); ctx.arc(x, y, r * 0.35, 0, Math.PI * 2); ctx.stroke()
  }

  ctx.restore()

  // --- Screen-space drawing (no camera transform) ---
  if (paused) {
    ctx.save()
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('⏸  一時停止中  —  Space または「再開」で再開', render.options.width / 2, 10)
    ctx.restore()
  }
})

// ============================================================
// Info panel update (single-select only)
// ============================================================
function getBodyType(b) {
  if (b.label === 'Circle Body')    return '円'
  if (b.label === 'Rectangle Body') return '四角'
  if (b.label === 'Polygon Body')   return '多角形'
  return b.label
}

function drawSpeedGraph() {
  const w = speedGraphCanvas.width, h = speedGraphCanvas.height
  speedGraphCtx.clearRect(0, 0, w, h)
  speedGraphCtx.fillStyle = 'rgba(0,0,0,0.3)'
  speedGraphCtx.fillRect(0, 0, w, h)
  if (speedBuffer.length < 2) return

  const max = Math.max(...speedBuffer, 1)
  speedGraphCtx.strokeStyle = '#53d8fb'
  speedGraphCtx.lineWidth = 1.5
  speedGraphCtx.beginPath()
  speedBuffer.forEach((v, i) => {
    const x = (i / (SPEED_HISTORY - 1)) * w
    const y = h - (v / max) * (h - 4) - 2
    i === 0 ? speedGraphCtx.moveTo(x, y) : speedGraphCtx.lineTo(x, y)
  })
  speedGraphCtx.stroke()
  speedGraphCtx.fillStyle = '#888'
  speedGraphCtx.font = '9px sans-serif'
  speedGraphCtx.fillText(`max ${fmt(max)} px/s`, 2, 10)
}

// Pause physics: springs off, joints on, velocity freeze
function jointReachable(from) {
  const visited = new Set([from])
  const queue = [from]
  while (queue.length) {
    const cur = queue.shift()
    joints.forEach(c => {
      const other = c.bodyA === cur ? c.bodyB : c.bodyB === cur ? c.bodyA : null
      if (other && !visited.has(other)) { visited.add(other); queue.push(other) }
    })
  }
  return visited
}

// Apply Hooke's law spring force each step (force-based, energy-conserving in Verlet)
Events.on(engine, 'beforeUpdate', () => {
  if (paused) return
  if (arrowKeysDown.size > 0) {
    let dx = 0, dy = 0
    if (arrowKeysDown.has('ArrowLeft'))  dx -= 1
    if (arrowKeysDown.has('ArrowRight')) dx += 1
    if (arrowKeysDown.has('ArrowUp'))    dy -= 1
    if (arrowKeysDown.has('ArrowDown'))  dy += 1
    const len = Math.hypot(dx, dy)
    if (len > 0) {
      dx /= len; dy /= len
      getTargets().forEach(b => {
        if (!b.isStatic)
          Body.applyForce(b, b.position, { x: dx * ARROW_ACCEL * b.mass, y: dy * ARROW_ACCEL * b.mass })
      })
    }
  }
  springs.forEach(c => {
    const { pA, pB } = constraintWorldPoints(c)
    const dx = pB.x - pA.x, dy = pB.y - pA.y
    const dist = Math.hypot(dx, dy)
    if (dist < 0.001) return
    const k = c._springK ?? SPRING_K
    const fx = k * (dist - c.length) * dx / dist
    const fy = k * (dist - c.length) * dy / dist
    if (c.bodyA && !c.bodyA.isStatic) Body.applyForce(c.bodyA, pA, { x: fx, y: fy })
    if (c.bodyB && !c.bodyB.isStatic) Body.applyForce(c.bodyB, pB, { x: -fx, y: -fy })
  })
  pins.forEach(c => {
    if (!c._motorActive || !c.bodyA) return
    const bodyA = c.bodyA
    const bodyB = c.bodyB
    const dir = c._motorDir ?? 1
    const maxSpd = c._motorSpeed ?? 2.0
    const torq = c._motorTorque ?? 0.05
    if (!bodyB || bodyB.isStatic) {
      bodyA.torque += torq * dir
      if (Math.abs(bodyA.angularVelocity) > maxSpd && Math.sign(bodyA.angularVelocity) === dir) {
        Body.setAngularVelocity(bodyA, maxSpd * dir)
      }
    } else {
      bodyA.torque += torq * dir
      bodyB.torque -= torq * dir
      const relAngVel = bodyA.angularVelocity - bodyB.angularVelocity
      if (Math.abs(relAngVel) > maxSpd && Math.sign(relAngVel) === dir) {
        Body.setAngularVelocity(bodyA, bodyB.angularVelocity + maxSpd * dir)
      }
    }
  })

  // Grid snap: force dragged body to grid position each physics step
  if (gridSnapEnabled && mouseConstraint.body && !mouseConstraint.body.isStatic) {
    const b = mouseConstraint.body
    Body.setPosition(b, snapToGrid(b.position.x, b.position.y))
  }
})

Events.on(engine, 'afterUpdate', () => {
  if (paused) {
    dynamicBodies().forEach(b => {
      Body.setVelocity(b, { x: 0, y: 0 })
      Body.setAngularVelocity(b, 0)
    })
  }

  if (!paused || mouseConstraint.body) updateInfoPanel()
})

// ============================================================
// Panel controls
// ============================================================
document.getElementById('panel-close').addEventListener('click', clearAllSelection)

document.getElementById('panel-delete').addEventListener('click', () => {
  if (selectedConstraint) deleteSelectedConstraint()
  else deleteSelected()
})

document.getElementById('s-mass').addEventListener('input', (e) => {
  const val = parseFloat(e.target.value)
  getTargets().forEach(b => Body.setMass(b, val))
  document.getElementById('v-mass').textContent = fmt(val)
  updateInfoPanel()
})
document.getElementById('s-restitution').addEventListener('input', (e) => {
  const val = parseFloat(e.target.value)
  getTargets().forEach(b => { b.restitution = val })
  document.getElementById('v-restitution').textContent = fmt(val)
  updateInfoPanel()
})
document.getElementById('s-friction').addEventListener('input', (e) => {
  const val = parseFloat(e.target.value)
  getTargets().forEach(b => { b.friction = val })
  document.getElementById('v-friction').textContent = fmt(val)
  updateInfoPanel()
})
document.getElementById('s-frictionair').addEventListener('input', (e) => {
  const val = parseFloat(e.target.value)
  getTargets().forEach(b => { b.frictionAir = val })
  document.getElementById('v-frictionair').textContent = fmt(val, 3)
  updateInfoPanel()
})
document.getElementById('p-collision').addEventListener('change', e => {
  const filter = e.target.checked ? FILTER_BODY : FILTER_GHOST
  getTargets().forEach(b => { b.collisionFilter = { ...filter } })
  updateInfoPanel()
})
document.getElementById('p-rot-lock').addEventListener('change', e => {
  if (!selectedBody) return
  if (paused) {
    const buf = pauseRotBuffer.get(selectedBody)
    if (e.target.checked) {
      if (buf) buf.wasLocked = true
      selectedBody._rotLocked   = true
      selectedBody._origInertia = buf?.origInertia ?? selectedBody.inertia
      Body.setInertia(selectedBody, Infinity)
      Body.setAngularVelocity(selectedBody, 0)
    } else {
      if (buf) buf.wasLocked = false
      selectedBody._rotLocked = false
      const restoreInertia = buf?.origInertia ?? selectedBody._origInertia
      if (restoreInertia != null) Body.setInertia(selectedBody, restoreInertia)
    }
    return
  }
  if (e.target.checked) {
    selectedBody._origInertia = selectedBody.inertia
    selectedBody._rotLocked = true
    Body.setInertia(selectedBody, Infinity)
    Body.setAngularVelocity(selectedBody, 0)
  } else {
    selectedBody._rotLocked = false
    if (selectedBody._origInertia != null) Body.setInertia(selectedBody, selectedBody._origInertia)
  }
})
document.getElementById('p-show-com').addEventListener('change', e => {
  showCOM = e.target.checked
})

document.getElementById('s-radius').addEventListener('input', (e) => {
  if (!selectedBody) return
  const val = parseInt(e.target.value)
  document.getElementById('n-radius').value = val
  resizeBody(selectedBody, val, val)
})
document.getElementById('n-radius').addEventListener('change', (e) => {
  if (!selectedBody) return
  const val = Math.min(150, Math.max(5, parseInt(e.target.value) || 5))
  e.target.value = val
  document.getElementById('s-radius').value = val
  resizeBody(selectedBody, val, val)
})

document.getElementById('s-width').addEventListener('input', (e) => {
  if (!selectedBody) return
  const val = parseInt(e.target.value)
  document.getElementById('n-width').value = val
  resizeBody(selectedBody, val, selectedBody._h ?? val)
})
document.getElementById('n-width').addEventListener('change', (e) => {
  if (!selectedBody) return
  const val = Math.min(300, Math.max(5, parseInt(e.target.value) || 5))
  e.target.value = val
  document.getElementById('s-width').value = val
  resizeBody(selectedBody, val, selectedBody._h ?? val)
})

document.getElementById('s-height').addEventListener('input', (e) => {
  if (!selectedBody) return
  const val = parseInt(e.target.value)
  document.getElementById('n-height').value = val
  resizeBody(selectedBody, selectedBody._w ?? val, val)
})
document.getElementById('n-height').addEventListener('change', (e) => {
  if (!selectedBody) return
  const val = Math.min(300, Math.max(5, parseInt(e.target.value) || 5))
  e.target.value = val
  document.getElementById('s-height').value = val
  resizeBody(selectedBody, selectedBody._w ?? val, val)
})

document.getElementById('s-springk').addEventListener('input', (e) => {
  if (!selectedConstraint) return
  const val = parseFloat(e.target.value)
  selectedConstraint._springK = val
  document.getElementById('v-springk').textContent = val.toFixed(5)
})
document.getElementById('s-springlen').addEventListener('input', (e) => {
  if (!selectedConstraint) return
  const val = parseFloat(e.target.value)
  selectedConstraint.length = val
  document.getElementById('v-springlen').textContent = val + ' px'
})
document.getElementById('s-jointstiff').addEventListener('input', (e) => {
  if (!selectedConstraint) return
  const val = parseFloat(e.target.value)
  selectedConstraint.stiffness = val
  document.getElementById('v-jointstiff').textContent = val.toFixed(2)
})
document.getElementById('c-motor-active').addEventListener('change', (e) => {
  if (!selectedConstraint || selectedConstraint.label !== 'pin') return
  selectedConstraint._motorActive = e.target.checked
})
document.getElementById('s-motor-speed').addEventListener('input', (e) => {
  if (!selectedConstraint || selectedConstraint.label !== 'pin') return
  const val = parseFloat(e.target.value)
  selectedConstraint._motorSpeed = val
  document.getElementById('v-motor-speed').textContent = val.toFixed(1)
})
document.querySelectorAll('input[name="motor-dir"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    if (!selectedConstraint || selectedConstraint.label !== 'pin') return
    selectedConstraint._motorDir = parseInt(e.target.value)
  })
})
document.getElementById('s-motor-torque').addEventListener('input', (e) => {
  if (!selectedConstraint || selectedConstraint.label !== 'pin') return
  const val = parseFloat(e.target.value)
  selectedConstraint._motorTorque = val
  document.getElementById('v-motor-torque').textContent = val.toFixed(3)
})

// ============================================================
// Gravity
// ============================================================
const gravitySlider = document.getElementById('gravity-slider')
const gravityVal    = document.getElementById('gravity-val')
gravitySlider.addEventListener('input', () => {
  const v = parseFloat(gravitySlider.value)
  engine.gravity.y = v
  gravityVal.textContent = v.toFixed(2)
})
gravitySlider.addEventListener('pointerdown', pushUndo)

// ============================================================
// Add / Reset
// ============================================================
const colors = ['#e94560', '#e2b96f', '#53d8fb', '#a8ff78', '#ff9a9e', '#c084fc']
let colorIndex = 0
function nextColor() { return colors[colorIndex++ % colors.length] }

document.getElementById('add-circle').addEventListener('click', () => setSpawnMode('circle'))
document.getElementById('add-box').addEventListener('click',    () => setSpawnMode('box'))

document.getElementById('btn-snapshot').addEventListener('click', () => {
  savedSnapshot = captureSnapshot()
  const btn = document.getElementById('btn-snapshot')
  btn.classList.add('active')
  btn.textContent = '✓ 保存!'
  setTimeout(() => {
    btn.classList.remove('active')
    btn.textContent = '💾 保存'
  }, 2000)
})

document.getElementById('reset').addEventListener('click', () => {
  pushUndo()
  if (savedSnapshot) {
    restoreSnapshot(savedSnapshot)
    return
  }
  if (drawMode) setDrawMode(null)
  if (paused) togglePause()
  showAllVelocities = false
  document.getElementById('btn-show-vel').classList.remove('active')
  velDragging = false; velDragBodies = []
  velocityBuffer.clear()
  setConnectMode(false)
  clearAllSelection()
  rectSelect = null
  clearConstraints()
  Composite.clear(engine.world)
  boundaries = createBoundaries()
  Composite.add(engine.world, boundaries)
  Composite.add(engine.world, mouseConstraint)
  colorIndex = 0
  engine.gravity.y = 1
  gravitySlider.value = 1
  gravityVal.textContent = '1.00'
  if (!paused) togglePause()
  applyCamera()
})

document.getElementById('btn-reset-view').addEventListener('click', () => {
  const cw = render.options.width
  const ch = render.options.height
  const ww = worldBounds.right  - worldBounds.left
  const wh = worldBounds.bottom - worldBounds.top
  const padding = 24
  const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE,
    Math.min((cw - padding * 2) / ww, (ch - padding * 2) / wh)
  ))
  camera.scale   = s
  camera.offsetX = (cw - ww * s) / 2 - worldBounds.left * s
  camera.offsetY = (ch - wh * s) / 2 - worldBounds.top  * s
  applyCamera()
})

// ============================================================
// World size controls
// ============================================================
const worldWidthSlider  = document.getElementById('world-width-slider')
const worldWidthNum     = document.getElementById('world-width-num')
const worldHeightSlider = document.getElementById('world-height-slider')
const worldHeightNum    = document.getElementById('world-height-num')

worldWidthSlider.value  = worldBounds.right
worldWidthNum.value     = worldBounds.right
worldHeightSlider.value = worldBounds.bottom
worldHeightNum.value    = worldBounds.bottom

function applyWorldSize(newW, newH) {
  newW = Math.max(200, Math.min(3000, Math.round(newW / 50) * 50))
  newH = Math.max(200, Math.min(2000, Math.round(newH / 50) * 50))
  worldBounds.right  = newW
  worldBounds.bottom = newH
  worldWidthSlider.value  = newW
  worldWidthNum.value     = newW
  worldHeightSlider.value = newH
  worldHeightNum.value    = newH
  rebuildBoundaries()
}

worldWidthSlider.addEventListener('input', () => {
  worldWidthNum.value = worldWidthSlider.value
  applyWorldSize(+worldWidthSlider.value, +worldHeightSlider.value)
})
worldWidthNum.addEventListener('change', () => {
  applyWorldSize(+worldWidthNum.value, +worldHeightNum.value)
})
worldHeightSlider.addEventListener('input', () => {
  worldHeightNum.value = worldHeightSlider.value
  applyWorldSize(+worldWidthSlider.value, +worldHeightSlider.value)
})
worldHeightNum.addEventListener('change', () => {
  applyWorldSize(+worldWidthNum.value, +worldHeightNum.value)
})
worldWidthSlider.addEventListener('pointerdown', pushUndo)
worldHeightSlider.addEventListener('pointerdown', pushUndo)

// Undo hook: property and size sliders in the info panel
;[
  's-mass', 's-restitution', 's-friction', 's-frictionair',
  's-radius', 's-width', 's-height',
  's-springk', 's-springlen', 's-jointstiff',
  's-motor-speed', 's-motor-torque',
].forEach(id => {
  document.getElementById(id)?.addEventListener('pointerdown', pushUndo)
})

// ============================================================
// Resize  (ticket 10)
// ============================================================
window.addEventListener('resize', () => {
  const { width: w, height: h } = getCanvasSize()
  render.canvas.width  = w
  render.canvas.height = h
  render.options.width  = w
  render.options.height = h
  clampCamera()
  applyCamera()
})

// ============================================================
// Settings popover
// ============================================================
document.getElementById('btn-settings').addEventListener('click', e => {
  e.stopPropagation()
  document.getElementById('settings-panel').classList.toggle('open')
})
document.addEventListener('click', e => {
  if (!document.getElementById('settings-wrap').contains(e.target)) {
    document.getElementById('settings-panel').classList.remove('open')
  }
  if (spawnMode && !document.getElementById('spawn-wrap').contains(e.target) && !canvas.contains(e.target)) {
    setSpawnMode(null)
  }
  if ((drawMode === 'tri-arb' || drawMode === 'polygon') && !document.getElementById('spawn-wrap').contains(e.target) && !canvas.contains(e.target)) {
    setDrawMode(null)
  }
})

// ============================================================
// Start
// ============================================================
Render.run(render)
const runner = Runner.create()
Runner.run(runner, engine)
applyCamera()
togglePause()
