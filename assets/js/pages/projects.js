/* Page-isolated: Projects (visual/UI-only)
   - localStorage persists project snapshot, notes, tasks, audit
*/

(function () {
  const LS = "projects_visual_v1";
  const $ = (s, r = document) => r.querySelector(s);

  const els = {
    scope: $("#pScope"),
    search: $("#pSearch"),
    list: $("#pList"),
    count: $("#pCount"),
    store: $("#pStore"),

    selTitle: $("#pSelTitle"),
    selMeta: $("#pSelMeta"),

    active: $("#pActive"),
    tier: $("#pTier"),
    stage: $("#pStage"),
    summary: $("#pSummary"),
    updated: $("#pUpdated"),

    notes: $("#pNotes"),
    tags: $("#pTags"),

    next: $("#pNext"),
    taskIn: $("#pTaskIn"),
    taskAdd: $("#pTaskAdd"),

    log: $("#pLog"),
    state: $("#pState"),

    newBtn: $("#pNew"),
    cloneBtn: $("#pClone"),
    archiveBtn: $("#pArchive"),
    saveBtn: $("#pSave"),
    exportBtn: $("#pExport"),
    resetBtn: $("#pReset"),

    runPlan: $("#pRunPlan"),
    runBuild: $("#pRunBuild"),
    runShip: $("#pRunShip"),
  };

  const defaultState = () => ({
    v: 1,
    selectedId: null,
    scope: "all",
    projects: [
      { id:"home", name:"Home", scope:"portal", tier:"canonical", stage:"final-ui", updated: now(), tags:["calendar","teams","discord"], summary:"Landing + coordination hub." },
      { id:"agentfactory", name:"AgentFactory", scope:"agents", tier:"canonical", stage:"visual-ui", updated: now(), tags:["agents","models","reasoning","deploy"], summary:"Control hub for agents/models/reasoning layers + deploy planning." },
      { id:"appcreator", name:"AppCreator", scope:"apps", tier:"canonical", stage:"visual-ui", updated: now(), tags:["apps","cli","gui","pipeline"], summary:"Program creation hub (NetworkSaint/SystemDwarf/Simulare)." },
      { id:"novelcrafter", name:"NovelCrafter", scope:"creative", tier:"canonical", stage:"active", updated: now(), tags:["writing","worldbuilding"], summary:"Creative production pipeline." },
      { id:"system", name:"System", scope:"portal", tier:"canonical", stage:"visual-ui", updated: now(), tags:["nodes","health","deploy"], summary:"Nodes, status, actions, observability." },
      { id:"notes", name:"Notes", scope:"portal", tier:"canonical", stage:"visual-ui", updated: now(), tags:["scratchpad","decisions"], summary:"Fast capture + structured notes." },
    ],
    notesByProject: {},
    tasksByProject: {
      agentfactory: [
        { id:"t1", text:"Define canonical agent list + bindings", tag:"spec" },
        { id:"t2", text:"Decide deployment abstraction (visual)", tag:"ops" }
      ],
      appcreator: [
        { id:"t1", text:"Define app templates (CLI/GUI)", tag:"build" }
      ],
      home: [
        { id:"t1", text:"Hook calendar + comms UI", tag:"final" }
      ]
    },
    audit: []
  });

  let state = load();

  function load(){
    try{
      const raw = localStorage.getItem(LS);
      if(!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return { ...defaultState(), ...parsed };
    }catch{
      return defaultState();
    }
  }

  function save(){
    try{
      localStorage.setItem(LS, JSON.stringify(state));
      if (els.store) els.store.textContent = "Storage: ON";
    }catch{
      if (els.store) els.store.textContent = "Storage: OFF";
    }
    renderSnapshot();
  }

  function now(){
    const d = new Date();
    const pad = n => String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function audit(msg){
    state.audit.unshift({ ts: now(), msg });
    if(state.audit.length > 40) state.audit.length = 40;
    renderAudit();
  }

  function getSel(){
    return state.projects.find(p => p.id === state.selectedId) || null;
  }

  function render(){
    if (!els.scope || !els.search || !els.list) return;

    els.scope.value = state.scope || "all";

    const q = (els.search.value || "").trim().toLowerCase();
    const scope = els.scope.value;

    const items = state.projects.filter(p => {
      const okScope = scope === "all" ? true : p.scope === scope;
      const hay = (p.name + " " + p.summary + " " + (p.tags||[]).join(" ")).toLowerCase();
      const okQ = !q || hay.includes(q);
      return okScope && okQ;
    });

    if (els.count) els.count.textContent = String(items.length);

    els.list.innerHTML = "";
    items.forEach(p => {
      const div = document.createElement("div");
      div.className = "pr-item" + (state.selectedId === p.id ? " is-active" : "");
      div.tabIndex = 0;
      div.innerHTML = `
        <div class="t">${esc(p.name)}</div>
        <div class="m">${esc(p.summary)}</div>
      `;
      div.addEventListener("click", () => select(p.id));
      div.addEventListener("keydown", (e) => {
        if(e.key === "Enter" || e.key === " "){
          e.preventDefault();
          select(p.id);
        }
      });
      els.list.appendChild(div);
    });

    renderSelection();
  }

  function renderSelection(){
    const sel = getSel();

    if(!sel){
      if (els.selTitle) els.selTitle.textContent = "None";
      if (els.selMeta) els.selMeta.textContent = "Pick a project.";
      if (els.active) els.active.textContent = "No selection";
      if (els.tier) els.tier.textContent = "Tier: —";
      if (els.stage) els.stage.textContent = "Stage: —";
      if (els.summary) els.summary.textContent = "Select a project to see the full snapshot.";
      if (els.updated) els.updated.textContent = "Updated: —";
      if (els.notes) els.notes.value = "";
      if (els.tags) els.tags.textContent = "// tags";
      renderTasks([]);
      return;
    }

    if (els.selTitle) els.selTitle.textContent = sel.name;
    if (els.selMeta) els.selMeta.textContent = sel.summary;
    if (els.active) els.active.textContent = sel.name;

    if (els.tier) els.tier.textContent = "Tier: " + sel.tier;
    if (els.stage) els.stage.textContent = "Stage: " + sel.stage;
    if (els.summary) els.summary.textContent = sel.summary;
    if (els.updated) els.updated.textContent = "Updated: " + sel.updated;

    const n = state.notesByProject[sel.id] || "";
    if (els.notes) els.notes.value = n;

    if (els.tags){
      const tags = (sel.tags || []);
      els.tags.textContent = "// tags\n" + (tags.length ? tags.map(t => "- " + t).join("\n") : "(none)");
    }

    renderTasks(state.tasksByProject[sel.id] || []);
  }

  function renderTasks(tasks){
    if(!els.next) return;
    els.next.innerHTML = "";

    if(tasks.length === 0){
      const div = document.createElement("div");
      div.className = "pr-item";
      div.innerHTML = `<div class="t">No tasks</div><div class="m">Add one below (visual).</div>`;
      els.next.appendChild(div);
      return;
    }

    tasks.forEach(t => {
      const div = document.createElement("div");
      div.className = "pr-item";
      div.innerHTML = `<div class="t">${esc(t.text)}</div><div class="m">${esc(t.tag)}</div>`;
      els.next.appendChild(div);
    });
  }

  function renderAudit(){
    if(!els.log) return;
    const lines = ["// audit log (visual)", ""];
    state.audit.slice(0, 20).forEach(a => lines.push(`${a.ts}  ${a.msg}`));
    els.log.textContent = lines.join("\n");
  }

  function renderSnapshot(){
    if(!els.state) return;
    const snap = {
      v: state.v,
      scope: state.scope,
      selectedId: state.selectedId,
      projects: state.projects.map(p => ({ id:p.id, tier:p.tier, stage:p.stage })),
      auditCount: state.audit.length
    };
    els.state.textContent = "// state snapshot\n" + JSON.stringify(snap, null, 2);
  }

  function select(id){
    state.selectedId = id;
    audit("select:" + id);
    save();
    render();
  }

  function addTask(){
    const sel = getSel();
    if(!sel) return;

    const txt = (els.taskIn?.value || "").trim();
    if(!txt) return;

    state.tasksByProject[sel.id] = state.tasksByProject[sel.id] || [];
    state.tasksByProject[sel.id].unshift({
      id: "t" + Math.random().toString(16).slice(2),
      text: txt,
      tag: "task"
    });

    if (els.taskIn) els.taskIn.value = "";
    audit("task:add:" + sel.id);
    save();
    render();
  }

  function saveNotes(){
    const sel = getSel();
    if(!sel) return;

    state.notesByProject[sel.id] = (els.notes?.value || "");
    sel.updated = now();

    audit("notes:save:" + sel.id);
    save();
    render();
  }

  function newProject(){
    const name = prompt("New project name?");
    if(!name) return;

    const id = slug(name) || ("p-" + Date.now());
    const scope = prompt("Scope? (portal/apps/agents/creative)", "portal") || "portal";
    const summary = prompt("Summary?", "New project (visual)") || "";

    state.projects.unshift({
      id, name, scope,
      tier: "canonical",
      stage: "visual-ui",
      updated: now(),
      tags: ["new"],
      summary
    });

    audit("project:new:" + id);
    state.selectedId = id;
    save();
    render();
  }

  function cloneProject(){
    const sel = getSel();
    if(!sel) return;

    const name = prompt("Clone name?", sel.name + " (clone)");
    if(!name) return;

    const id = slug(name) || ("c-" + Date.now());
    const copy = JSON.parse(JSON.stringify(sel));
    copy.id = id;
    copy.name = name;
    copy.updated = now();

    state.projects.unshift(copy);
    audit("project:clone:" + id);
    state.selectedId = id;
    save();
    render();
  }

  function archiveProject(){
    const sel = getSel();
    if(!sel) return;

    const ok = confirm(`Archive "${sel.name}"? (visual)`);
    if(!ok) return;

    sel.tier = "archived";
    sel.stage = "paused";
    sel.updated = now();

    audit("project:archive:" + sel.id);
    save();
    render();
  }

  function exportJSON(){
    const blob = new Blob([JSON.stringify(state, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "projects-visual-state.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    audit("export:json");
    save();
    render();
  }

  function resetAll(){
    const ok = confirm("Reset Projects visual state?");
    if(!ok) return;
    state = defaultState();
    save();
    render();
    audit("reset");
  }

  function run(stage){
    const sel = getSel();
    audit(`run:${stage}:${sel ? sel.id : "none"}`);
    save();
    render();
  }

  function slug(s){
    return String(s).toLowerCase().trim()
      .replace(/[^a-z0-9]+/g,"-")
      .replace(/^-+|-+$/g,"")
      .slice(0,40);
  }

  function esc(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function wire(){
    els.scope?.addEventListener("change", () => {
      state.scope = els.scope.value;
      audit("scope:" + state.scope);
      save();
      render();
    });

    els.search?.addEventListener("input", render);

    els.taskAdd?.addEventListener("click", addTask);
    els.taskIn?.addEventListener("keydown", (e) => {
      if(e.key === "Enter"){
        e.preventDefault();
        addTask();
      }
    });

    els.newBtn?.addEventListener("click", newProject);
    els.cloneBtn?.addEventListener("click", cloneProject);
    els.archiveBtn?.addEventListener("click", archiveProject);
    els.saveBtn?.addEventListener("click", saveNotes);
    els.exportBtn?.addEventListener("click", exportJSON);
    els.resetBtn?.addEventListener("click", resetAll);

    els.runPlan?.addEventListener("click", () => run("plan"));
    els.runBuild?.addEventListener("click", () => run("build"));
    els.runShip?.addEventListener("click", () => run("ship"));
  }

  document.addEventListener("DOMContentLoaded", () => {
    wire();
    save();
    renderAudit();
    renderSnapshot();
    render();
  });
})();
