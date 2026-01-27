/* Maneit Portal – minimal JS
   Chat only. No shortcuts. No navigation logic.
*/

(() => {
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendChat");
  const messages = document.getElementById("chatMessages");

  if (!input || !sendBtn || !messages) return;

  function addMessage(role, text) {
    const wrap = document.createElement("div");
    wrap.className = `chat-msg ${role}`;

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;

    wrap.appendChild(bubble);
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  }

  function send() {
    const text = input.value.trim();
    if (!text) return;

    addMessage("user", text);
    input.value = "";

    // placeholder assistant reply
    setTimeout(() => {
      addMessage("assistant", "Let’s reflect on that.");
    }, 400);
  }

  sendBtn.addEventListener("click", send);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
})();
