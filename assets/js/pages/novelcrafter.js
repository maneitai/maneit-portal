/* novelcrafter.js — page-isolated UI logic (no backend) */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const uid = () => Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
  const esc = (s) =>
    String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;

  // ===== Demo data (UI-only) =====
  const PROJECTS = {
    gylfagard: {
      name: "Guldardal Chronicles",
      modules: {
        world: [
          { id:"w1", title:"Kingdom overview", tags:"kingdom,overview", body:"" },
          { id:"w2", title:"Geography", tags:"map,biomes", body:"" },
          { id:"w3", title:"Magic rules", tags:"magic,rules", body:"" },
        ],
        characters: [
          { id:"c1", title:"Storm", tags:"protagonist", body:"" },
          { id:"c2", title:"Thor the Goblinlord", tags:"goblin,lord", body:"" },
          { id:"c3", title:"Beanie", tags:"ally", body:"" },
        ],
        lore: [
          { id:"l1", title:"The Old Kings", tags:"history", body:"" },
          { id:"l2", title:"Runes & blood", tags:"magic", body:"" },
          { id:"l3", title:"The winter pact", tags:"religion", body:"" },
        ],
        plot: [
          { id:"p1", title:"Act I — Setup", tags:"act1", body:"" },
          { id:"p2", title:"Act II — Pressure", tags:"act2", body:"" },
          { id:"p3", title:"Act III — Resolution", tags:"act3", body:"" },
        ],
        scenes: [
          { id:"s1", title:"Arrival at the fjord", tags:"arrival", body:"" },
          { id:"s2", title:"The oath", tags:"oath", body:"" },
          { id:"s3", title:"Ambush in the pines", tags:"ambush", body:"" },
        ],
        assets: [
          { id:"a1", title:"Moodboard", tags:"mood", body:"" },
          { id:"a2", title:"Map drafts", tags:"map", body:"" },
        ],
        prompts: [
          { id:"pr1", title:"Scene draft template", tags:"prompt", body:"" },
          { id:"pr2", title:"Character sheet template", tags:"prompt", body:"" },
        ]
      },
      storyline: {
        canonLock: true,
        bookNo: 1,
        beats: [
          { id:"b1", text:"Inciting incident: the winter pact is broken", flags:"canon" },
          { id:"b2", text:"Protagonist forced to choose: oath vs survival", flags:"canon" },
          { id:"b3", text:"Reveal: runes demand blood as payment", flags:"canon" },
          { id:"b4", text:"Midpoint: alliance with the wrong faction", flags:"" },
          { id:"b5", text:"Climax: sacrifice to restore balance", flags:"canon" },
        ]
      }
    },
    iskald: {
      name: "ISKALD (placeholder)",
      modules: {
        world: [{ id:"iw1", title:"City blocks", tags:"urban,night", body:"" }],
        characters: [{ id:"ic1", title:"Narrator", tags:"voice", body:"" }],
        lore: [{ id:"il1", title:"Origin myth", tags:"lore", body:"" }],
        plot: [{ id:"ip1", title:"Arc skeleton", tags:"plot", body:"" }],
        scenes: [{ id:"is1", title:"Opening scene", tags:"scene", body:"" }],
        assets: [{ id:"ia1", title:"Visual refs", tags:"refs", body:"" }],
        prompts: [{ id:"ipr1", title:"Style guide prompt", tags:"prompt", body:"" }],
      },
      storyline: {
        canonLock: true,
        bookNo: 1,
        beats: [
          { id:"ib1", text:"Core tone locked (cold minimal)", flags:"canon" },
          { id:"ib2", text:"Recurring motif: winter / neon", flags:"canon" },
        ]
      }
    }
  };

  // ===== State (UI-only) =====
  const state = {
    projectKey: "gylfagard",
    moduleKey: "world",
    activeNodeId: null,
    activeBeatId: null,

    chats: [],
    activeChatId: null
  };

  // ===== DOM =====
  const projectSelect = $("projectSelect");
  const moduleTabs = $("moduleTabs");
  const libSearch = $("libSearch");
  const libList = $("libList");

  const chatProjectLabel = $("chatProjectLabel");
  const chatModuleLabel = $("chatModuleLabel");
  const chatList = $("chatList");
  const chatMsgs = $("chatMsgs");
  const chatInput = $("chatInput");
  const sendBtn = $("sendBtn");
  const modelSelect = $("modelSelect");
  const chatNewBtn = $("chatNewBtn");
  const chatNewBtn2 = $("chatNewBtn2");

  const canonState = $("canonState");
  const bookNo = $("bookNo");
  const beatsEl = $("beats");
  const beatInput = $("beatInput");
  const beatAddBtn = $("beatAddBtn");
  const beatAddQuick = $("beatAddQuick");
  const beatEditBtn = $("beatEditBtn");
  const beatDelBtn = $("beatDelBtn");
  const beatUpBtn = $("beatUpBtn");
  const beatDownBtn = $("beatDownBtn");
  const toggleCanonBtn = $("toggleCanonBtn");
  const bookPlusBtn = $("bookPlusBtn");
  const runLaterBtn = $("runLaterBtn");

  const worldMiniList = $("worldMiniList");
  const charMiniList = $("charMiniList");
  const chapMiniList = $("chapMiniList");
  const worldCountChip = $("worldCountChip");
  const charCountChip = $("charCountChip");

  const worldOpenBtn = $("worldOpenBtn");
  const charOpenBtn = $("charOpenBtn");
  const chapOpenBtn = $("chapOpenBtn");

  const libAddBtn = $("libAddBtn");
  const libDupBtn = $("libDupBtn");
  const libDelBtn = $("libDelBtn");

  const selectedNodeBox = $("selectedNodeBox");

  // ===== Helpers =====
  function project(){ return PROJECTS[state.projectKey]; }
  function moduleNodes(){ return project().modules[state.moduleKey] || []; }
  function storyline(){ return project().storyline; }

  // ===== Module switching =====
  function setModule(modKey){
    state.moduleKey = modKey;
    state.activeNodeId = null;

    moduleTabs.querySelectorAll(".mtab").forEach(t => t.classList.toggle("active", t.dataset.mod === modKey));
    chatModuleLabel.textContent = "Module: " + cap(modKey);

    renderLibrary();
    renderSelectedNode(null);
  }

  // ===== Library rendering =====
  function renderLibrary(){
    const q = (libSearch.value || "").trim().toLowerCase();
    const items = moduleNodes().filter(n => {
      if(!q) return true;
      return (n.title||"").toLowerCase().includes(q) || (n.tags||"").toLowerCase().includes(q);
    });

    libList.innerHTML = "";
    for(const n of items){
      const div = document.createElement("div");
      div.className = "libItem mono" + (n.id === state.activeNodeId ? " active" : "");
      div.innerHTML = `<strong>${esc(n.title)}</strong><div class="libMeta muted">${esc(n.tags || "")}</div>`;
      div.addEventListener("click", () => {
        state.activeNodeId = n.id;
        renderLibrary();
        renderSelectedNode(n);
      });
      libList.appendChild(div);
    }

    if(items.length === 0){
      libList.innerHTML = `<div class="mono muted" style="margin-top:8px;">No nodes.</div>`;
    }

    renderSecondaryPanels();
  }

  function renderSelectedNode(node){
    if(!selectedNodeBox) return;
    if(!node){
      selectedNodeBox.innerHTML = "<strong>None</strong>";
      return;
    }
    selectedNodeBox.innerHTML = `<strong>${esc(node.title)}</strong><div class="muted mono" style="margin-top:6px;">${esc(node.tags || "")}</div>`;
  }

  function addNode(){
    const title = (prompt("Title:") || "").trim();
    if(!title) return;
    const nodes = project().modules[state.moduleKey] || (project().modules[state.moduleKey] = []);
    const n = { id: uid(), title, tags:"", body:"" };
    nodes.unshift(n);
    state.activeNodeId = n.id;
    renderLibrary();
    renderSelectedNode(n);
  }

  function duplicateNode(){
    if(!state.activeNodeId) return alert("Select a node first.");
    const nodes = moduleNodes();
    const n = nodes.find(x => x.id === state.activeNodeId);
    if(!n) return;
    const copy = { ...n, id: uid(), title: n.title + " (copy)" };
    nodes.unshift(copy);
    state.activeNodeId = copy.id;
    renderLibrary();
    renderSelectedNode(copy);
  }

  function deleteNode(){
    if(!state.activeNodeId) return alert("Select a node first.");
    const ok = confirm("Delete selected node? (UI-only)");
    if(!ok) return;
    const nodes = moduleNodes();
    const idx = nodes.findIndex(x => x.id === state.activeNodeId);
    if(idx >= 0) nodes.splice(idx, 1);
    state.activeNodeId = null;
    renderLibrary();
    renderSelectedNode(null);
  }

  // ===== Secondary panels =====
  function renderSecondaryPanels(){
    const w = project().modules.world || [];
    if(worldCountChip) worldCountChip.textContent = "Nodes: " + w.length;
    if(worldMiniList){
      worldMiniList.innerHTML = w.slice(0, 6).map(x =>
        `<div class="libItem mono" style="cursor:default;"><strong>${esc(x.title)}</strong><div class="libMeta muted">${esc(x.tags||"")}</div></div>`
      ).join("") || `<div class="mono muted">No world nodes.</div>`;
    }

    const c = project().modules.characters || [];
    if(charCountChip) charCountChip.textContent = "Nodes: " + c.length;
    if(charMiniList){
      charMiniList.innerHTML = c.slice(0, 6).map(x =>
        `<div class="libItem mono" style="cursor:default;"><strong>${esc(x.title)}</strong><div class="libMeta muted">${esc(x.tags||"")}</div></div>`
      ).join("") || `<div class="mono muted">No character nodes.</div>`;
    }

    const s = project().modules.scenes || [];
    if(chapMiniList){
      chapMiniList.innerHTML = s.slice(0, 6).map(x =>
        `<div class="libItem mono" style="cursor:default;"><strong>${esc(x.title)}</strong><div class="libMeta muted">${esc(x.tags||"")}</div></div>`
      ).join("") || `<div class="mono muted">No chapters/scenes yet.</div>`;
    }
  }

  // ===== Project switching =====
  function setProject(key){
    state.projectKey = key;
    state.activeNodeId = null;
    state.activeBeatId = null;

    chatProjectLabel.textContent = "Project: " + project().name;

    setModule(state.moduleKey || "world");
    renderStoryline();
    renderChatMsgs();
  }

  // ===== Chat =====
  function newChat(){
    return { id: uid(), title:"New chat", model: modelSelect?.value || "Local LLM", createdAt: Date.now(), messages: [] };
  }

  function ensureChats(){
    if(state.chats.length === 0){
      const c = newChat();
      state.chats.push(c);
      state.activeChatId = c.id;
    }
    if(!state.activeChatId || !state.chats.some(x => x.id === state.activeChatId)){
      state.activeChatId = state.chats[0].id;
    }
  }

  function activeChat(){ return state.chats.find(c => c.id === state.activeChatId) || null; }

  function renderChatList(){
    chatList.innerHTML = "";
    const sorted = [...state.chats].sort((a,b) => {
      const al = a.messages?.[a.messages.length-1]?.ts ?? a.createdAt;
      const bl = b.messages?.[b.messages.length-1]?.ts ?? b.createdAt;
      return bl - al;
    });

    for(const c of sorted){
      const btn = document.createElement("button");
      btn.className = "chatBtn mono" + (c.id === state.activeChatId ? " active" : "");
      btn.type = "button";
      btn.textContent = c.title;
      btn.addEventListener("click", () => {
        state.activeChatId = c.id;
        renderChatList();
        renderChatMsgs();
      });
      chatList.appendChild(btn);
    }
  }

  function renderChatMsgs(){
    const c = activeChat();
    chatMsgs.innerHTML = "";
    if(!c) return;

    for(const m of c.messages){
      const div = document.createElement("div");
      div.className = "msg mono " + (m.role === "user" ? "user" : "assistant");
      div.innerHTML = `<strong>${m.role === "user" ? "You" : "Model"}:</strong> ${esc(m.text)}`;
      chatMsgs.appendChild(div);
    }
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  }

  function sendMessage(){
    const c = activeChat();
    if(!c) return;
    const t = (chatInput.value || "").trim();
    if(!t) return;

    if(c.title === "New chat"){
      const short = t.replace(/\s+/g," ");
      c.title = short.length > 34 ? short.slice(0,34) + "…" : short;
    }

    c.model = modelSelect?.value || c.model;
    c.messages.push({ id: uid(), role:"user", text:t, ts: Date.now() });

    chatInput.value = "";
    renderChatList();
    renderChatMsgs();

    // UI-only placeholder response (keeps it usable)
    window.setTimeout(() => {
      const spine = storyline().beats.slice(0, 3).map(b => b.text).join(" | ");
      c.messages.push({
        id: uid(),
        role:"assistant",
        text: `(UI-only) Project=${project().name} • Module=${cap(state.moduleKey)} • CanonLock=${storyline().canonLock ? "ON":"OFF"} • Spine: ${spine}${storyline().beats.length > 3 ? " …" : ""}`,
        ts: Date.now()
      });
      renderChatMsgs();
    }, 220);
  }

  function addChat(){
    const c = newChat();
    state.chats.unshift(c);
    state.activeChatId = c.id;
    renderChatList();
    renderChatMsgs();
    chatInput.focus();
  }

  // ===== Storyline =====
  function renderStoryline(){
    const s = storyline();
    canonState.textContent = s.canonLock ? "ON" : "OFF";
    bookNo.textContent = String(s.bookNo);

    beatsEl.innerHTML = "";
    s.beats.forEach((b, i) => {
      const div = document.createElement("div");
      div.className = "beat mono" + (b.id === state.activeBeatId ? " active" : "");
      div.innerHTML = `<strong>${esc((i+1) + ". " + b.text)}</strong><div class="beatMeta muted">${esc(b.flags ? ("flags: " + b.flags) : "flags: —")}</div>`;
      div.addEventListener("click", () => { state.activeBeatId = b.id; renderStoryline(); });
      beatsEl.appendChild(div);
    });

    if(s.beats.length === 0){
      beatsEl.innerHTML = `<div class="mono muted">No beats yet.</div>`;
    }
  }

  function addBeat(){
    const t = (beatInput.value || "").trim();
    if(!t) return;
    const s = storyline();
    const b = { id: uid(), text:t, flags: s.canonLock ? "canon" : "" };
    s.beats.push(b);
    beatInput.value = "";
    state.activeBeatId = b.id;
    renderStoryline();
  }

  function editBeat(){
    const s = storyline();
    if(!state.activeBeatId) return alert("Select a beat first.");
    const b = s.beats.find(x => x.id === state.activeBeatId);
    if(!b) return;
    const next = prompt("Edit beat:", b.text);
    if(next === null) return;
    const v = next.trim();
    if(!v) return;
    b.text = v;
    renderStoryline();
  }

  function deleteBeat(){
    const s = storyline();
    if(!state.activeBeatId) return alert("Select a beat first.");
    const ok = confirm("Delete selected beat? (UI-only)");
    if(!ok) return;
    s.beats = s.beats.filter(x => x.id !== state.activeBeatId);
    state.activeBeatId = null;
    renderStoryline();
  }

  function moveBeat(dir){
    const s = storyline();
    if(!state.activeBeatId) return alert("Select a beat first.");
    const idx = s.beats.findIndex(x => x.id === state.activeBeatId);
    if(idx < 0) return;
    const n = idx + dir;
    if(n < 0 || n >= s.beats.length) return;
    const tmp = s.beats[idx];
    s.beats[idx] = s.beats[n];
    s.beats[n] = tmp;
    renderStoryline();
  }

  function toggleCanon(){
    storyline().canonLock = !storyline().canonLock;
    renderStoryline();
  }

  function bookPlus(){
    storyline().bookNo = Math.min(9, storyline().bookNo + 1);
    renderStoryline();
  }

  // ===== Wire =====
  moduleTabs.querySelectorAll(".mtab").forEach(t => t.addEventListener("click", () => setModule(t.dataset.mod)));
  projectSelect.addEventListener("change", () => setProject(projectSelect.value));
  libSearch.addEventListener("input", renderLibrary);

  libAddBtn.addEventListener("click", addNode);
  libDupBtn.addEventListener("click", duplicateNode);
  libDelBtn.addEventListener("click", deleteNode);

  worldOpenBtn?.addEventListener("click", () => setModule("world"));
  charOpenBtn?.addEventListener("click", () => setModule("characters"));
  chapOpenBtn?.addEventListener("click", () => setModule("scenes"));

  beatAddBtn.addEventListener("click", addBeat);
  beatAddQuick.addEventListener("click", () => beatInput.focus());
  beatInput.addEventListener("keydown", (e) => {
    if(e.key === "Enter"){ e.preventDefault(); addBeat(); }
  });

  beatEditBtn.addEventListener("click", editBeat);
  beatDelBtn.addEventListener("click", deleteBeat);
  beatUpBtn.addEventListener("click", () => moveBeat(-1));
  beatDownBtn.addEventListener("click", () => moveBeat(+1));
  toggleCanonBtn.addEventListener("click", toggleCanon);
  bookPlusBtn.addEventListener("click", bookPlus);
  runLaterBtn.addEventListener("click", () => alert("Run is later. Backend will generate chapters + update state."));

  sendBtn.addEventListener("click", sendMessage);
  chatInput.addEventListener("keydown", (e) => {
    if(e.key === "Enter" && !e.shiftKey){
      e.preventDefault();
      sendMessage();
    }
  });

  chatNewBtn.addEventListener("click", addChat);
  chatNewBtn2.addEventListener("click", addChat);

  // ===== Init =====
  function init(){
    projectSelect.value = state.projectKey;
    chatProjectLabel.textContent = "Project: " + project().name;

    ensureChats();
    renderChatList();
    renderChatMsgs();

    setModule(state.moduleKey);
    renderStoryline();
    renderSecondaryPanels();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
