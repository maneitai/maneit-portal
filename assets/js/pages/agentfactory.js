/* Page-isolated: AgentFactory (visual/UI-only)
   - No shared-file edits
   - Uses localStorage to persist visual state
*/

(function () {
  const LS_KEY = "agentfactory_visual_v1";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const els = {
    tabs: $$(".af-tab"),
    list: $("#afList"),
    subtitle: $("#afSubtitle"),
    scope: $("#afScope"),
    search: $("#afSearch"),

    selectedTitle: $("#afSelectedTitle"),
    selectedMeta: $("#afSelectedMeta"),

    newBtn: $("#afNewBtn"),
    cloneBtn: $("#afCloneBtn"),
    deleteBtn: $("#afDeleteBtn"),

    activeLabel: $("#afActiveLabel"),
    chat: $("#afChat"),
    empty: $("#afEmpty"),
    prompt: $("#afPrompt"),
    send: $("#afSend"),
    wbMode: $("#afWorkbenchMode"),

    targets: $("#afTargets"),
    selectAllTargets: $("#afSelectAllTargets"),
    clearTargets: $("#afClearTargets"),

    bindModel: $("#afBindModel"),
    bindLayer: $("#afBindLayer"),
    bindBtn: $("#afBindBtn"),
    unbindBtn: $("#afUnbindBtn"),

    releaseNotes: $("#afReleaseNotes"),
    saveNotes: $("#afSaveNotes"),
    clearNotes: $("#afClearNotes"),

    adminPill: $("#afAdminPill"),
    privilegePill: $("#afPrivilegePill"),
    termStatus: $("#afTermStatus"),
    termOut: $("#afTermOut"),
    termIn: $("#afTermIn"),
    termSend: $("#afTermSend"),
    adminToggle: $("#afAdminToggle"),
    safetyPill: $("#afSafetyPill"),

    auditLog: $("#afAuditLog"),

    runSpec: $("#afRunSpec"),
    runBuild: $("#afRunBuild"),
    runDeploy: $("#afRunDeploy"),
    runAudit: $("#afRunAudit"),

    activeScopePill: $("#afActiveScopePill"),
    activeTypePill: $("#afActiveTypePill"),
    activeSelectionPill: $("#afActiveSelectionPill"),
    statePreview: $("#afStatePreview"),
    exportState: $("#afExportState"),
    resetState: $("#afResetState"),

    versionPill: $("#afVersionPill"),
    integrityPill: $("#afIntegrityPill"),
    storePill: $("#afStorePill"),
  };

  const defaultState = () => ({
    v: 1,
    scope: "maneit-portal",
    tab: "agents",
    admin: false,
    selected: { type: null, id: null },

    agents: [
      { id: "router-fast", name: "router_fast", meta: "Routes intents to nodes / tools", binds: { model: "llama-8b", layer: "maneit-spec-v1" } },
      { id: "ops-agent", name: "ops", meta: "Deployment + system ops (controlled)", binds: { model: "qwen-7b", layer: "ops-guardrails-v1" } },
      { id: "builder", name: "builder", meta: "UI & structure builder", binds: { model: "llama-8b", layer: "ui-clarity-v1" } },
    ],
    models: [
      { id: "llama-8b", name: "Llama (8B)", meta: "Fast local baseline" },
      { id: "qwen-7b", name: "Qwen (7B)", meta: "Ops / structured responses" },
      { id: "deepseek-r1q", name: "DeepSeek R1 Distill", meta: "Reasoning-heavy tasks" },
    ],
    layers: [
      { id: "maneit-spec-v1", name: "ManeitSpec v1", meta: "Continuity + isolation rules" },
      { id: "ops-guardrails-v1", name: "Ops Guardrails v1", meta: "Safe deploy planning + audit" },
      { id: "ui-clarity-v1", name: "UI Clarity v1", meta: "ADHD-friendly, structured UI output" },
    ],

    targets: [
      { id: "win-main", name: "Windows Main", meta: "9800X3D / RX 9070XT", checked: true },
      { id: "gpu-node", name: "GPU Node", meta: "16-core / RTX 5080", checked: true },
      { id: "fedora-jelly", name: "Fedora Jelly", meta: "AMD GPU node", checked: false },
      { id: "cpu-node", name: "CPU Node", meta: "5700X / no GPU", checked: false },
    ],
    releaseNotes: "",

    chat: [],
    terminal: { out: "AgentFactory terminal is visual-only.\nAdmin is OFF.\n", attempts: [] },
    audit: [],
  });

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return mergeDefaults(defaultState(), parsed);
    } catch {
      return defaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      if (els.storePill) els.storePill.textContent = "Storage: ON";
    } catch {
      if (els.storePill) els.storePill.textContent = "Storage: OFF";
    }
    renderContext();
  }

  function mergeDefaults(base, incoming) {
    const out = structuredClone(base);
    for (const k in incoming) {
      if (incoming[k] && typeof incoming[k] === "object" && !Array.isArray(incoming[k])) {
        out[k] = { ...out[k], ...incoming[k] };
      } else {
        out[k] = incoming[k];
      }
    }
    return out;
  }

  function render() {
    // Tabs
    els.tabs.forEach((b) => b.classList.toggle("is-active", b.dataset.afTab === state.tab));
    if (els.subtitle) els.subtitle.textContent = titleForTab(state.tab);

    // Scope
    if (els.scope) els.scope.value = state.scope;
    if (els.activeScopePill) els.activeScopePill.textContent = "Scope: " + state.scope;

    // Admin state
    applyAdminState();

    // Library list
    renderList();

    // Ops
    renderTargets();
    renderBindSelects();

    // Notes
    if (els.releaseNotes) els.releaseNotes.value = state.releaseNotes || "";

    // Workbench + terminal + audit + context
    renderChat();
    if (els.termOut) {
      els.termOut.textContent = state.terminal?.out || "";
      els.termOut.scrollTop = els.termOut.scrollHeight;
    }
    renderAudit();
    renderContext();
  }

  function titleForTab(tab) {
    if (tab === "agents") return "Library — Agents";
    if (tab === "models") return "Library — Models";
    if (tab === "layers") return "Library — Reasoning Layers";
    return "Library";
  }

  function getPoolByTab(tab) {
    if (tab === "agents") return state.agents;
    if (tab === "models") return state.models;
    if (tab === "layers") return state.layers;
    return [];
  }

  function getSelectedObject() {
    if (!state.selected?.type || !state.selected?.id) return null;
    const pool = getPoolByTab(state.selected.type);
    return pool.find((x) => x.id === state.selected.id) || null;
  }

  function renderList() {
    const q = (els.search?.value || "").trim().toLowerCase();
    const items = getPoolByTab(state.tab).filter((x) => {
      const hay = (x.name + " " + (x.meta || "")).toLowerCase();
      return !q || hay.includes(q);
    });

    if (!els.list) return;
    els.list.innerHTML = "";

    items.forEach((x) => {
      const div = document.createElement("div");
      const isActive = state.selected.type === state.tab && state.selected.id === x.id;
      div.className = "af-item" + (isActive ? " is-active" : "");
      div.tabIndex = 0;

      const extra =
        state.tab === "agents" && x.binds
          ? ` • binds: ${x.binds.model || "none"} + ${x.binds.layer || "none"}`
          : "";

      div.innerHTML = `
        <div class="t">${escapeHtml(x.name)}</div>
        <div class="m">${escapeHtml(x.meta || "")}${escapeHtml(extra)}</div>
      `;

      div.addEventListener("click", () => selectItem(state.tab, x.id));
      div.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectItem(state.tab, x.id);
        }
      });

      els.list.appendChild(div);
    });

    const sel = getSelectedObject();
    if (!sel) {
      if (els.selectedTitle) els.selectedTitle.textContent = "None";
      if (els.selectedMeta) els.selectedMeta.textContent = "Pick an item in the library.";
      if (els.activeLabel) els.activeLabel.textContent = "No selection";
      if (els.activeSelectionPill) els.activeSelectionPill.textContent = "Selected: none";
    } else {
      if (els.selectedTitle) els.selectedTitle.textContent = sel.name;
      if (els.selectedMeta) els.selectedMeta.textContent = sel.meta || "";
      if (els.activeLabel) els.activeLabel.textContent = sel.name;
      if (els.activeSelectionPill) els.activeSelectionPill.textContent = "Selected: " + sel.id;
    }
  }

  function selectItem(type, id) {
    state.selected = { type, id };
    audit(`select:${type}:${id}`);

    const sel = getSelectedObject();
    pushSystem(sel ? `Selected ${type}: ${sel.name}` : "Selection cleared");

    saveState();
    render();
  }

  function renderTargets() {
    if (!els.targets) return;
    els.targets.innerHTML = "";

    state.targets.forEach((t) => {
      const wrap = document.createElement("label");
      wrap.className = "af-row af-tight";
      wrap.style.alignItems = "flex-start";
      wrap.style.cursor = "pointer";
      wrap.style.userSelect = "none";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!t.checked;
      cb.style.width = "18px";
      cb.style.height = "18px";
      cb.style.marginTop = "3px";

      cb.addEventListener("change", () => {
        t.checked = cb.checked;
        audit(`target:${t.id}=${t.checked ? "on" : "off"}`);
        saveState();
      });

      const meta = document.createElement("div");
      meta.innerHTML = `
        <div style="font-size:13px; margin-bottom:2px;">${escapeHtml(t.name)}</div>
        <div class="af-muted2">${escapeHtml(t.meta || "")}</div>
      `;

      wrap.appendChild(cb);
      wrap.appendChild(meta);
      els.targets.appendChild(wrap);
    });
  }

  function renderBindSelects() {
    if (!els.bindModel || !els.bindLayer) return;

    els.bindModel.innerHTML = "";
    state.models.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      els.bindModel.appendChild(opt);
    });

    els.bindLayer.innerHTML = "";
    state.layers.forEach((l) => {
      const opt = document.createElement("option");
      opt.value = l.id;
      opt.textContent = l.name;
      els.bindLayer.appendChild(opt);
    });

    const sel = getSelectedObject();
    if (sel && state.selected.type === "agents") {
      if (sel.binds?.model) els.bindModel.value = sel.binds.model;
      if (sel.binds?.layer) els.bindLayer.value = sel.binds.layer;
    }
  }

  function bind() {
    const sel = getSelectedObject();
    if (!sel || state.selected.type !== "agents") {
      pushSystem("Bind requires an Agent selected.");
      return;
    }
    sel.binds = sel.binds || {};
    sel.binds.model = els.bindModel.value;
    sel.binds.layer = els.bindLayer.value;

    audit(`bind:${sel.id} -> model:${sel.binds.model}, layer:${sel.binds.layer}`);
    pushSystem(`Bound ${sel.name} to model+layer.`);

    saveState();
    render();
  }

  function unbind() {
    const sel = getSelectedObject();
    if (!sel || state.selected.type !== "agents") {
      pushSystem("Unbind requires an Agent selected.");
      return;
    }
    sel.binds = { model: null, layer: null };
    audit(`unbind:${sel.id}`);
    pushSystem(`Unbound ${sel.name}.`);
    saveState();
    render();
  }

  function renderChat() {
    if (!els.chat || !els.empty) return;

    // Empty overlay logic
    els.empty.style.display = state.chat.length > 0 ? "none" : "grid";

    // Clear + keep empty node
    const keep = els.empty;
    els.chat.innerHTML = "";
    els.chat.appendChild(keep);

    state.chat.forEach((m) => {
      const div = document.createElement("div");
      div.className = "af-msg" + (m.role === "user" ? " is-user" : "");
      div.textContent = m.text;
      els.chat.appendChild(div);
    });

    els.chat.scrollTop = els.chat.scrollHeight;
  }

  function sendWorkbench() {
    const text = (els.prompt?.value || "").trim();
    if (!text) return;

    const mode = els.wbMode?.value || "spec";
    const sel = getSelectedObject();
    const label = sel ? `${state.selected.type}:${sel.name}` : "no-selection";

    state.chat.push({ role: "user", text });
    state.chat.push({ role: "sys", text: `[${mode}] queued (visual) for ${label}` });

    audit(`wb:${mode}:${label}`);

    if (els.prompt) els.prompt.value = "";
    saveState();
    renderChat();
    renderAudit();
  }

  function applyAdminState() {
    if (els.adminPill) els.adminPill.textContent = "Admin: " + (state.admin ? "ON" : "OFF");
    if (els.privilegePill) els.privilegePill.textContent = "Privileged: " + (state.admin ? "ON" : "OFF");
    if (els.termStatus) els.termStatus.textContent = state.admin ? "unlocked" : "locked";
    if (els.safetyPill) els.safetyPill.textContent = state.admin ? "Danger zone: unlocked" : "Danger zone: locked";
  }

  function toggleAdmin() {
    state.admin = !state.admin;
    audit(`admin:${state.admin ? "on" : "off"}`);
    pushSystem(`Admin is now ${state.admin ? "ON" : "OFF"} (visual).`);
    saveState();
    render();
  }

  function termRun() {
    const cmd = (els.termIn?.value || "").trim();
    if (!cmd) return;

    const ts = nowTs();
    const prefix = state.admin ? "ADMIN" : "USER";
    const looksPrivileged =
      /(^sudo\s)|(^rm\s)|(^del\s)|(^format\s)|(^diskpart)|(^reg\s)|(^shutdown)|(^bcdedit)|(^netsh)|(^Set-ExecutionPolicy)/i.test(cmd);

    let out = `${ts}  ${prefix}> ${cmd}\n`;

    if (!state.admin && looksPrivileged) {
      out += `!! blocked (visual): admin required\n`;
      audit(`term:block:${cmd}`);
    } else {
      out += `ok (visual): command queued\n`;
      audit(`term:run:${cmd}`);
    }

    state.terminal.out = (state.terminal.out || "") + out;
    state.terminal.attempts = state.terminal.attempts || [];
    state.terminal.attempts.unshift({ ts, cmd, admin: state.admin });

    if (els.termIn) els.termIn.value = "";
    saveState();
    render();
  }

  function renderAudit() {
    if (!els.auditLog) return;
    const lines = ["// Audit log (visual)", "// newest first", ""];
    state.audit.slice(0, 30).forEach((a) => lines.push(`${a.ts}  ${a.msg}`));
    els.auditLog.textContent = lines.join("\n");
  }

  function runPipeline(stage) {
    const sel = getSelectedObject();
    const label = sel ? `${state.selected.type}:${sel.name}` : "no-selection";
    pushSystem(`Pipeline (visual): ${stage} → ${label}`);
    audit(`pipeline:${stage}:${label}`);
    saveState();
    render();
  }

  function saveNotes() {
    state.releaseNotes = els.releaseNotes?.value || "";
    audit(`notes:save:${state.releaseNotes.length}`);
    pushSystem("Release notes saved (visual).");
    saveState();
    render();
  }

  function clearNotes() {
    if (els.releaseNotes) els.releaseNotes.value = "";
    state.releaseNotes = "";
    audit("notes:clear");
    pushSystem("Release notes cleared (visual).");
    saveState();
    render();
  }

  function selectAllTargets() {
    state.targets.forEach((t) => (t.checked = true));
    audit("targets:selectAll");
    saveState();
    renderTargets();
    renderContext();
  }

  function clearTargets() {
    state.targets.forEach((t) => (t.checked = false));
    audit("targets:clear");
    saveState();
    renderTargets();
    renderContext();
  }

  function newItem() {
    const type = state.tab;
    const name = prompt(`New ${type.slice(0, -1)} name?`);
    if (!name) return;

    const id = slugify(name) || "item-" + Date.now();
    const meta = prompt("Short description/meta?") || "";

    if (type === "agents") {
      state.agents.unshift({
        id,
        name,
        meta,
        binds: { model: state.models[0]?.id || null, layer: state.layers[0]?.id || null },
      });
    } else if (type === "models") {
      state.models.unshift({ id, name, meta });
    } else if (type === "layers") {
      state.layers.unshift({ id, name, meta });
    }

    audit(`new:${type}:${id}`);
    pushSystem(`Created ${type.slice(0, -1)}: ${name}`);
    state.selected = { type, id };
    saveState();
    render();
  }

  function cloneItem() {
    const sel = getSelectedObject();
    if (!sel) return;

    const type = state.tab;
    const baseName = sel.name + " (clone)";
    const name = prompt("Clone name?", baseName);
    if (!name) return;

    const id = slugify(name) || "clone-" + Date.now();
    const copy = structuredClone(sel);
    copy.id = id;
    copy.name = name;

    getPoolByTab(type).unshift(copy);

    audit(`clone:${type}:${id}`);
    pushSystem(`Cloned ${type.slice(0, -1)}: ${name}`);
    state.selected = { type, id };
    saveState();
    render();
  }

  function deleteItem() {
    const sel = getSelectedObject();
    if (!sel) return;

    const ok = confirm(`Delete ${state.tab.slice(0, -1)} "${sel.name}"? (visual)`);
    if (!ok) return;

    const pool = getPoolByTab(state.tab);
    const idx = pool.findIndex((x) => x.id === sel.id);
    if (idx >= 0) pool.splice(idx, 1);

    audit(`delete:${state.tab}:${sel.id}`);
    pushSystem(`Deleted ${state.tab.slice(0, -1)}: ${sel.name}`);
    state.selected = { type: null, id: null };
    saveState();
    render();
  }

  function audit(msg) {
    state.audit.unshift({ ts: nowTs(), msg });
  }

  function pushSystem(text) {
    state.chat.push({ role: "sys", text });
    if (state.chat.length > 80) state.chat.splice(0, state.chat.length - 80);

    state.terminal.out = (state.terminal.out || "") + `${nowTs()}  SYS> ${text}\n`;
    if ((state.terminal.out || "").length > 12000) {
      state.terminal.out = state.terminal.out.slice(-12000);
    }
  }

  function renderContext() {
    if (els.activeTypePill) els.activeTypePill.textContent = "Type: " + state.tab;

    const sel = getSelectedObject();
    if (els.activeSelectionPill) {
      els.activeSelectionPill.textContent = sel ? "Selected: " + state.selected.id : "Selected: none";
    }

    const preview = {
      v: state.v,
      scope: state.scope,
      tab: state.tab,
      admin: state.admin,
      selected: state.selected,
      targets: state.targets.map((t) => ({ id: t.id, checked: !!t.checked })),
      releaseNotesLen: (state.releaseNotes || "").length,
      chatCount: state.chat.length,
      auditCount: state.audit.length,
    };

    if (els.statePreview) {
      els.statePreview.textContent = "// state preview (visual)\n" + JSON.stringify(preview, null, 2);
    }
  }

  function nowTs() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function slugify(s) {
    return String(s)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Wire events
  function wire() {
    els.tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        state.tab = btn.dataset.afTab;
        state.selected = { type: null, id: null };
        audit(`tab:${state.tab}`);
        saveState();
        render();
      });
    });

    els.scope?.addEventListener("change", () => {
      state.scope = els.scope.value;
      audit(`scope:${state.scope}`);
      saveState();
      render();
    });

    els.search?.addEventListener("input", () => renderList());

    els.newBtn?.addEventListener("click", newItem);
    els.cloneBtn?.addEventListener("click", cloneItem);
    els.deleteBtn?.addEventListener("click", deleteItem);

    els.bindBtn?.addEventListener("click", bind);
    els.unbindBtn?.addEventListener("click", unbind);

    els.saveNotes?.addEventListener("click", saveNotes);
    els.clearNotes?.addEventListener("click", clearNotes);

    els.selectAllTargets?.addEventListener("click", selectAllTargets);
    els.clearTargets?.addEventListener("click", clearTargets);

    els.send?.addEventListener("click", sendWorkbench);
    els.prompt?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendWorkbench();
      }
    });

    els.adminToggle?.addEventListener("click", toggleAdmin);
    els.termSend?.addEventListener("click", termRun);
    els.termIn?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        termRun();
      }
    });

    els.runSpec?.addEventListener("click", () => runPipeline("spec"));
    els.runBuild?.addEventListener("click", () => runPipeline("build"));
    els.runDeploy?.addEventListener("click", () => runPipeline("deploy"));
    els.runAudit?.addEventListener("click", () => runPipeline("audit"));

    els.exportState?.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "agentfactory-visual-state.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      audit("export:json");
      saveState();
      render();
    });

    els.resetState?.addEventListener("click", () => {
      const ok = confirm("Reset AgentFactory visual state? (local only)");
      if (!ok) return;
      state = defaultState();
      saveState();
      render();
    });
  }

  // Boot
  document.addEventListener("DOMContentLoaded", () => {
    wire();
    saveState();
    render();
  });
})();
