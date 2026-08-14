(function () {
  // Bitta sahifada faqat bitta vidjet ishlashini ta'minlash
  if (window.AriooWidgetLoaded) return;
  window.AriooWidgetLoaded = true;

  // Joriy scriptni topish (data-channel-id ni o'qish uchun)
  const scripts = document.getElementsByTagName("script");
  let currentScript = null;
  for (let i = 0; i < scripts.length; i++) {
    if (scripts[i].src.includes("widget.js")) {
      currentScript = scripts[i];
      break;
    }
  }

  const channelId = currentScript ? currentScript.getAttribute("data-channel-id") : null;
  if (!channelId) {
    console.error("Arioo Widget: channel-id topilmadi!");
    return;
  }

  // Session ID yaratish yoki saqlash (mijozni farqlash uchun)
  let sessionId = localStorage.getItem("arioo_widget_session");
  if (!sessionId) {
    sessionId = "session_" + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("arioo_widget_session", sessionId);
  }

  // API URL
  const API_URL = "https://arioo.uz/api/widget/chat"; // Yoki localhost (dev rejimda)
  // Eslatma: Hozircha localhost:3000 ga yuboramiz. Sayt ishlab turgan domenga qarab o'zgartiriladi
  const BASE_URL = currentScript.src.replace("/widget.js", "");
  const CHAT_URL = `${BASE_URL}/api/widget/chat`;

  // UI chizish (Sodda HTML va CSS)
  const styles = `
    #arioo-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #arioo-widget-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #2563eb;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border: none;
      transition: transform 0.2s;
    }
    #arioo-widget-button:hover {
      transform: scale(1.05);
    }
    #arioo-widget-chat {
      display: none;
      flex-direction: column;
      width: 350px;
      height: 500px;
      max-height: calc(100vh - 100px);
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      margin-bottom: 16px;
      border: 1px solid #e5e7eb;
    }
    #arioo-widget-chat.arioo-open {
      display: flex;
    }
    #arioo-widget-header {
      background: #2563eb;
      color: white;
      padding: 16px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #arioo-close-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
    }
    #arioo-widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #f9fafb;
    }
    .arioo-msg {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.4;
    }
    .arioo-msg.arioo-user {
      align-self: flex-end;
      background: #2563eb;
      color: white;
      border-bottom-right-radius: 4px;
    }
    .arioo-msg.arioo-agent {
      align-self: flex-start;
      background: white;
      color: #111827;
      border: 1px solid #e5e7eb;
      border-bottom-left-radius: 4px;
    }
    #arioo-widget-input-area {
      display: flex;
      padding: 12px;
      background: white;
      border-top: 1px solid #e5e7eb;
    }
    #arioo-input {
      flex: 1;
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      padding: 10px 16px;
      outline: none;
      font-size: 14px;
    }
    #arioo-input:focus {
      border-color: #2563eb;
    }
    #arioo-send-btn {
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      margin-left: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #arioo-send-btn:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
  `;

  const styleTag = document.createElement("style");
  styleTag.innerHTML = styles;
  document.head.appendChild(styleTag);

  const container = document.createElement("div");
  container.id = "arioo-widget-container";
  container.innerHTML = `
    <div id="arioo-widget-chat">
      <div id="arioo-widget-header">
        <span>AI Xodim</span>
        <button id="arioo-close-btn">&times;</button>
      </div>
      <div id="arioo-widget-messages">
        <div class="arioo-msg arioo-agent">Assalomu alaykum! Sizga qanday yordam bera olaman?</div>
      </div>
      <div id="arioo-widget-input-area">
        <input type="text" id="arioo-input" placeholder="Xabar yozing..." />
        <button id="arioo-send-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>
    </div>
    <button id="arioo-widget-button">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    </button>
  `;
  document.body.appendChild(container);

  // Mantiq
  const btnOpen = document.getElementById("arioo-widget-button");
  const btnClose = document.getElementById("arioo-close-btn");
  const chat = document.getElementById("arioo-widget-chat");
  const msgs = document.getElementById("arioo-widget-messages");
  const input = document.getElementById("arioo-input");
  const btnSend = document.getElementById("arioo-send-btn");

  btnOpen.addEventListener("click", () => {
    chat.classList.add("arioo-open");
    btnOpen.style.display = "none";
    input.focus();
  });

  btnClose.addEventListener("click", () => {
    chat.classList.remove("arioo-open");
    btnOpen.style.display = "flex";
  });

  const appendMessage = (text, role) => {
    const div = document.createElement("div");
    div.className = \`arioo-msg arioo-\${role}\`;
    div.innerText = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  };

  const sendMessage = async () => {
    const text = input.value.trim();
    if (!text) return;

    appendMessage(text, "user");
    input.value = "";
    btnSend.disabled = true;

    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          sessionId,
          message: text,
        }),
      });
      const data = await res.json();
      
      if (data.response) {
        appendMessage(data.response, "agent");
      } else {
        appendMessage("Kechirasiz, xatolik yuz berdi.", "agent");
      }
    } catch (err) {
      appendMessage("Ulanishda xatolik yuz berdi.", "agent");
    } finally {
      btnSend.disabled = false;
      input.focus();
    }
  };

  btnSend.addEventListener("click", sendMessage);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });
})();
