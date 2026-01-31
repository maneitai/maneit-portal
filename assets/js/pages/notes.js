/* Page-isolated: Notes (visual/UI-only)
   - localStorage persists notes, pinned list, tasks, audit
*/

(function () {
  const LS = "notes_visual_v1";
  const $ = (s, r = document) => r.querySelector(s);

  const els = {
    book: $("#nBook"),
    search: $("#nSearch"),
    list: $("#nList"),

    newBtn: $("#nNew"),
    pinBtn: $("#nPin"),
    delBtn: $("#nDelete"),

    sel: $("#nSel"),
    selMeta: $("#nSelMeta"),

    active: $("#nActive"),
    updated: $("#nUpdated"),
    status: $("#nStatus"),

    title: $("#nTitle"),
    body: $("#nBody"),
    tags: $("#nTags"),

    saveBtn: $("#nSave"),
    exportBtn: $("#nExport"),
    clearBtn: $("#nClear"),

    bookPill: $("#nBookPill"),
    backlinks: $("#nBacklinks"),
    pinned: $("#nPinned"),

    tasks: $("#nTasks"),
    taskIn: $("#nTaskIn"),
    taskAdd: $("#nTaskAdd"),
    taskClear: $("#nTaskClear"),

    audit: $("#nAudit"),
  };

  const def = () => ({
    v: 1,
    book: "portal",
    selectedId: null,
    pinnedIds: [],
    notes: [
      { id:"n1", book:"portal", title:"Home final plan", tags:["calendar","comms"], updated: now(), body:"- Calendar placeholder\n- Teams + Discord placeholders\n- Later: sync to server\n" },
      { id:"n2", book:"agentfactory", title:"AgentFactory scope lock", tags:["agents","models","layers"], updated: now(), body:"Canonical panels:\n- Library (agents/models/layers)\n- Workbench (spec/build/deploy/audit)\n- Targets + binding\n- Terminal (admin toggle)\n" },
      { id:"n3", book:"appcreator", title:"App templates", tags:["apps","cli","gui"], updated: now(), body:"Define template variants:\n- CLI only\n- CLI + GUI\n- Installer bootstrap\n" },
    ],
    tasks: [],
    audit: []
  });

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(LS);
      if (!raw) return def();
      const parsed = JSON.parse(raw);
      return { ...def(), ...parsed };
    } catch {
      return def();
    }
  }

  function save() {
    try { localStorage.setItem(LS, JSON.stringify(state)); } catch {}
    renderAudit();
  }

  function now(){
    const d = new Date();
    const pad = n => String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function audit(msg){
    state.audit.unshift({ ts: now(), msg });
    if(state.audit.length > 40) state.audit.length = 40;
  }

  function getSel(){
    return state.notes.find(n => n.id === state.selectedId) || null;
  }

  function render(){
    if (!els.book || !els.list) return;

    els.book.value = state.book;
    if (els.bookPill) els.bookPill.textContent = "Book: " + state.book;

    const q = (els.search?.value || "").trim().toLowerCase();
    const items = state.notes
      .filter(n => n.book === state.book)
      .filter(n => {
        const hay = (n.title + " " + (n.body||"") + " " + (n.tags||[]).join(" ")).toLowerCase();
        return !q || hay.includes(q);
      });

    els.list.innerHTML = "";
    items.forEach(n => {
      const div = document.createElement("div");
      div.className = "nt-item" + (state.selectedId === n.id ? " is-active" : "");
      div.tabIndex = 0;
      div.innerHTML = `<div class="t">${esc(n.title)}</div><div class="m">${esc((n.tags||[]).join(", "))}</div>`;
      div.addEventListener("click", () => select(n.id));
      div.addEventListener("keydown", (e) => {
        if(e.key === "Enter" || e.key === " "){
          e.preventDefault();
          select(n.id);
        }
      });
      els.list.appendChild(div);
    });

    renderPinned();
    renderTasks();
    renderSelection();
    renderAudit();
  }

  function renderSelection(){
    const sel = getSel();
    if(!sel){
      if (els.sel) els.sel.textContent = "None";
      if (els.selMeta) els.selMeta.textContent = "Pick a note.";
      if (els.active) els.active.textContent = "No selection";
      if (els.updated) els.updated.textContent = "Updated: —";
      if (els.title) els.title.value = "";
      if (els.body) els.body.value = "";
      if (els.tags) els.tags.value = "";
      if (els.backlinks) els.backlinks.textContent = "// none";
      if (els.status) els.status.textContent = "Draft";
      return;
    }

    if (els.sel) els.sel.textContent = sel.title;
    if (els.selMeta) els.selMeta.textContent = (sel.tags || []).join(", ") || "—";
    if (els.active) els.active.textContent = sel.title;
    if (els.updated) els.updated.textContent = "Updated: " + sel.updated;

    if (els.title) els.title.value = sel.title;
    if (els.body) els.body.value = sel.body || "";
    if (els.tags) els.tags.value = (sel.tags || []).join(", ");

    if (els.backlinks) els.backlinks.textContent = "// (visual)\n- projects:" + (sel.book || "portal");
    if (els.status) els.status.textContent = state.pinnedIds.includes(sel.id) ? "Pinned" : "Draft";
  }

  function renderPinned(){
    if (!els.pinned) return;
    const pins = state.pinnedIds.map(id => state.notes.find(n => n.id === id)).filter(Boolean);
    if(pins.length === 0){ els.pinned.textContent = "// none"; return; }
    els.pinned.textContent = "// pinned\n" + pins.map(p => "- " + p.title).join("\n");
  }

  function renderTasks(){
    if(!els.tasks) return;
    els.tasks.innerHTML = "";

    if(state.tasks.length === 0){
      const div = document.createElement("div");
      div.className = "nt-item";
      div.innerHTML = `<div class="t">No tasks</div><div class="m">Add tasks from notes (visual).</div>`;
      els.tasks.appendChild(div);
      return;
    }

    state.tasks.slice(0,10).forEach(t => {
      const div = document.createElement("div");
      div.className = "nt-item";
      div.innerHTML = `<div class="t">${esc(t.text)}</div><div class="m">${esc(t.from)}</div>`;
      els.tasks.appendChild(div);
    });
  }

  function renderAudit(){
    if(!els.audit) return;
    const lines = ["// audit (visual)", ""];
    state.audit.slice(0,20).forEach(a => lines.push(`${a.ts}  ${a.msg}`));
    els.audit.textContent = lines.join("\n");
  }

  function select(id){
    state.selectedId = id;
    audit("select:" + id);
    save();
    render();
  }

  function newNote(){
    const title = prompt("New note title?");
    if(!title) return;

    const id = "n" + Math.random().toString(16).slice(2);
    state.notes.unshift({ id, book: state.book, title, tags:["new"], updated: now(), body:"" });
    state.selectedId = id;

    audit("note:new:" + id);
    save();
    render();
  }

  function saveNote(){
    const sel = getSel();
    if(!sel) return;

    sel.title = (els.title?.value || "").trim() || sel.title;
    sel.body = els.body?.value || "";
    sel.tags = (els.tags?.value || "").split(",").map(x => x.trim()).filter(Boolean);
    sel.updated = now();

    audit("note:save:" + sel.id);
    save();
    render();
  }

  function pinToggle(){
    const sel = getSel();
    if(!sel) return;

    const i = state.pinnedIds.indexOf(sel.id);
    if(i >= 0){
      state.pinnedIds.splice(i,1);
      audit("pin:off:" + sel.id);
    } else {
      state.pinnedIds.unshift(sel.id);
      audit("pin:on:" + sel.id);
    }

    save();
    render();
  }

  function delNote(){
    const sel = getSel();
    if(!sel) return;

    const ok = confirm(`Delete "${sel.title}"? (visual)`);
    if(!ok) return;

    state.notes = state.notes.filter(n => n.id !== sel.id);
    state.pinnedIds = state.pinnedIds.filter(id => id !== sel.id);
    state.selectedId = null;

    audit("note:delete:" + sel.id);
    save();
    render();
  }

  function exportNote(){
    const sel = getSel();
    if(!sel) return;

    const blob = new Blob([JSON.stringify(sel, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `note-${sel.id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    audit("export:note:" + sel.id);
    save();
    render();
  }

  function clearEditor(){
    if (els.title) els.title.value = "";
    if (els.body) els.body.value = "";
    if (els.tags) els.tags.value = "";
    audit("editor:clear");
    save();
    render();
  }

  function addTask(){
    const txt = (els.taskIn?.value || "").trim();
    if(!txt) return;

    const sel = getSel();
    state.tasks.unshift({
      id: "t" + Math.random().toString(16).slice(2),
      text: txt,
      from: sel ? sel.title : "notes"
    });

    if (els.taskIn) els.taskIn.value = "";
    audit("task:add");
    save();
    render();
  }

  function clearTasks(){
    state.tasks = [];
    audit("tasks:clear");
    save();
    render();
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
    els.book?.addEventListener("change", () => {
      state.book = els.book.value;
      state.selectedId = null;
      audit("book:" + state.book);
      save();
      render();
    });

    els.search?.addEventListener("input", render);

    els.newBtn?.addEventListener("click", newNote);
    els.saveBtn?.addEventListener("click", saveNote);
    els.pinBtn?.addEventListener("click", pinToggle);
    els.delBtn?.addEventListener("click", delNote);

    els.exportBtn?.addEventListener("click", exportNote);
    els.clearBtn?.addEventListener("click", clearEditor);

    els.taskAdd?.addEventListener("click", addTask);
    els.taskIn?.addEventListener("keydown", (e) => {
      if(e.key === "Enter"){
        e.preventDefault();
        addTask();
      }
    });

    els.taskClear?.addEventListener("click", clearTasks);
  }

  document.addEventListener("DOMContentLoaded", () => {
    wire();
    save();
    render();
  });
})();

