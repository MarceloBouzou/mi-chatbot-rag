const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, 'user-message');
  userInput.value = '';
  getBotResponse(text);
}

function addMessage(text, className) {
  const msg = document.createElement('div');
  msg.className = `message ${className}`;
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

async function getBotResponse(userMessage) {
  const thinkingMessage = addMessage("...", 'bot-message typing');

  try {
    const response = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage }),
    });

    if (!response.ok) throw new Error('La respuesta del servidor no fue OK');

    const data = await response.json();
    thinkingMessage.textContent = data.reply;
    thinkingMessage.classList.remove('typing');
  } catch (error) {
    console.error('Error al contactar al servidor:', error);
    thinkingMessage.textContent = 'Lo siento, hubo un error al conectar con el servidor. Intenta de nuevo.';
    thinkingMessage.classList.remove('typing');
  }
}
