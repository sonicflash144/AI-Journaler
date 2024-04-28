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
    messagesContainer.appendChild(llmDiv);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}