/* Maneit Portal – Chat engine (local, simple, safe) */

(() => {
  const chatListEl = document.getElementById("chatList");
  const messagesEl = document.getElementById("chatMessages");
  const inputEl = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendChat");
  const newChatBtn = document.getElementById("newChatBtn");

  if (!chatListEl || !messagesEl || !inputEl || !sendBtn) return;

  const STORE_KEY = "maneit.chat.v1";

  let state = {
    chats: [],
    activeId: null
  };

  /* ---------- Persistence ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) state = JSON.parse(raw);
    } catch {}
    if (!state.chats.length) createChat();
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
  }

  /* ---------- Chat ops ---------- */
  function createChat() {
    const id = crypto.randomUUID();
    state.chats.unshift({
      id,
      title: "New chat",
      messages: [
        { role: "assistant", text: "What’s on your mind?" }
      ]
    });
    state.activeId = id;
    save();
    render();
  }

  function activeChat() {
    return state.chats.find(c => c.id === state.activeId);
  }

  function sendMessage(text) {
    const chat = activeChat();
    if (!chat) return;

    chat.messages.push({ role: "user", text });
    chat.messages.push({ role: "assistant", text: "Let’s reflect on that." });

    if (chat.messages.length === 3) {
      chat.title = text.slice(0, 30) || "Chat";
    }

    save();
    renderMessages();
    renderChatList();
  }

  /* ---------- Rendering ---------- */
  function renderChatList() {
    chatListEl.innerHTML = "";
    state.chats.forEach(chat => {
      const div = document.createElement("div");
      div.className = "chat-item" + (chat.id === state.activeId ? " active" : "");
      div.textContent = chat.title;
      div.onclick = () => {
        state.activeId = chat.id;
        save();
        render();
      };
      chatListEl.appendChild(div);
    });
  }

  function renderMessages() {
    messagesEl.innerHTML = "";
    const chat = activeChat();
    if (!chat) return;

    chat.messages.forEach(m => {
      const wrap = document.createElement("div");
      wrap.className = `chat-msg ${m.role}`;

      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.textContent = m.text;

      wrap.appendChild(bubble);
      messagesEl.appendChild(wrap);
    });

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function render() {
    renderChatList();
    renderMessages();
  }

  /* ---------- Events ---------- */
  sendBtn.onclick = () => {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = "";
    sendMessage(text);
  };

  inputEl.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  newChatBtn.onclick = createChat;

  /* ---------- Init ---------- */
  load();
  render();
})();
