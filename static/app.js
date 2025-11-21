// State Management
class ChatState {
  constructor() {
    this.conversations = [];
    this.currentConversation = null;
    this.isLoading = false;
  }

  addMessage(role, content, metadata = {}) {
    const message = {
      id: Date.now(),
      role,
      content,
      metadata,
      timestamp: new Date(),
    };

    if (!this.currentConversation) {
      this.currentConversation = {
        id: Date.now(),
        messages: [],
        title: this.generateTitle(content),
      };
      this.conversations.push(this.currentConversation);
    }

    this.currentConversation.messages.push(message);
    return message;
  }

  generateTitle(firstMessage) {
    return (
      firstMessage.substring(0, 50) + (firstMessage.length > 50 ? "..." : "")
    );
  }

  clearCurrentConversation() {
    this.currentConversation = null;
  }
}

// DOM Elements
const elements = {
  form: document.getElementById("questionForm"),
  input: document.getElementById("questionInput"),
  submitBtn: document.getElementById("submitBtn"),
  sendIcon: document.querySelector(".send-icon"),
  loadingIcon: document.querySelector(".loading-icon"),
  chatMessages: document.getElementById("chatMessages"),
  welcomeScreen: document.getElementById("welcomeScreen"),
  charCount: document.getElementById("charCount"),
  chatHistory: document.getElementById("chatHistory"),
};

// Initialize state
const chatState = new ChatState();

// API Configuration
const API_ENDPOINT = "/api/ask";

// Utility Functions
const utils = {
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  formatText(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br>");
  },

  scrollToBottom() {
    elements.chatMessages.scrollTo({
      top: elements.chatMessages.scrollHeight,
      behavior: "smooth",
    });
  },

  updateCharCount() {
    const count = elements.input.value.length;
    elements.charCount.textContent = count;
  },

  setLoading(isLoading) {
    chatState.isLoading = isLoading;
    elements.submitBtn.disabled = isLoading;

    if (isLoading) {
      elements.sendIcon.style.display = "none";
      elements.loadingIcon.style.display = "block";
    } else {
      elements.sendIcon.style.display = "block";
      elements.loadingIcon.style.display = "none";
    }
  },
};

