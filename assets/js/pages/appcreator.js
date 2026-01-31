/* Page-isolated: AppCreator (UI-only)
   - No shared-file edits
   - No assumptions about other pages
*/

(function () {
  const $ = (sel, root = document) => root.querySelector(sel);

  const els = {
    appList: $("#acAppList"),
    newAppBtn: $("#acNewAppBtn"),
    activeAppLabel: $("#acActiveAppLabel"),
    appMeta: $("#acAppMeta"),
    selectedNode: $("#acSelectedNode"),

    chat: $("#acChat"),
    empty: $("#acEmptyState"),
    prompt: $("#acPrompt"),
    send: $("#acSendBtn"),

    tasks: $("#acTasks"),
    taskInput: $("#acTaskInput"),
    addTask: $("#acAddTaskBtn"),
    taskUp: $("#acTaskUpBtn"),
    taskDown: $("#acTaskDownBtn"),
    taskDelete: $("#acTaskDeleteBtn"),
  };

  // Basic in-page state (UI-only)
  const state = {
    apps: [
      { id: "networksaint", name: "NetworkSaint", meta: "Network diagnostics & optimization suite" },
      { id: "systemdwarf", name: "SystemDwarf", meta: "Performance tuning & monitoring suite" },
      { id: "simulare", name: "Simulare", meta: "Program simulator / sandbox runner" },
    ],
    activeAppId: null,

    tasks: [
      { id: "t1", text: "Define spec boundaries (CLI/GUI)", tag: "spec" },
      { id: "t2", text: "Decide module layout (core / ui / ops)", tag: "structure" },
      { id: "t3", text: "Create placeholder commands", tag: "cli" },
    ],
    activeTaskId: "t1",
  };

  function renderApps() {
    if (!els.appList) return;
    els.appList.innerHTML = "";

    state.apps.forEach(app => {
      const item = document.createElement("div");
      item.className = "ac-item" + (app.id === state.activeAppId ? " is-active" : "");
      item.tabIndex = 0;
      item.setAttribute("role", "option");
      item.dataset.appId = app.id;

      item.innerHTML = `
        <div class="ac-item__title">${escapeHtml(app.name)}</div>
        <div class="ac-item__meta">${escapeHtml(app.meta)}</div>
      `;

      item.addEventListener("click", () => setActiveApp(app.id));
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setActiveApp(app.id);
        }
      });

      els.appList.appendChild(item);
    });
  }

  function setActiveApp(id) {
    state.activeAppId = id;

    const app = state.apps.find(a => a.id === id);
    if (els.activeAppLabel) {
      els.activeAppLabel.textContent = app ? app.name : "No app selected";
    }

    if (els.appMeta) {
      els.appMeta.querySelector(".ac-card__title").textContent = app ? app.name : "None";
      els.appMeta.querySelector(".ac-card__meta").textContent = app ? app.meta : "Pick an app from the Library.";
    }

    // Reveal empty state hint area (chat remains UI-only)
    if (els.empty) {
      els.empty.style.display = "none";
    }

    // Add a system message to chat so it feels alive
    addMsg(`Selected app: ${app ? app.name : "None"}.`, false);

    renderApps();
  }

  function addMsg(text, isUser) {
    if (!els.chat) return;

    const msg = document.createElement("div");
    msg.className = "ac-msg" + (isUser ? " is-user" : "");
    msg.textContent = text;

    // Ensure empty state hidden once we have messages
    if (els.empty) els.empty.style.display = "none";

    els.chat.appendChild(msg);
    els.chat.scrollTop = els.chat.scrollHeight;
  }

  function onSend() {
    const val = (els.prompt?.value || "").trim();
    if (!val) return;

    addMsg(val, true);
    els.prompt.value = "";

    // UI-only: echo a placeholder response
    const app = state.apps.find(a => a.id === state.activeAppId);
    const appName = app ? app.name : "AppCreator";
    addMsg(`[${appName}] queued (UI-only): "${val}"`, false);
  }

  function renderTasks() {
    if (!els.tasks) return;
    els.tasks.innerHTML = "";

    state.tasks.forEach(t => {
      const row = document.createElement("div");
      row.className = "ac-task" + (t.id === state.activeTaskId ? " is-active" : "");
      row.dataset.taskId = t.id;

      row.innerHTML = `
        <div class="ac-task__text">${escapeHtml(t.text)}</div>
        <div class="ac-task__tag">${escapeHtml(t.tag)}</div>
      `;

      row.addEventListener("click", () => {
        state.activeTaskId = t.id;
        renderTasks();
      });

      els.tasks.appendChild(row);
    });
  }

  function addTask() {
    const txt = (els.taskInput?.value || "").trim();
    if (!txt) return;

    const id = "t" + Math.random().toString(16).slice(2);
    state.tasks.unshift({ id, text: txt, tag: "task" });
    state.activeTaskId = id;
    els.taskInput.value = "";
    renderTasks();
  }

  function moveTask(dir) {
    const idx = state.tasks.findIndex(t => t.id === state.activeTaskId);
    if (idx < 0) return;

    const swapWith = idx + dir;
    if (swapWith < 0 || swapWith >= state.tasks.length) return;

    const tmp = state.tasks[idx];
    state.tasks[idx] = state.tasks[swapWith];
    state.tasks[swapWith] = tmp;
    renderTasks();
  }

  function deleteTask() {
    const idx = state.tasks.findIndex(t => t.id === state.activeTaskId);
    if (idx < 0) return;
    state.tasks.splice(idx, 1);
    state.activeTaskId = state.tasks[0]?.id || null;
    renderTasks();
  }

  function wire() {
    renderApps();
    renderTasks();

    // Default node placeholder
    if (els.selectedNode) els.selectedNode.textContent = "None";

    els.newAppBtn?.addEventListener("click", () => {
      const name = prompt("New app name?");
      if (!name) return;

      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      state.apps.unshift({ id: id || ("app-" + Date.now()), name, meta: "New app (UI-only)" });
      setActiveApp(state.apps[0].id);
    });

    els.send?.addEventListener("click", onSend);
    els.prompt?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    });

    els.addTask?.addEventListener("click", addTask);
    els.taskInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTask();
      }
    });

    els.taskUp?.addEventListener("click", () => moveTask(-1));
    els.taskDown?.addEventListener("click", () => moveTask(1));
    els.taskDelete?.addEventListener("click", deleteTask);
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Boot
  document.addEventListener("DOMContentLoaded", wire);
})();
