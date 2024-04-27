const dotenv = require('dotenv');
dotenv.config();
const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');

const entriesFile = path.join(__dirname, 'user_entries', 'entries.json');
const entriesFolder = path.join(__dirname, 'user_entries');
const input = document.getElementById('userInput') as HTMLInputElement;
const messagesContainer = document.getElementById('messages') as HTMLDivElement;
const sendButton = document.getElementById('sendButton') as HTMLButtonElement;
const clearButton = document.getElementById('clearChatButton') as HTMLButtonElement;
let chatHistory: { user: string, message: string }[] = [];

// Load chat history from file
window.addEventListener('DOMContentLoaded', () => {
    const chatHistoryPath = path.join(__dirname, 'chatHistory.json');
    if (fs.existsSync(chatHistoryPath)) {
        const chatHistoryJson = fs.readFileSync(chatHistoryPath, 'utf-8');
        chatHistory = JSON.parse(chatHistoryJson);
    } else {
        fs.writeFileSync(chatHistoryPath, JSON.stringify([])); // Create the file with an empty array
    }
    loadChat();
});

sendButton.addEventListener('click', async function() {
    sendMessage();
});
input.addEventListener('keydown', async function(this: HTMLInputElement, event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    } else if (event.key === 'Enter' && event.shiftKey) {
        event.preventDefault();
        this.value += '\n';
    }
});

async function sendMessage(){
    if(input.value.trim() == ''){
        return;
    }
    const userDiv = document.createElement('div');
    userDiv.classList.add('message', 'user-message');
    userDiv.textContent = input.value;
    chatHistory.push({ user: 'You', message: input.value });
    fs.writeFileSync(path.join(__dirname, 'chatHistory.json'), JSON.stringify(chatHistory));
    const userLabel = document.createElement('div');
    userLabel.textContent = 'You:';
    userLabel.classList.add('message-label');
    messagesContainer.appendChild(userLabel);
    messagesContainer.appendChild(userDiv);
    const query = input.value;
    input.value = '';

    const response = await ipcRenderer.invoke('sendMessage', query);
    const llmDiv = document.createElement('div');
    llmDiv.classList.add('message');
    const llmLabel = document.createElement('div');
    llmLabel.textContent = 'AI:';
    llmLabel.classList.add('message-label');
    messagesContainer.appendChild(llmLabel);
    llmDiv.textContent = response;
    chatHistory.push({ user: 'AI', message: response });
    fs.writeFileSync(path.join(__dirname, 'chatHistory.json'), JSON.stringify(chatHistory));
    messagesContainer.appendChild(llmDiv);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
function loadChat() {
    for (const chat of chatHistory) {
        const div = document.createElement('div');
        div.classList.add('message');
        if (chat.user === 'You') {
            div.classList.add('user-message');
        } else if (chat.user === 'AI') {
            div.classList.add('AI');
        }
        div.textContent = chat.message;
        const label = document.createElement('div');
        label.textContent = `${chat.user}:`;
        label.classList.add('message-label');
        messagesContainer.appendChild(label);
        messagesContainer.appendChild(div);
    }
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
clearButton.addEventListener('click', async function() {
    messagesContainer.innerHTML = '';
    chatHistory = [];
    fs.writeFileSync(path.join(__dirname, 'chatHistory.json'), JSON.stringify(chatHistory));
});