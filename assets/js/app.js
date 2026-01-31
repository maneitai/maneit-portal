/* assets/js/app.js
   Home — finished UI functionality (no backend)
   - Chat (multi chats, select, send, Enter/Shift+Enter, per-chat model)
   - Today Top 3 editor
   - Calendar editor
   - Chat Hub (Teams/Discord items, select, mark read, route to inbox)
   - Theme/Glass controls (CSS vars) + localStorage
*/

(() => {
  "use strict";

  const STORAGE_KEY = "maneit.portal.home.v1";
  const STORAGE_ENABLED = true;

  const $ = (id) => document.getElementById(id);

  // ===== DOM =====
  const dom = {
    // Chat
    chatList: $("chatList"),
    newChatBtn: $("newChatBtn"),
    chatMessages: $("chatMessages"),
    modelSelect: $("modelSelect"),
    chatInput: $("chatInput"),
    sendChat: $("sendChat"),

    // Today
    todayList: $("todayList"),
    todayAdd: $("todayAdd"),
    todayAddBtn: $("todayAddBtn"),

    // Calendar
    calendarList: $("calendarList"),
    calTime: $("calTime"),
    calText: $("calText"),
    calAddBtn: $("calAddBtn"),

    // Chat Hub
    teamsCount: $("teamsCount"),
    discordCount: $("discordCount"),
    chatHubUnread: $("chatHubUnread"),
    chatHubList: $("chatHubList"),
    hubInboxList: $("hubInboxList"),
    chatHubMarkReadBtn: $("chatHubMarkReadBtn"),
    routeToInboxBtn: $("routeToInboxBtn"),
    chatHubClearBtn: $("chatHubClearBtn"),

    // Theme modal
    openThemeBtn: $("openThemeBtn"),
    themeModal: $("themeModal"),
    closeThemeBtn: $("closeThemeBtn"),
    themeSelect: $("themeSelect"),
    glassAlpha: $("glassAlpha"),
    glassBlur: $("glassBlur"),
  };

  // ===== Theme Presets (keys match theme.css data-theme presets) =====
  const themes = {
    obsidian:   { label: "Obsidian" },
    nord:       { label: "Nord" },
    emerald:    { label: "Emerald" },
    amber:      { label: "Amber" },
    pure:       { label: "Pure Dark" },
    darkforest: { label: "Dark Forest" },
    maneitcyan: { label: "Maneit Cyan" },
  };

  const uid = () => Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);

  let state = {
    chat: { chats: [], activeChatId: null },
    today: { items: ["Keep portal consistent", "Build OS pages", "Integrations later"] },
    calendar: {
      items: [
        { id: uid(), time: "09:00", text: "Focus block" },
        { id: uid(), time: "12:00", text: "Admin" },
        { id: uid(), time: "15:00", text: "Build" },
      ],
    },
    chathub: {
      items: [
        { id: uid(), src: "Teams", text: "@you — Can you check the draft?", unread: true, selected: false },
        { id: uid(), src: "Teams", text: "#ops — Status on portal build?", unread: true, selected: false },
        { id: uid(), src: "Discord", text: "DM — You around?", unread: true, selected: false },
      ],
      inbox: [],
    },
    theme: { themeKey: "obsidian", alpha: 0.10, blur: 14 },
  };

  function save() {
    if (!STORAGE_ENABLED) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { console.warn("save failed", e); }
  }

  function load() {
    if (!STORAGE_ENABLED) return false;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return false;
      state = deepMerge(state, parsed);

      if (!Array.isArray(state.chat.chats)) state.chat.chats = [];
      if (!Array.isArray(state.today.items)) state.today.items = [];
      if (!Array.isArray(state.calendar.items)) state.calendar.items = [];
      if (!Array.isArray(state.chathub.items)) state.chathub.items = [];
      if (!Array.isArray(state.chathub.inbox)) state.chathub.inbox = [];

      if (!state.theme || typeof state.theme !== "object") {
        state.theme = { themeKey: "obsidian", alpha: 0.10, blur: 14 };
      }
      if (!themes[state.theme.themeKey]) state.theme.themeKey = "obsidian";
      if (typeof state.theme.alpha !== "number") state.theme.alpha = 0.10;
      if (typeof state.theme.blur !== "number") state.theme.blur = 14;

      return true;
    } catch {
      return false;
    }
  }

  function deepMerge(base, incoming) {
    if (Array.isArray(base)) return Array.isArray(incoming) ? incoming : base;
    if (base && typeof base === "object") {
      const out = { ...base };
      if (incoming && typeof incoming === "object") {
        for (const k of Object.keys(incoming)) {
          out[k] = deepMerge(base[k], incoming[k]);
        }
      }
      return out;
    }
    return (incoming === undefined ? base : incoming);
  }

  function setCSSVar(name, value) {
    document.documentElement.style.setProperty(name, value);
  }

  function applyTheme() {
    const key = themes[state.theme.themeKey] ? state.theme.themeKey : "obsidian";
    document.documentElement.dataset.theme = key;

    setCSSVar("--glassAlpha", String(state.theme.alpha));
    setCSSVar("--glassBlur", String(state.theme.blur) + "px");

    setCSSVar("--glassA", String(state.theme.alpha));
    setCSSVar("--glass-a", String(state.theme.alpha));
    setCSSVar("--blur", String(state.theme.blur) + "px");
    setCSSVar("--glass-blur", String(state.theme.blur) + "px");
  }

  function ensureChat() {
    if (state.chat.chats.length === 0) {
      const c = newChat();
      state.chat.chats.push(c);
      state.chat.activeChatId = c.id;
    }
    if (!state.chat.activeChatId || !state.chat.chats.some(c => c.id === state.chat.activeChatId)) {
      state.chat.activeChatId = state.chat.chats[0].id;
    }
  }

  function newChat() {
    return {
      id: uid(),
      title: "New chat",
      model: dom.modelSelect?.value || "Local LLM",
      createdAt: Date.now(),
      messages: [],
    };
  }

  function activeChat() {
    return state.chat.chats.find(c => c.id === state.chat.activeChatId) || null;
  }

  function setActiveChat(id) {
    state.chat.activeChatId = id;
    const c = activeChat();
    if (c && dom.modelSelect) dom.modelSelect.value = c.model || dom.modelSelect.value;
    renderChat();
    save();
  }

  function sendUserMessage(text) {
    const c = activeChat();
    if (!c) return;
    const trimmed = (text || "").trim();
    if (!trimmed) return;

    c.model = dom.modelSelect?.value || c.model;
    c.messages.push({ id: uid(), role: "user", text: trimmed, ts: Date.now(), model: c.model });

    if (c.title === "New chat") {
      const short = trimmed.replace(/\s+/g, " ");
      c.title = short.length > 28 ? short.slice(0, 28) + "…" : short;
    }

    dom.chatInput.value = "";
    renderChat();
    save();

    window.setTimeout(() => {
      c.messages.push({
        id: uid(),
        role: "assistant",
        text: "(UI-only) Connected models later. For now this is a local thought log.",
        ts: Date.now(),
        model: c.model,
      });
      renderChat();
      save();
    }, 250);
  }

  function renderChat() {
    dom.chatList.innerHTML = "";
    const chatsSorted = [...state.chat.chats].sort((a, b) => {
      const aLast = a.messages?.[a.messages.length - 1]?.ts ?? a.createdAt;
      const bLast = b.messages?.[b.messages.length - 1]?.ts ?? b.createdAt;
      return bLast - aLast;
    });

    for (const c of chatsSorted) {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.type = "button";
      btn.style.width = "calc(100% - 20px)";
      btn.style.margin = "10px";
      btn.style.opacity = (c.id === state.chat.activeChatId) ? "1" : "0.85";
      btn.style.borderColor = (c.id === state.chat.activeChatId) ? "rgba(125,211,252,0.45)" : "";
      btn.textContent = c.title || "Chat";
      btn.addEventListener("click", () => setActiveChat(c.id));
      dom.chatList.appendChild(btn);
    }

    const c = activeChat();
    dom.chatMessages.innerHTML = "";
    if (!c) return;

    if (dom.modelSelect && c.model) dom.modelSelect.value = c.model;

    for (const m of c.messages) {
      const row = document.createElement("div");
      row.className = "box mono";
      row.style.padding = "10px";
      row.style.borderRadius = "12px";
      row.style.opacity = m.role === "assistant" ? "0.92" : "1";
      row.style.borderColor = m.role === "assistant" ? "rgba(167,139,250,0.22)" : "";
      row.innerHTML = `<strong>${m.role === "assistant" ? "Assistant" : "You"}:</strong> ${escapeHtml(m.text)}`;
      dom.chatMessages.appendChild(row);
    }

    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
  }

  function renderToday() {
    dom.todayList.innerHTML = "";
    const items = state.today.items.slice(0, 3);

    items.forEach((txt, idx) => {
      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.gap = "8px";
      li.style.alignItems = "center";

      const span = document.createElement("span");
      span.textContent = txt;
      span.style.cursor = "text";
      span.title = "Click to edit";

      span.addEventListener("click", () => {
        const next = prompt("Edit item:", txt);
        if (next === null) return;
        const v = next.trim();
        if (!v) return;
        state.today.items[idx] = v;
        renderToday();
        save();
      });

      const del = document.createElement("button");
      del.className = "btn";
      del.type = "button";
      del.style.padding = "6px 10px";
      del.textContent = "×";
      del.title = "Remove";
      del.addEventListener("click", () => {
        state.today.items.splice(idx, 1);
        renderToday();
        save();
      });

      li.appendChild(span);
      li.appendChild(del);
      dom.todayList.appendChild(li);
    });

    if (state.today.items.length > 3) state.today.items = state.today.items.slice(0, 3);
  }

  function addTodayItem() {
    const v = (dom.todayAdd.value || "").trim();
    if (!v) return;
    if (state.today.items.length >= 3) state.today.items[2] = v;
    else state.today.items.push(v);
    dom.todayAdd.value = "";
    renderToday();
    save();
  }

  function renderCalendar() {
    dom.calendarList.innerHTML = "";
    const items = [...state.calendar.items].sort((a, b) => (a.time || "").localeCompare(b.time || ""));

    items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "box mono";
      row.style.padding = "10px";
      row.style.borderRadius = "12px";
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.gap = "10px";

      const left = document.createElement("div");
      left.innerHTML = `<strong>${escapeHtml(it.time)}</strong> ${escapeHtml(it.text)}`;
      left.style.cursor = "text";
      left.title = "Click to edit";

      left.addEventListener("click", () => {
        const nt = prompt("Time (HH:MM):", it.time) ?? it.time;
        const nx = prompt("Text:", it.text);
        if (nx === null) return;
        const t = (nt || "").trim();
        const x = (nx || "").trim();
        if (!t || !x) return;
        it.time = t;
        it.text = x;
        renderCalendar();
        save();
      });

      const del = document.createElement("button");
      del.className = "btn";
      del.type = "button";
      del.style.padding = "6px 10px";
      del.textContent = "×";
      del.title = "Remove";
      del.addEventListener("click", () => {
        state.calendar.items = state.calendar.items.filter(x => x.id !== it.id);
        renderCalendar();
        save();
      });

      row.appendChild(left);
      row.appendChild(del);
      dom.calendarList.appendChild(row);
    });
  }

  function addCalendarItem() {
    const time = (dom.calTime.value || "").trim();
    const text = (dom.calText.value || "").trim();
    if (!time || !text) return;
    state.calendar.items.push({ id: uid(), time, text });
    dom.calTime.value = "";
    dom.calText.value = "";
    renderCalendar();
    save();
  }

  function renderChatHub() {
    const items = state.chathub.items;

    let teams = 0, discord = 0, unread = 0;
    for (const it of items) {
      if (it.src === "Teams") teams++;
      if (it.src === "Discord") discord++;
      if (it.unread) unread++;
    }
    dom.teamsCount.textContent = String(teams);
    dom.discordCount.textContent = String(discord);
    dom.chatHubUnread.textContent = String(unread);

    dom.chatHubList.innerHTML = "";
    items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "box mono";
      row.style.padding = "10px";
      row.style.borderRadius = "12px";
      row.style.cursor = "pointer";
      row.style.userSelect = "none";
      row.style.borderColor = it.selected ? "rgba(125,211,252,0.45)" : "";
      row.style.opacity = it.unread ? "1" : "0.70";

      row.innerHTML = `<strong>[${it.src}]</strong> ${escapeHtml(it.text)}`;

      row.addEventListener("click", () => {
        it.selected = !it.selected;
        renderChatHub();
        save();
      });

      dom.chatHubList.appendChild(row);
    });

    dom.hubInboxList.innerHTML = "";
    state.chathub.inbox.slice().reverse().forEach((it) => {
      const row = document.createElement("div");
      row.className = "box mono";
      row.style.padding = "10px";
      row.style.borderRadius = "12px";
      row.innerHTML = `<strong>[${escapeHtml(it.src)}]</strong> ${escapeHtml(it.text)}`;
      dom.hubInboxList.appendChild(row);
    });
  }

  function markChatHubRead() {
    let changed = false;
    for (const it of state.chathub.items) {
      if (it.selected) {
        it.unread = false;
        it.selected = false;
        changed = true;
      }
    }
    if (changed) {
      renderChatHub();
      save();
    }
  }

  function routeChatHubToInbox() {
    const selected = state.chathub.items.filter(it => it.selected);
    if (selected.length === 0) return;

    for (const it of selected) {
      state.chathub.inbox.push({
        id: uid(),
        src: it.src,
        text: it.text,
        ts: Date.now(),
      });
      it.unread = false;
      it.selected = false;
    }
    renderChatHub();
    save();
  }

  function clearChatHub() {
    state.chathub.items = [];
    renderChatHub();
    save();
  }

  function openTheme() { dom.themeModal.style.display = "block"; }
  function closeTheme() { dom.themeModal.style.display = "none"; }

  function wireThemeControls() {
    dom.glassAlpha.value = String(state.theme.alpha);
    dom.glassBlur.value = String(state.theme.blur);

    if (dom.themeSelect) {
      const opt = Array.from(dom.themeSelect.options || []).some(o => o.value === state.theme.themeKey);
      if (!opt && dom.themeSelect.options?.length) {
        state.theme.themeKey = dom.themeSelect.options[0].value;
      }
      dom.themeSelect.value = state.theme.themeKey;
    }

    dom.themeSelect.addEventListener("change", () => {
      state.theme.themeKey = dom.themeSelect.value;
      if (!themes[state.theme.themeKey]) state.theme.themeKey = "obsidian";
      applyTheme();
      save();
    });

    dom.glassAlpha.addEventListener("input", () => {
      state.theme.alpha = Number(dom.glassAlpha.value);
      applyTheme();
      save();
    });

    dom.glassBlur.addEventListener("input", () => {
      state.theme.blur = Number(dom.glassBlur.value);
      applyTheme();
      save();
    });

    dom.openThemeBtn.addEventListener("click", openTheme);
    dom.closeThemeBtn.addEventListener("click", closeTheme);

    dom.themeModal.addEventListener("click", (e) => {
      if (e.target === dom.themeModal) closeTheme();
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function wireEvents() {
    dom.newChatBtn.addEventListener("click", () => {
      const c = newChat();
      state.chat.chats.unshift(c);
      state.chat.activeChatId = c.id;
      renderChat();
      save();
      dom.chatInput.focus();
    });

    dom.sendChat.addEventListener("click", () => {
      sendUserMessage(dom.chatInput.value);
    });

    dom.modelSelect.addEventListener("change", () => {
      const c = activeChat();
      if (!c) return;
      c.model = dom.modelSelect.value;
      save();
    });

    dom.chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendUserMessage(dom.chatInput.value);
      }
    });

    dom.todayAddBtn.addEventListener("click", addTodayItem);
    dom.todayAdd.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTodayItem();
      }
    });

    dom.calAddBtn.addEventListener("click", addCalendarItem);
    dom.calText.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addCalendarItem();
      }
    });

    dom.chatHubMarkReadBtn.addEventListener("click", markChatHubRead);
    dom.routeToInboxBtn.addEventListener("click", routeChatHubToInbox);
    dom.chatHubClearBtn.addEventListener("click", clearChatHub);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeTheme();
    });
  }

  function init() {
    load();
    applyTheme();

    ensureChat();
    renderChat();
    renderToday();
    renderCalendar();
    renderChatHub();

    wireThemeControls();
    wireEvents();

    save();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