// UI Components
const ui = {
  hideWelcome() {
    if (elements.welcomeScreen) {
      elements.welcomeScreen.style.display = "none";
    }
  },

  createMessageElement(role, content, metadata = {}) {
    const message = document.createElement("div");
    message.className = `message message-${role}`;

    const avatar = role === "user" ? "👤" : "🤖";
    const label = role === "user" ? "You" : "AI Assistant";

    message.innerHTML = `
      <div class="message-header">
        <div class="message-avatar">${avatar}</div>
        <span class="message-label">${label}</span>
      </div>
      <div class="message-content">${utils.formatText(content)}</div>
    `;

    // Add preprocessing info for AI messages
    if (role === "ai" && metadata.preprocessing) {
      const preprocessingDiv = document.createElement("div");
      preprocessingDiv.className = "preprocessing-info";
      preprocessingDiv.innerHTML = `
        <strong>Text Preprocessing:</strong><br>
        Original: ${utils.escapeHtml(metadata.preprocessing.original)}<br>
        Lowercased: ${utils.escapeHtml(metadata.preprocessing.lowercased)}<br>
        Tokens: [${metadata.preprocessing.tokens
          .map((t) => `"${t}"`)
          .join(", ")}]
      `;
      message.appendChild(preprocessingDiv);
    }

    return message;
  },

  createErrorMessage(errorText) {
    const message = document.createElement("div");
    message.className = "message message-error";
    message.innerHTML = `
      <div class="message-header">
        <div class="message-avatar">⚠️</div>
        <span class="message-label">Error</span>
      </div>
      <div class="message-content">${utils.escapeHtml(errorText)}</div>
    `;
    return message;
  },

  createTypingIndicator() {
    const typing = document.createElement("div");
    typing.className = "message message-ai";
    typing.id = "typingIndicator";
    typing.innerHTML = `
      <div class="message-header">
        <div class="message-avatar">🤖</div>
        <span class="message-label">AI Assistant</span>
      </div>
      <div class="typing-indicator">
        <div class="typing-dots">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
    return typing;
  },

  removeTypingIndicator() {
    const typing = document.getElementById("typingIndicator");
    if (typing) {
      typing.remove();
    }
  },

  addMessage(role, content, metadata = {}) {
    this.hideWelcome();
    const messageEl = this.createMessageElement(role, content, metadata);
    elements.chatMessages.appendChild(messageEl);
    utils.scrollToBottom();
  },

  addError(errorText) {
    this.hideWelcome();
    const errorEl = this.createErrorMessage(errorText);
    elements.chatMessages.appendChild(errorEl);
    utils.scrollToBottom();
  },

  showTyping() {
    this.hideWelcome();
    const typing = this.createTypingIndicator();
    elements.chatMessages.appendChild(typing);
    utils.scrollToBottom();
  },

  updateChatHistory() {
    elements.chatHistory.innerHTML = "";
    chatState.conversations.forEach((conv) => {
      const item = document.createElement("div");
      item.className = "history-item";
      item.textContent = conv.title;
      item.onclick = () => this.loadConversation(conv);
      elements.chatHistory.appendChild(item);
    });
  },

  loadConversation(conversation) {
    elements.chatMessages.innerHTML = "";
    chatState.currentConversation = conversation;

    conversation.messages.forEach((msg) => {
      this.addMessage(msg.role, msg.content, msg.metadata);
    });
  },
};

// API Handler
const api = {
  async sendQuestion(question) {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      return data;
    } catch (error) {
      throw new Error(
        error.message || "Network error. Please check your connection."
      );
    }
  },
};

// Event Handlers
const handlers = {
  async handleSubmit(e) {
    e.preventDefault();

    const question = elements.input.value.trim();
    if (!question || chatState.isLoading) return;

    // Add user message
    chatState.addMessage("user", question);
    ui.addMessage("user", question);

    // Clear input
    elements.input.value = "";
    elements.input.style.height = "auto";
    utils.updateCharCount();

    // Show loading state
    utils.setLoading(true);
    ui.showTyping();

    try {
      // Send request
      const response = await api.sendQuestion(question);

      // Remove typing indicator
      ui.removeTypingIndicator();

      // Add AI response with preprocessing info
      chatState.addMessage("ai", response.answer, {
        preprocessing: response.preprocessing,
      });
      ui.addMessage("ai", response.answer, {
        preprocessing: response.preprocessing,
      });

      // Update chat history
      ui.updateChatHistory();
    } catch (error) {
      ui.removeTypingIndicator();
      ui.addError(error.message);
    } finally {
      utils.setLoading(false);
    }
  },

  handleInput() {
    // Auto-resize textarea
    elements.input.style.height = "auto";
    elements.input.style.height = elements.input.scrollHeight + "px";

    // Update character count
    utils.updateCharCount();
  },

  handleKeyPress(e) {
    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      elements.form.dispatchEvent(new Event("submit"));
    }
  },
};

// Clear chat function (global for button onclick)
window.clearChat = function () {
  elements.chatMessages.innerHTML = "";
  chatState.clearCurrentConversation();

  // Show welcome screen
  const welcomeHTML = `
    <div class="welcome-container" id="welcomeScreen">
      <div class="welcome-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <h1 class="welcome-title">NLP Question & Answering System</h1>
      <p class="welcome-subtitle">Using Google Gemini LLM with Text Preprocessing</p>
      
      <div class="feature-grid">
        <div class="feature-card">
          <div class="feature-icon">🔍</div>
          <h3>Text Preprocessing</h3>
          <p>Lowercasing, tokenization & punctuation removal</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🤖</div>
          <h3>AI-Powered</h3>
          <p>Google Gemini-2.5-Flash model</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">💬</div>
          <h3>Natural Language</h3>
          <p>Ask anything in plain English</p>
        </div>
      </div>
    </div>
  `;

  elements.chatMessages.innerHTML = welcomeHTML;
  elements.welcomeScreen = document.getElementById("welcomeScreen");
};

// Initialize Event Listeners
function init() {
  elements.form.addEventListener("submit", handlers.handleSubmit);
  elements.input.addEventListener("input", handlers.handleInput);
  elements.input.addEventListener("keypress", handlers.handleKeyPress);

  // Focus input on load
  elements.input.focus();
}

// Start app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
