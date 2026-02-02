/* Page: Game Design Portal (Visualizer)
   Isolated: only #gdv-* and .gdv-*.
*/
(() => {
  "use strict";

  /* ===== Utilities ===== */
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const uid = () => Math.random().toString(16).slice(2, 10);
  const snap = (v, step = 16) => Math.round(v / step) * step;

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function toast(msg) {
    const t = $("gdv-toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 900);
  }

  /* ===== Templates ===== */
  const TEMPLATE_ITEMS = [
    { type: "Game Blueprint", title: "Topdown Tower Defence", stage: "Design", tags: "td,topdown,systems", color: "purple",
      cfg: { genre: "tower-defence", camera: "topdown", input: "mouse+keys", scope: "prototype", engine: "unreal" } },

    { type: "Game Blueprint", title: "Isometric RPG Arena", stage: "Design", tags: "rpg,isometric", color: "purple",
      cfg: { genre: "arena-rpg", camera: "isometric", input: "controller+kbm", scope: "vertical-slice", engine: "unreal" } },

    { type: "System Module", title: "Waves + Spawner", stage: "Generate", tags: "spawning,waves", color: "accent",
      cfg: { data: "waves.json", spawnRules: "curves", bossEvery: 5 } },

    { type: "System Module", title: "Towers / Weapons", stage: "Generate", tags: "combat,upgrades", color: "accent",
      cfg: { data: "towers.json", targeting: ["closest", "strongest", "aoe"], upgrades: "tree" } },

    { type: "System Module", title: "Enemy Library", stage: "Generate", tags: "ai,enemies", color: "accent",
      cfg: { data: "enemies.json", behaviors: ["rush", "tank", "split", "stealth"], resist: ["fire", "ice", "shock"] } },

    { type: "Content Gen", title: "Level Generator", stage: "Generate", tags: "levels,procedural", color: "good",
      cfg: { seed: 1337, rules: "rooms+lanes", export: "maps/" } },

    { type: "Validation", title: "Asset Validator", stage: "Validate", tags: "lint,refs", color: "warn",
      cfg: { checks: ["missing_refs", "naming", "collisions", "empty_maps"], output: "reports/validate.json" } },

    { type: "Build", title: "Compile (UBT)", stage: "Build", tags: "ubt,compile", color: "good",
      cfg: { target: "GameEditor", config: "Development", platform: "Win64" } },

    { type: "Cook/Package", title: "BuildCookRun (UAT)", stage: "Package", tags: "uat,package", color: "good",
      cfg: { platform: "Win64", config: "Shipping", cook: true, pak: true, stage: true, archive: true } },

    { type: "Test", title: "Smoke Test Map", stage: "Test", tags: "qa,smoke", color: "warn",
      cfg: { map: "/Game/Maps/Benchmark", bots: 50, durationSec: 120, output: "reports/smoke.json" } },

    { type: "Publish", title: "Publish Artifact", stage: "Publish", tags: "zip,release", color: "accent",
      cfg: { channel: "internal", dest: "artifacts/", version: "0.1.0" } },

    { type: "Ops", title: "Cache Warmup", stage: "Ops", tags: "ddc,cache", color: "muted",
      cfg: { ddc: "shared", preCook: true } }
  ];

  const NAV = {
    blueprints: [TEMPLATE_ITEMS[0], TEMPLATE_ITEMS[1]],
    prod: [
      TEMPLATE_ITEMS[2], TEMPLATE_ITEMS[3], TEMPLATE_ITEMS[4],
      TEMPLATE_ITEMS[5], TEMPLATE_ITEMS[6],
      TEMPLATE_ITEMS[7], TEMPLATE_ITEMS[8],
      TEMPLATE_ITEMS[9], TEMPLATE_ITEMS[10], TEMPLATE_ITEMS[11]
    ],
    targets: [
      { type: "Target", title: "Windows (Win64)", stage: "Build", tags: "desktop", color: "good", cfg: { platform: "Win64" } },
      { type: "Target", title: "Linux", stage: "Build", tags: "desktop", color: "good", cfg: { platform: "Linux" } },
      { type: "Target", title: "Steam Deck", stage: "Build", tags: "handheld", color: "warn", cfg: { platform: "Linux", preset: "steamdeck" } },
      { type: "Target", title: "Cloud Demo", stage: "Publish", tags: "stream", color: "accent", cfg: { type: "webrtc", maxUsers: 5 } }
    ]
  };

  function makeNavItem(t, container) {
    const el = document.createElement("div");
    el.className = "gdv-item";
    el.draggable = true;
    el.dataset.payload = JSON.stringify(t);

    const b = document.createElement("span");
    b.className = "gdv-badge";
    if (t.color && t.color !== "accent") b.classList.add(t.color);

    const txt = document.createElement("div");
    txt.innerHTML = `<strong>${escapeHtml(t.title)}</strong><div class="gdv-muted" style="font-size:12px">${escapeHtml(t.type)} • ${escapeHtml(t.stage)}</div>`;

    const meta = document.createElement("div");
    meta.className = "gdv-meta";
    meta.textContent = (t.tags || "").split(",")[0] || "";

    el.append(b, txt, meta);
    container.appendChild(el);

    el.addEventListener("dragstart", (ev) => {
      ev.dataTransfer.setData("text/plain", el.dataset.payload);
    });
  }

  // Populate Navigator
  NAV.blueprints.forEach(t => makeNavItem(t, $("gdv-blueprints")));
  NAV.prod.forEach(t => makeNavItem(t, $("gdv-prodNodes")));
  NAV.targets.forEach(t => makeNavItem(t, $("gdv-targets")));

  /* ===== Add Menu ===== */
  const addMenu = $("gdv-addMenu");
  const tplGrid = $("gdv-tplGrid");
  function closeMenu() { addMenu.classList.remove("open"); }

  $("gdv-btnAdd").addEventListener("click", () => {
    addMenu.classList.toggle("open");
  });

  document.addEventListener("mousedown", (e) => {
    if (!addMenu.classList.contains("open")) return;
    const inside = addMenu.contains(e.target) || $("gdv-btnAdd").contains(e.target);
    if (!inside) closeMenu();
  });

  /* ===== Canvas state ===== */
  const viewport = $("gdv-viewport");
  const wiresSvg = $("gdv-wires");
  const canvasWrap = $("gdv-canvasWrap");

  const state = {
    nodes: new Map(),   // id -> nodeData
    wires: [],          // {from:{id,port}, to:{id,port}}
    selectedId: null,
    pan: { x: 0, y: 0 },
    zoom: 1,
    isPanning: false,
    panStart: null,
    connectFrom: null,
    _lastPointerWorld: null
  };

  function updateHUD() {
    $("gdv-chipZoom").textContent = `Zoom ${Math.round(state.zoom * 100)}%`;
    $("gdv-chipPan").textContent = `Pan (${Math.round(state.pan.x)}, ${Math.round(state.pan.y)})`;
    $("gdv-stats").textContent = `${state.nodes.size} nodes • ${state.wires.length} wires`;
  }

  function applyTransform() {
    viewport.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`;
    canvasWrap.style.backgroundPosition =
      `${state.pan.x}px ${state.pan.y}px, ${state.pan.x}px ${state.pan.y}px, ${state.pan.x}px ${state.pan.y}px, ${state.pan.x}px ${state.pan.y}px`;
    drawWires();
    updateHUD();
  }

  function screenToWorld(sx, sy) {
    return {
      x: (sx - state.pan.x) / state.zoom,
      y: (sy - state.pan.y) / state.zoom
    };
  }

  function worldToScreen(wx, wy) {
    return {
      x: wx * state.zoom + state.pan.x,
      y: wy * state.zoom + state.pan.y
    };
  }

  /* ===== Node creation / rendering ===== */
  function createNodeFromTemplate(tpl, x, y) {
    const id = uid();
    const node = {
      id,
      type: tpl.type,
      title: tpl.title,
      stage: tpl.stage || "Design",
      tags: tpl.tags || "",
      cfg: JSON.parse(JSON.stringify(tpl.cfg || {})),
      x: snap(x), y: snap(y),
      w: 290
    };
    state.nodes.set(id, node);
    renderNode(node);
    selectNode(id);
    drawWires();
    updateHUD();
    return id;
  }

  function renderNode(node) {
    const el = document.createElement("div");
    el.className = "gdv-node";
    el.dataset.id = node.id;
    el.style.left = node.x + "px";
    el.style.top = node.y + "px";
    el.style.width = node.w + "px";

    const stagePill = escapeHtml(node.stage || "Design");

    el.innerHTML = `
      <div class="gdv-nodeHeader">
        <span class="gdv-nodeType">${escapeHtml(node.type)}</span>
        <span class="gdv-nodeTitle">${escapeHtml(node.title)}</span>
        <span class="gdv-nodeType">${stagePill}</span>
        <div class="gdv-nodeTools">
          <button class="gdv-iconBtn" data-act="wire" title="Start wire (OUT)">⟶</button>
          <button class="gdv-iconBtn" data-act="dup" title="Duplicate">⎘</button>
          <button class="gdv-iconBtn" data-act="del" title="Delete">✕</button>
        </div>
      </div>

      <div class="gdv-nodeBody">
        <div class="gdv-kv">
          <div>
            <div class="gdv-k">Tags</div>
            <div class="gdv-v">${escapeHtml(node.tags || "")}</div>
          </div>
          <div>
            <div class="gdv-k">Config keys</div>
            <div class="gdv-v">${Object.keys(node.cfg || {}).length}</div>
          </div>
        </div>

        <div class="gdv-ports">
          <div class="gdv-port" data-port="in">
            <span class="gdv-portDot"></span>
            <span>IN</span>
          </div>
          <div class="gdv-port" data-port="out">
            <span class="gdv-portDot out"></span>
            <span>OUT</span>
          </div>
          <div class="gdv-muted" style="margin-left:auto;font-size:12px">drag • connect</div>
        </div>
      </div>
    `;

    viewport.appendChild(el);

    // Select on click
    el.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      const btn = e.target.closest("button");
      const port = e.target.closest(".gdv-port");
      if (btn || port) return;
      selectNode(node.id);
    });

    // Tools
    el.querySelectorAll("button").forEach(b => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === "del") deleteNode(node.id);
        if (act === "dup") duplicateNode(node.id);
        if (act === "wire") beginWireFrom(node.id);
      });
    });

    // Ports wiring
    el.querySelectorAll(".gdv-port").forEach(p => {
      p.addEventListener("click", (e) => {
        e.stopPropagation();
        const port = p.dataset.port;
        if (port === "out") beginWireFrom(node.id);
        else tryCompleteWireTo(node.id);
      });
    });

    // Dragging node by header
    const header = el.querySelector(".gdv-nodeHeader");
    header.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      if (e.target.closest("button")) return;

      selectNode(node.id);

      const start = { mx: e.clientX, my: e.clientY, nx: node.x, ny: node.y };
      const onMove = (ev) => {
        const dx = (ev.clientX - start.mx) / state.zoom;
        const dy = (ev.clientY - start.my) / state.zoom;
        node.x = snap(start.nx + dx);
        node.y = snap(start.ny + dy);
        el.style.left = node.x + "px";
        el.style.top = node.y + "px";
        drawWires();
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  }

  function getNodeEl(id) {
    return viewport.querySelector(`.gdv-node[data-id="${id}"]`);
  }

  function selectNode(id) {
    state.selectedId = id;
    viewport.querySelectorAll(".gdv-node").forEach(n => n.classList.remove("selected"));
    const el = getNodeEl(id);
    if (el) el.classList.add("selected");
    fillInspector();
  }

  function deleteNode(id) {
    state.wires = state.wires.filter(w => w.from.id !== id && w.to.id !== id);
    state.nodes.delete(id);
    const el = getNodeEl(id);
    if (el) el.remove();
    if (state.selectedId === id) state.selectedId = null;
    drawWires();
    fillInspector();
    updateHUD();
  }

  function duplicateNode(id) {
    const n = state.nodes.get(id);
    if (!n) return;
    const tpl = { type: n.type, title: n.title + " (Copy)", stage: n.stage, tags: n.tags, cfg: n.cfg };
    createNodeFromTemplate(tpl, n.x + 40, n.y + 40);
  }

  /* ===== Wiring ===== */
  function beginWireFrom(id) {
    const el = getNodeEl(id);
    if (!el) return;
    selectNode(id);

    const outPos = getPortWorldPos(id, "out");
    state.connectFrom = { id, port: "out", x: outPos.x, y: outPos.y };
    drawWires();
  }

  function tryCompleteWireTo(targetId) {
    if (!state.connectFrom) return;
    if (state.connectFrom.id === targetId) return;

    state.wires.push({
      from: { id: state.connectFrom.id, port: "out" },
      to: { id: targetId, port: "in" }
    });
    state.connectFrom = null;
    drawWires();
    updateHUD();
  }

  function cancelWire() {
    if (!state.connectFrom) return;
    state.connectFrom = null;
    drawWires();
  }

  function getPortWorldPos(id, port) {
    const el = getNodeEl(id);
    if (!el) return { x: 0, y: 0 };

    const wrapRect = canvasWrap.getBoundingClientRect();
    const pe = el.querySelector(`.gdv-port[data-port="${port}"] .gdv-portDot`);
    const pr = pe.getBoundingClientRect();

    const sx = (pr.left + pr.width / 2) - wrapRect.left;
    const sy = (pr.top + pr.height / 2) - wrapRect.top;
    return screenToWorld(sx, sy);
  }

  function makeWirePath(a, b, stroke, width, dashed = false) {
    const aS = worldToScreen(a.x, a.y);
    const bS = worldToScreen(b.x, b.y);

    const dx = Math.abs(bS.x - aS.x);
    const c1x = aS.x + Math.max(60, dx * 0.35);
    const c2x = bS.x - Math.max(60, dx * 0.35);

    const d = `M ${aS.x} ${aS.y} C ${c1x} ${aS.y}, ${c2x} ${bS.y}, ${bS.x} ${bS.y}`;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", stroke);
    path.setAttribute("stroke-width", String(width));
    path.setAttribute("stroke-linecap", "round");
    if (dashed) path.setAttribute("stroke-dasharray", "6 6");
    return path;
  }

  function drawWires() {
    const r = canvasWrap.getBoundingClientRect();
    wiresSvg.setAttribute("width", r.width);
    wiresSvg.setAttribute("height", r.height);
    wiresSvg.innerHTML = "";

    for (const w of state.wires) {
      const a = getPortWorldPos(w.from.id, "out");
      const b = getPortWorldPos(w.to.id, "in");
      wiresSvg.appendChild(makeWirePath(a, b, "rgba(90,210,255,.85)", 2.2));
    }

    if (state.connectFrom) {
      const from = getPortWorldPos(state.connectFrom.id, "out");
      const m = state._lastPointerWorld || from;
      wiresSvg.appendChild(makeWirePath(from, m, "rgba(255,210,90,.90)", 2.2, true));
    }
  }

  /* ===== Drag drop from navigator ===== */
  canvasWrap.addEventListener("dragover", (e) => e.preventDefault());

  canvasWrap.addEventListener("drop", (e) => {
    e.preventDefault();
    const payload = e.dataTransfer.getData("text/plain");
    if (!payload) return;

    const tpl = JSON.parse(payload);
    const wrapRect = canvasWrap.getBoundingClientRect();
    const sx = e.clientX - wrapRect.left;
    const sy = e.clientY - wrapRect.top;
    const world = screenToWorld(sx, sy);

    createNodeFromTemplate(tpl, world.x - 145, world.y - 28);
  });

  /* ===== Pan / Zoom ===== */
  let spaceDown = false;

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") spaceDown = true;
    if (e.code === "Escape") cancelWire();
    if (e.code === "Delete") {
      if (state.selectedId) deleteNode(state.selectedId);
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") spaceDown = false;
  });

  canvasWrap.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;

    // click blank -> deselect + cancel wire
    if (e.target === canvasWrap || e.target === wiresSvg) {
      state.selectedId = null;
      viewport.querySelectorAll(".gdv-node").forEach(n => n.classList.remove("selected"));
      fillInspector();
      cancelWire();
    }

    if (spaceDown) {
      state.isPanning = true;
      state.panStart = { mx: e.clientX, my: e.clientY, px: state.pan.x, py: state.pan.y };
      canvasWrap.style.cursor = "grabbing";
    }
  });

  window.addEventListener("mousemove", (e) => {
    const wrapRect = canvasWrap.getBoundingClientRect();
    const sx = e.clientX - wrapRect.left;
    const sy = e.clientY - wrapRect.top;
    state._lastPointerWorld = screenToWorld(sx, sy);

    if (state.isPanning && state.panStart) {
      const dx = e.clientX - state.panStart.mx;
      const dy = e.clientY - state.panStart.my;
      state.pan.x = state.panStart.px + dx;
      state.pan.y = state.panStart.py + dy;
      applyTransform();
    } else {
      if (state.connectFrom) drawWires();
    }
  });

  window.addEventListener("mouseup", () => {
    state.isPanning = false;
    state.panStart = null;
    canvasWrap.style.cursor = "default";
  });

  canvasWrap.addEventListener("wheel", (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();

    const rect = canvasWrap.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const before = screenToWorld(sx, sy);

    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.07 : 0.93;
    state.zoom = clamp(state.zoom * factor, 0.55, 1.8);

    // zoom around pointer
    state.pan.x = sx - before.x * state.zoom;
    state.pan.y = sy - before.y * state.zoom;

    applyTransform();
  }, { passive: false });

  /* ===== Inspector ===== */
  const fTitle = $("gdv-fTitle");
  const fType = $("gdv-fType");
  const fStage = $("gdv-fStage");
  const fTags = $("gdv-fTags");
  const fCfg = $("gdv-fCfg");

  function fillInspector() {
    const id = state.selectedId;
    const n = id ? state.nodes.get(id) : null;

    const setDisabled = (d) => {
      [fTitle, fStage, fTags, fCfg].forEach(x => x.disabled = d);
    };

    if (!n) {
      $("gdv-selInfo").textContent = "No selection";
      fTitle.value = "";
      fType.value = "";
      fStage.value = "Design";
      fTags.value = "";
      fCfg.value = "";
      setDisabled(true);
      return;
    }

    $("gdv-selInfo").textContent = `Selected: ${n.title}`;
    fTitle.value = n.title || "";
    fType.value = n.type || "";
    fStage.value = n.stage || "Design";
    fTags.value = n.tags || "";
    fCfg.value = JSON.stringify(n.cfg || {}, null, 2);

    setDisabled(false);
  }

  function bindInspector() {
    fTitle.addEventListener("input", () => {
      const n = state.nodes.get(state.selectedId);
      if (!n) return;
      n.title = fTitle.value;
      const el = getNodeEl(n.id);
      if (el) el.querySelector(".gdv-nodeTitle").textContent = n.title;
      $("gdv-selInfo").textContent = `Selected: ${n.title}`;
    });

    fStage.addEventListener("change", () => {
      const n = state.nodes.get(state.selectedId);
      if (!n) return;
      n.stage = fStage.value;
      const el = getNodeEl(n.id);
      if (el) {
        const pills = el.querySelectorAll(".gdv-nodeType");
        if (pills[2]) pills[2].textContent = n.stage;
      }
    });

    fTags.addEventListener("input", () => {
      const n = state.nodes.get(state.selectedId);
      if (!n) return;
      n.tags = fTags.value;
      const el = getNodeEl(n.id);
      if (el) {
        const vBoxes = el.querySelectorAll(".gdv-v");
        if (vBoxes[0]) vBoxes[0].textContent = n.tags;
      }
    });

    fCfg.addEventListener("input", () => {
      const n = state.nodes.get(state.selectedId);
      if (!n) return;
      try {
        const parsed = JSON.parse(fCfg.value);
        n.cfg = parsed;

        const el = getNodeEl(n.id);
        if (el) {
          const vBoxes = el.querySelectorAll(".gdv-v");
          if (vBoxes[1]) vBoxes[1].textContent = Object.keys(n.cfg || {}).length;
        }
        fCfg.style.borderColor = "rgba(255,255,255,.12)";
      } catch {
        fCfg.style.borderColor = "rgba(255,100,120,.55)";
      }
    });
  }
  bindInspector();

  $("gdv-btnDelete").addEventListener("click", () => {
    if (state.selectedId) deleteNode(state.selectedId);
  });

  $("gdv-btnDuplicate").addEventListener("click", () => {
    if (state.selectedId) duplicateNode(state.selectedId);
  });

  $("gdv-btnExport").addEventListener("click", async () => {
    const data = exportJSON();
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast("Export JSON copied");
    } catch {
      prompt("Copy JSON:", JSON.stringify(data, null, 2));
    }
  });

  function exportJSON() {
    return {
      meta: {
        name: "Maneit Game Design Portal Visualizer",
        version: "v1",
        exportedAt: new Date().toISOString()
      },
      view: { pan: state.pan, zoom: state.zoom },
      nodes: Array.from(state.nodes.values()),
      wires: state.wires
    };
  }

  /* ===== Buttons ===== */
  $("gdv-btnCenter").addEventListener("click", () => {
    state.pan.x = 0;
    state.pan.y = 0;
    state.zoom = 1;
    applyTransform();
  });

  $("gdv-btnClear").addEventListener("click", () => {
    viewport.innerHTML = "";
    state.nodes.clear();
    state.wires = [];
    state.selectedId = null;
    state.connectFrom = null;
    drawWires();
    fillInspector();
    updateHUD();
  });

  $("gdv-btnDemo").addEventListener("click", () => loadDemo());

  /* ===== Search filter left nav ===== */
  $("gdv-navSearch").addEventListener("input", () => {
    const q = $("gdv-navSearch").value.trim().toLowerCase();
    document.querySelectorAll(".gdv-item").forEach(el => {
      const t = el.textContent.toLowerCase();
      el.style.display = t.includes(q) ? "" : "none";
    });
  });

  /* ===== Add-menu templates ===== */
  TEMPLATE_ITEMS.forEach(t => {
    const el = document.createElement("div");
    el.className = "gdv-tpl";
    el.innerHTML = `<strong>${escapeHtml(t.title)}</strong><span>${escapeHtml(t.type)} • ${escapeHtml(t.stage)}</span>`;
    el.addEventListener("click", () => {
      closeMenu();
      const rect = canvasWrap.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const world = screenToWorld(cx, cy);
      createNodeFromTemplate(t, world.x - 145, world.y - 40);
    });
    tplGrid.appendChild(el);
  });

  /* ===== Demo ===== */
  function loadDemo() {
    $("gdv-btnClear").click();

    const bp = createNodeFromTemplate(NAV.blueprints[0], 120, 80);
    const waves = createNodeFromTemplate(TEMPLATE_ITEMS[2], 520, 60);
    const towers = createNodeFromTemplate(TEMPLATE_ITEMS[3], 520, 260);
    const enemies = createNodeFromTemplate(TEMPLATE_ITEMS[4], 520, 460);
    const gen = createNodeFromTemplate(TEMPLATE_ITEMS[5], 900, 160);
    const val = createNodeFromTemplate(TEMPLATE_ITEMS[6], 900, 390);
    const ubt = createNodeFromTemplate(TEMPLATE_ITEMS[7], 1260, 120);
    const uat = createNodeFromTemplate(TEMPLATE_ITEMS[8], 1260, 340);
    const pub = createNodeFromTemplate(TEMPLATE_ITEMS[10], 1620, 340);

    state.wires.push(
      { from: { id: bp, port: "out" }, to: { id: waves, port: "in" } },
      { from: { id: bp, port: "out" }, to: { id: towers, port: "in" } },
      { from: { id: bp, port: "out" }, to: { id: enemies, port: "in" } },
      { from: { id: waves, port: "out" }, to: { id: gen, port: "in" } },
      { from: { id: towers, port: "out" }, to: { id: gen, port: "in" } },
      { from: { id: enemies, port: "out" }, to: { id: gen, port: "in" } },
      { from: { id: gen, port: "out" }, to: { id: val, port: "in" } },
      { from: { id: val, port: "out" }, to: { id: ubt, port: "in" } },
      { from: { id: ubt, port: "out" }, to: { id: uat, port: "in" } },
      { from: { id: uat, port: "out" }, to: { id: pub, port: "in" } }
    );

    state.pan.x = -80;
    state.pan.y = -20;
    state.zoom = 0.95;
    applyTransform();
  }

  /* ===== Cancel wire on blank click ===== */
  canvasWrap.addEventListener("click", (e) => {
    if (e.target === canvasWrap || e.target === wiresSvg) cancelWire();
  });

  /* ===== Keep wires updated on resize ===== */
  window.addEventListener("resize", () => drawWires());

  /* ===== Start ===== */
  applyTransform();
  loadDemo();

})();
