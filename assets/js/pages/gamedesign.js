/* assets/js/pages/gamedesign.js
   Game Design Portal (Visualizer)
   - Drag/drop nodes
   - Pan/zoom
   - Wire OUT -> IN
   - Inspector edits + Export JSON
   Page-scoped: does not touch other pages.
*/
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const uid = () => Math.random().toString(16).slice(2, 10);
  const snap = (v, step = 16) => Math.round(v / step) * step;

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 900);
  }

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
      cfg: { ddc: "shared", preCook: true } },
  ];

  const NAV = {
    blueprints: [TEMPLATE_ITEMS[0], TEMPLATE_ITEMS[1]],
    prod: [
      TEMPLATE_ITEMS[2], TEMPLATE_ITEMS[3], TEMPLATE_ITEMS[4],
      TEMPLATE_ITEMS[5], TEMPLATE_ITEMS[6],
      TEMPLATE_ITEMS[7], TEMPLATE_ITEMS[8],
      TEMPLATE_ITEMS[9], TEMPLATE_ITEMS[10], TEMPLATE_ITEMS[11],
    ],
    targets: [
      { type: "Target", title: "Windows (Win64)", stage: "Build", tags: "desktop", color: "good", cfg: { platform: "Win64" } },
      { type: "Target", title: "Linux", stage: "Build", tags: "desktop", color: "good", cfg: { platform: "Linux" } },
      { type: "Target", title: "Steam Deck", stage: "Build", tags: "handheld", color: "warn", cfg: { platform: "Linux", preset: "steamdeck" } },
      { type: "Target", title: "Cloud Demo", stage: "Publish", tags: "stream", color: "accent", cfg: { type: "webrtc", maxUsers: 5 } },
    ],
  };

  function badgeClass(color) {
    if (color === "purple") return "gd-badge purple";
    if (color === "good") return "gd-badge good";
    if (color === "warn") return "gd-badge warn";
    return "gd-badge";
  }

  function makeNavItem(t, container) {
    const el = document.createElement("div");
    el.className = "gd-item";
    el.draggable = true;
    el.dataset.payload = JSON.stringify(t);

    const b = document.createElement("span");
    b.className = badgeClass(t.color);

    const txt = document.createElement("div");
    txt.innerHTML = `<strong>${esc(t.title)}</strong><div class="muted" style="font-size:12px">${esc(t.type)} • ${esc(t.stage)}</div>`;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = (t.tags || "").split(",")[0] || "";

    el.append(b, txt, meta);
    container.appendChild(el);

    el.addEventListener("dragstart", (ev) => {
      ev.dataTransfer.setData("text/plain", el.dataset.payload);
    });
  }

  NAV.blueprints.forEach((t) => makeNavItem(t, $("blueprints")));
  NAV.prod.forEach((t) => makeNavItem(t, $("prodNodes")));
  NAV.targets.forEach((t) => makeNavItem(t, $("targets")));

  const viewport = $("viewport");
  const wiresSvg = $("wires");
  const canvasWrap = $("canvasWrap");

  const state = {
    nodes: new Map(),
    wires: [],
    selectedId: null,
    pan: { x: 0, y: 0 },
    zoom: 1,
    isPanning: false,
    panStart: null,
    connectFrom: null, // {id}
    _lastPointerWorld: null,
  };

  function updateHUD() {
    $("chipZoom").textContent = `Zoom ${Math.round(state.zoom * 100)}%`;
    $("chipPan").textContent = `Pan (${Math.round(state.pan.x)}, ${Math.round(state.pan.y)})`;
    $("stats").textContent = `${state.nodes.size} nodes • ${state.wires.length} wires`;
  }

  function screenToWorld(sx, sy) {
    const x = (sx - state.pan.x) / state.zoom;
    const y = (sy - state.pan.y) / state.zoom;
    return { x, y };
  }

  function worldToScreen(wx, wy) {
    return {
      x: wx * state.zoom + state.pan.x,
      y: wy * state.zoom + state.pan.y,
    };
  }

  function applyTransform() {
    viewport.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`;
    canvasWrap.style.backgroundPosition =
      `${state.pan.x}px ${state.pan.y}px, ${state.pan.x}px ${state.pan.y}px, ${state.pan.x}px ${state.pan.y}px, ${state.pan.x}px ${state.pan.y}px`;
    drawWires();
    updateHUD();
  }

  function getNodeEl(id) {
    return viewport.querySelector(`.gd-node[data-id="${id}"]`);
  }

  function selectNode(id) {
    state.selectedId = id;
    viewport.querySelectorAll(".gd-node").forEach((n) => n.classList.remove("selected"));
    const el = getNodeEl(id);
    if (el) el.classList.add("selected");
    fillInspector();
  }

  function createNodeFromTemplate(tpl, x, y) {
    const id = uid();
    const node = {
      id,
      type: tpl.type,
      title: tpl.title,
      stage: tpl.stage || "Design",
      tags: tpl.tags || "",
      cfg: JSON.parse(JSON.stringify(tpl.cfg || {})),
      x: snap(x),
      y: snap(y),
      w: 290,
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
    el.className = "gd-node";
    el.dataset.id = node.id;
    el.style.left = node.x + "px";
    el.style.top = node.y + "px";
    el.style.width = node.w + "px";

    el.innerHTML = `
      <div class="gd-node-h">
        <span class="gd-pill">${esc(node.type)}</span>
        <span class="gd-title">${esc(node.title)}</span>
        <span class="gd-pill">${esc(node.stage)}</span>
        <div class="gd-tools">
          <button class="gd-ib" data-act="wire" title="Start wire (OUT)">⟶</button>
          <button class="gd-ib" data-act="dup" title="Duplicate">⎘</button>
          <button class="gd-ib" data-act="del" title="Delete">✕</button>
        </div>
      </div>

      <div class="gd-node-b">
        <div class="gd-kv">
          <div>
            <div class="gd-k">Tags</div>
            <div class="gd-v gd-tags">${esc(node.tags || "")}</div>
          </div>
          <div>
            <div class="gd-k">Config keys</div>
            <div class="gd-v gd-keys">${Object.keys(node.cfg || {}).length}</div>
          </div>
        </div>

        <div class="gd-ports">
          <div class="gd-port" data-port="in">
            <span class="gd-dot"></span>
            <span>IN</span>
          </div>
          <div class="gd-port" data-port="out">
            <span class="gd-dot out"></span>
            <span>OUT</span>
          </div>
          <div class="muted" style="margin-left:auto;font-size:12px">drag • connect</div>
        </div>
      </div>
    `;

    viewport.appendChild(el);

    // Select node on click (but not on buttons/ports)
    el.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      if (e.target.closest("button")) return;
      if (e.target.closest(".gd-port")) return;
      selectNode(node.id);
    });

    // Tools
    el.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === "del") deleteNode(node.id);
        if (act === "dup") duplicateNode(node.id);
        if (act === "wire") beginWireFrom(node.id);
      });
    });

    // Ports wiring
    el.querySelectorAll(".gd-port").forEach((p) => {
      p.addEventListener("click", (e) => {
        e.stopPropagation();
        const port = p.dataset.port;
        if (port === "out") beginWireFrom(node.id);
        else tryCompleteWireTo(node.id);
      });
    });

    // Dragging by header
    const header = el.querySelector(".gd-node-h");
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

  function deleteNode(id) {
    state.wires = state.wires.filter((w) => w.from.id !== id && w.to.id !== id);
    state.nodes.delete(id);
    const el = getNodeEl(id);
    if (el) el.remove();
    if (state.selectedId === id) state.selectedId = null;
    state.connectFrom = (state.connectFrom && state.connectFrom.id === id) ? null : state.connectFrom;
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

  function getPortWorldPos(id, port) {
    const el = getNodeEl(id);
    if (!el) return { x: 0, y: 0 };
    const wrapRect = canvasWrap.getBoundingClientRect();
    const pe = el.querySelector(`.gd-port[data-port="${port}"] .gd-dot`);
    const pr = pe.getBoundingClientRect();
    const sx = (pr.left + pr.width / 2) - wrapRect.left;
    const sy = (pr.top + pr.height / 2) - wrapRect.top;
    return screenToWorld(sx, sy);
  }

  function beginWireFrom(id) {
    selectNode(id);
    state.connectFrom = { id };
    drawWires();
  }

  function tryCompleteWireTo(targetId) {
    if (!state.connectFrom) return;
    if (state.connectFrom.id === targetId) return;
    state.wires.push({ from: { id: state.connectFrom.id, port: "out" }, to: { id: targetId, port: "in" } });
    state.connectFrom = null;
    drawWires();
    updateHUD();
  }

  function cancelWire() {
    if (state.connectFrom) {
      state.connectFrom = null;
      drawWires();
    }
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

    // Real wires
    for (const w of state.wires) {
      const a = getPortWorldPos(w.from.id, "out");
      const b = getPortWorldPos(w.to.id, "in");
      wiresSvg.appendChild(makeWirePath(a, b, "rgba(90,210,255,.85)", 2.2));
    }

    // Temp wire (from OUT to mouse)
    if (state.connectFrom) {
      const from = getPortWorldPos(state.connectFrom.id, "out");
      const m = state._lastPointerWorld || from;
      wiresSvg.appendChild(makeWirePath(from, m, "rgba(255,210,90,.90)", 2.2, true));
    }
  }

  // Drag/drop from navigator
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

  // Pan/Zoom
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

    // blank click deselect + cancel wire
    if (e.target === canvasWrap || e.target === wiresSvg) {
      state.selectedId = null;
      viewport.querySelectorAll(".gd-node").forEach((n) => n.classList.remove("selected"));
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

    state.pan.x = sx - before.x * state.zoom;
    state.pan.y = sy - before.y * state.zoom;

    applyTransform();
  }, { passive: false });

  // Inspector
  const fTitle = $("fTitle");
  const fType = $("fType");
  const fStage = $("fStage");
  const fTags = $("fTags");
  const fCfg = $("fCfg");

  function setDisabled(d) {
    [fTitle, fStage, fTags, fCfg].forEach((x) => (x.disabled = d));
  }

  function fillInspector() {
    const id = state.selectedId;
    const n = id ? state.nodes.get(id) : null;

    if (!n) {
      $("selInfo").textContent = "No selection";
      fTitle.value = "";
      fType.value = "";
      fStage.value = "Design";
      fTags.value = "";
      fCfg.value = "";
      setDisabled(true);
      return;
    }

    $("selInfo").textContent = `Selected: ${n.title}`;
    fTitle.value = n.title || "";
    fType.value = n.type || "";
    fStage.value = n.stage || "Design";
    fTags.value = n.tags || "";
    fCfg.value = JSON.stringify(n.cfg || {}, null, 2);
    fCfg.style.borderColor = "rgba(255,255,255,.12)";
    setDisabled(false);
  }

  fTitle.addEventListener("input", () => {
    const n = state.nodes.get(state.selectedId);
    if (!n) return;
    n.title = fTitle.value;
    const el = getNodeEl(n.id);
    if (el) el.querySelector(".gd-title").textContent = n.title;
    $("selInfo").textContent = `Selected: ${n.title}`;
  });

  fStage.addEventListener("change", () => {
    const n = state.nodes.get(state.selectedId);
    if (!n) return;
    n.stage = fStage.value;
    const el = getNodeEl(n.id);
    if (el) {
      const pills = el.querySelectorAll(".gd-pill");
      if (pills[1]) pills[1].textContent = n.stage;
    }
  });

  fTags.addEventListener("input", () => {
    const n = state.nodes.get(state.selectedId);
    if (!n) return;
    n.tags = fTags.value;
    const el = getNodeEl(n.id);
    if (el) el.querySelector(".gd-tags").textContent = n.tags;
  });

  fCfg.addEventListener("input", () => {
    const n = state.nodes.get(state.selectedId);
    if (!n) return;
    try {
      const parsed = JSON.parse(fCfg.value);
      n.cfg = parsed;
      const el = getNodeEl(n.id);
      if (el) el.querySelector(".gd-keys").textContent = Object.keys(n.cfg || {}).length;
      fCfg.style.borderColor = "rgba(255,255,255,.12)";
    } catch {
      fCfg.style.borderColor = "rgba(255,100,120,.55)";
    }
  });

  $("btnDelete").addEventListener("click", () => state.selectedId && deleteNode(state.selectedId));
  $("btnDuplicate").addEventListener("click", () => state.selectedId && duplicateNode(state.selectedId));

  $("btnExport").addEventListener("click", async () => {
    const data = exportJSON();
    const txt = JSON.stringify(data, null, 2);
    try {
      await navigator.clipboard.writeText(txt);
      toast("Export JSON copied");
    } catch {
      prompt("Copy JSON:", txt);
    }
  });

  function exportJSON() {
    return {
      meta: { name: "Maneit Game Design Portal Visualizer", version: "v1", exportedAt: new Date().toISOString() },
      view: { pan: state.pan, zoom: state.zoom },
      nodes: Array.from(state.nodes.values()),
      wires: state.wires,
    };
  }

  // Add menu
  const addMenu = $("addMenu");
  const tplGrid = $("tplGrid");

  function openMenu() { addMenu.classList.add("open"); }
  function closeMenu() { addMenu.classList.remove("open"); }

  $("btnAdd").addEventListener("click", () => {
    addMenu.classList.toggle("open");
  });

  document.addEventListener("mousedown", (e) => {
    if (!addMenu.classList.contains("open")) return;
    const inside = addMenu.contains(e.target) || $("btnAdd").contains(e.target);
    if (!inside) closeMenu();
  });

  TEMPLATE_ITEMS.forEach((t) => {
    const el = document.createElement("div");
    el.className = "gd-tpl";
    el.innerHTML = `<strong>${esc(t.title)}</strong><span>${esc(t.type)} • ${esc(t.stage)}</span>`;
    el.addEventListener("click", () => {
      closeMenu();
      const rect = canvasWrap.getBoundingClientRect();
      const world = screenToWorld(rect.width / 2, rect.height / 2);
      createNodeFromTemplate(t, world.x - 145, world.y - 40);
    });
    tplGrid.appendChild(el);
  });

  // Buttons
  $("btnCenter").addEventListener("click", () => {
    state.pan.x = 0;
    state.pan.y = 0;
    state.zoom = 1;
    applyTransform();
  });

  $("btnClear").addEventListener("click", () => {
    viewport.innerHTML = "";
    state.nodes.clear();
    state.wires = [];
    state.selectedId = null;
    state.connectFrom = null;
    drawWires();
    fillInspector();
    updateHUD();
  });

  $("btnDemo").addEventListener("click", () => loadDemo());

  // Search filter
  $("navSearch").addEventListener("input", () => {
    const q = $("navSearch").value.trim().toLowerCase();
    document.querySelectorAll(".gd-item").forEach((el) => {
      const t = el.textContent.toLowerCase();
      el.style.display = t.includes(q) ? "" : "none";
    });
  });

  // Demo
  function loadDemo() {
    $("btnClear").click();

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

  // Keep wires correct on resize
  window.addEventListener("resize", () => drawWires());

  // Start
  applyTransform();
  loadDemo();

})();
