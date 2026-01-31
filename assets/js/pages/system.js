/* Page-isolated: System (visual/UI-only)
   - localStorage persists admin toggle, targets, terminal output, logs
*/

(function () {
  const LS = "system_visual_v1";
  const $ = (s, r = document) => r.querySelector(s);

  const els = {
    filter: $("#sFilter"),
    search: $("#sSearch"),
    list: $("#sList"),
    nodeSnap: $("#sNodeSnap"),

    dashTitle: $("#sDashTitle"),
    health: $("#sHealthPill"),
    uptime: $("#sUptimePill"),
    metrics: $("#sMetrics"),
    services: $("#sServices"),

    selectedPill: $("#sSelectedPill"),
    adminPill: $("#sAdminPill"),
    adminToggle: $("#sAdminToggle"),

    termLock: $("#sTermLock"),
    termOut: $("#sTermOut"),
    termIn: $("#sTermIn"),
    termRun: $("#sTermRun"),

    targets: $("#sTargets"),
    selectAll: $("#sSelectAll"),
    clearAll: $("#sClearAll"),

    logs: $("#sLogs"),
    clearLogs: $("#sClearLogs"),

    ping: $("#sPing"),
    wake: $("#sWake"),
    sleep: $("#sSleep"),

    deployAF: $("#sDeployAgentFactory"),
    deployAC: $("#sDeployAppCreator"),
    syncRepo: $("#sSyncRepo"),
    restartSvc: $("#sRestartSvc"),

    net: $("#sNet"),
    modePill: $("#sModePill"),
  };

  const def = () => ({
    v: 1,
    admin: false,
    selectedId: null,
    nodes: [
      { id:"win-main", name:"Windows Main", os:"win", kind:"gpu", meta:"9800X3D / RX 9070XT", health:"ok", uptime:"6h", cpu:28, gpu:12, ram:41, disk:62, services:["portal","sync","models"] },
      { id:"gpu-node", name:"GPU Node", os:"win", kind:"gpu", meta:"16-core / RTX 5080", health:"ok", uptime:"14h", cpu:34, gpu:22, ram:53, disk:48, services:["orchestrator","models","queue"] },
      { id:"fedora-jelly", name:"Fedora Jelly", os:"linux", kind:"gpu", meta:"AMD GPU node", health:"warn", uptime:"2d", cpu:18, gpu:44, ram:37, disk:71, services:["models","storage"] },
      { id:"cpu-node", name:"CPU Node", os:"linux", kind:"cpu", meta:"5700X / no GPU", health:"ok", uptime:"9h", cpu:12, gpu:0, ram:22, disk:33, services:["worker","jobs"] },
    ],
    targets: { "win-main": true, "gpu-node": true, "fedora-jelly": false, "cpu-node": false },
    termOut: "System terminal is visual-only.\nAdmin is OFF.\n",
    logs: []
  });

  let state = load();

  function load(){
    try{
      const raw = localStorage.getItem(LS);
      if(!raw) return def();
      const parsed = JSON.parse(raw);
      return { ...def(), ...parsed };
    }catch{
      return def();
    }
  }

  function save(){
    try{ localStorage.setItem(LS, JSON.stringify(state)); }catch{}
    renderLogs();
  }

  function now(){
    const d = new Date();
    const pad = n => String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function log(msg){
    state.logs.unshift({ ts: now(), msg });
    if(state.logs.length > 80) state.logs.length = 80;
  }

  function getSel(){
    return state.nodes.find(n => n.id === state.selectedId) || null;
  }

  function render(){
    renderList();
    renderTargets();
    renderSelection();
    renderTerminal();
    renderLogs();

    if (els.net) els.net.textContent = "Net: OK";
    if (els.modePill) els.modePill.textContent = "Mode: observe";
  }

  function renderList(){
    if(!els.list) return;

    const q = (els.search?.value || "").trim().toLowerCase();
    const f = els.filter?.value || "all";

    const items = state.nodes.filter(n => {
      const okF = f === "all"
        ? true
        : (f === "win" ? n.os === "win"
          : f === "linux" ? n.os === "linux"
          : f === "gpu" ? n.kind === "gpu"
          : n.kind === "cpu");

      const hay = (n.name + " " + n.meta + " " + n.os + " " + n.kind).toLowerCase();
      return okF && (!q || hay.includes(q));
    });

    els.list.innerHTML = "";
    items.forEach(n => {
      const div = document.createElement("div");
      div.className = "sy-item" + (state.selectedId === n.id ? " is-active" : "");
      div.tabIndex = 0;
      div.innerHTML = `<div class="t">${esc(n.name)}</div><div class="m">${esc(n.meta)} • ${esc(n.os)} • ${esc(n.kind)}</div>`;
      div.addEventListener("click", () => select(n.id));
      div.addEventListener("keydown", (e) => {
        if(e.key === "Enter" || e.key === " "){
          e.preventDefault();
          select(n.id);
        }
      });
      els.list.appendChild(div);
    });
  }

  function select(id){
    state.selectedId = id;
    const sel = getSel();
    if (els.selectedPill) els.selectedPill.textContent = "Selected: " + (sel ? sel.id : "none");
    log("select:" + id);
    save();
    render();
  }

  function renderSelection(){
    const sel = getSel();

    if(!sel){
      if (els.nodeSnap) els.nodeSnap.textContent = "// select a node";
      if (els.dashTitle) els.dashTitle.textContent = "No node";
      if (els.health) els.health.textContent = "Health: —";
      if (els.uptime) els.uptime.textContent = "Uptime: —";
      if (els.metrics) els.metrics.innerHTML = "";
      if (els.services) els.services.innerHTML = "";
      return;
    }

    if (els.nodeSnap){
      els.nodeSnap.textContent = JSON.stringify({
        id: sel.id,
        os: sel.os,
        kind: sel.kind,
        meta: sel.meta,
        health: sel.health
      }, null, 2);
    }

    if (els.dashTitle) els.dashTitle.textContent = sel.name;
    if (els.health) els.health.textContent = "Health: " + sel.health.toUpperCase();
    if (els.uptime) els.uptime.textContent = "Uptime: " + sel.uptime;

    renderMetrics(sel);
    renderServices(sel);
  }

  function renderMetrics(sel){
    if(!els.metrics) return;

    const cards = [
      { k:"CPU", v: sel.cpu + "%" },
      { k:"GPU", v: sel.gpu + "%" },
      { k:"RAM", v: sel.ram + "%" },
      { k:"Disk", v: sel.disk + "%" },
      { k:"Net", v: "stable" },
      { k:"Queue", v: "idle" },
    ];

    els.metrics.innerHTML = "";
    cards.forEach(c => {
      const d = document.createElement("div");
      d.className = "sy-metric";
      d.innerHTML = `<div class="k">${esc(c.k)}</div><div class="v">${esc(c.v)}</div>`;
      els.metrics.appendChild(d);
    });
  }

  function renderServices(sel){
    if(!els.services) return;
    els.services.innerHTML = "";
    sel.services.forEach(s => {
      const span = document.createElement("span");
      span.className = "sy-pill sy-ok";
      span.textContent = s;
      els.services.appendChild(span);
    });
  }

  function renderTargets(){
    if(!els.targets) return;
    els.targets.innerHTML = "";

    state.nodes.forEach(n => {
      const wrap = document.createElement("label");
      wrap.className = "sy-row sy-tight";
      wrap.style.cursor = "pointer";
      wrap.style.userSelect = "none";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!state.targets[n.id];
      cb.style.width = "18px";
      cb.style.height = "18px";
      cb.style.marginTop = "3px";

      cb.addEventListener("change", () => {
        state.targets[n.id] = cb.checked;
        log("target:" + n.id + "=" + (cb.checked ? "on" : "off"));
        save();
      });

      const meta = document.createElement("div");
      meta.innerHTML = `<div style="font-size:13px;margin-bottom:2px;">${esc(n.name)}</div><div class="sy-muted2">${esc(n.meta)}</div>`;

      wrap.appendChild(cb);
      wrap.appendChild(meta);
      els.targets.appendChild(wrap);
    });
  }

  function renderTerminal(){
    if (els.adminPill) els.adminPill.textContent = "Admin: " + (state.admin ? "ON" : "OFF");
    if (els.termLock) els.termLock.textContent = state.admin ? "unlocked" : "locked";
    if (els.termOut){
      els.termOut.textContent = state.termOut || "";
      els.termOut.scrollTop = els.termOut.scrollHeight;
    }
  }

  function toggleAdmin(){
    state.admin = !state.admin;
    log("admin:" + (state.admin ? "on" : "off"));
    state.termOut += `${now()}  SYS> Admin is now ${state.admin ? "ON" : "OFF"} (visual)\n`;
    save();
    render();
  }

  function runCmd(){
    const cmd = (els.termIn?.value || "").trim();
    if(!cmd) return;

    const ts = now();
    const prefix = state.admin ? "ADMIN" : "USER";
    const looksPriv =
      /(^sudo\s)|(^rm\s)|(^del\s)|(^format\s)|(^diskpart)|(^reg\s)|(^shutdown)|(^bcdedit)|(^netsh)|(^Set-ExecutionPolicy)/i.test(cmd);

    state.termOut += `${ts}  ${prefix}> ${cmd}\n`;
    if(!state.admin && looksPriv){
      state.termOut += `!! blocked (visual): admin required\n`;
      log("term:block:" + cmd);
    } else {
      state.termOut += `ok (visual): queued\n`;
      log("term:run:" + cmd);
    }

    if(state.termOut.length > 12000) state.termOut = state.termOut.slice(-12000);
    if (els.termIn) els.termIn.value = "";
    save();
    render();
  }

  function quick(msg){
    const sel = getSel();
    log(msg + ":" + (sel ? sel.id : "none"));
    state.termOut += `${now()}  SYS> ${msg} (visual)\n`;
    save();
    render();
  }

  function ping(){ quick("ping"); }
  function wake(){ quick("wake"); }
  function sleep(){ quick("sleep"); }

  function deployAF(){ quick("deploy:agentfactory"); }
  function deployAC(){ quick("deploy:appcreator"); }
  function syncRepo(){ quick("sync:repo"); }
  function restartSvc(){ quick("restart:services"); }

  function selectAll(){
    state.nodes.forEach(n => state.targets[n.id] = true);
    log("targets:selectAll");
    save();
    renderTargets();
  }

  function clearAll(){
    state.nodes.forEach(n => state.targets[n.id] = false);
    log("targets:clear");
    save();
    renderTargets();
  }

  function renderLogs(){
    if(!els.logs) return;
    const lines = ["// logs (visual)", ""];
    state.logs.slice(0,30).forEach(l => lines.push(`${l.ts}  ${l.msg}`));
    els.logs.textContent = lines.join("\n");
  }

  function clearLogs(){
    state.logs = [];
    log("logs:cleared");
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
    els.filter?.addEventListener("change", renderList);
    els.search?.addEventListener("input", renderList);

    els.adminToggle?.addEventListener("click", toggleAdmin);
    els.termRun?.addEventListener("click", runCmd);
    els.termIn?.addEventListener("keydown", (e) => {
      if(e.key === "Enter"){
        e.preventDefault();
        runCmd();
      }
    });

    els.selectAll?.addEventListener("click", selectAll);
    els.clearAll?.addEventListener("click", clearAll);
    els.clearLogs?.addEventListener("click", clearLogs);

    els.ping?.addEventListener("click", ping);
    els.wake?.addEventListener("click", wake);
    els.sleep?.addEventListener("click", sleep);

    els.deployAF?.addEventListener("click", deployAF);
    els.deployAC?.addEventListener("click", deployAC);
    els.syncRepo?.addEventListener("click", syncRepo);
    els.restartSvc?.addEventListener("click", restartSvc);
  }

  document.addEventListener("DOMContentLoaded", () => {
    log("boot");
    save();
    wire();
    render();
  });
})();
