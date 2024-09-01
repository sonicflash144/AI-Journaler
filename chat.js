const fs = window.electron.fs;
const path = window.electron.path;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
var systemPrompt;
const input = document.getElementById('userInput');
const messagesContainer = document.getElementById('messages');
const sendButton = document.getElementById('sendButton');

let entries = [];
let conversationHistory = [];
var num_context = 10;
var entriesFile, entriesFolder;

window.electron.app.getPath('userData').then(userDataPath => {
    entriesFile = path.join(userDataPath, 'user_entries', 'entries.json');
    entriesFolder = path.join(userDataPath, 'user_entries');
    if (fs.existsSync(entriesFile)) {
        const data = JSON.parse(fs.readFileSync(entriesFile, 'utf-8'));
        entries = data.map(entry => {
            const entryText = fs.readFileSync(path.join(entriesFolder, entry.fileName), 'utf-8');
            return { ...entry, text: entryText };
        });
    
        if (entries.length < num_context) {
            num_context = entries.length;
        }
    
        entries = entries.slice(-num_context);
    }
    
    systemPrompt = `You are a journaling assistant that helps the user reflect and seed new ideas. Keep your responses concise. Here are the user's ${num_context} most recent journal entries for context:\n\n${entries.map(entry => `Date: ${entry.date}\nSentiment Score: ${entry.sentimentScore}\n${entry.text}`).join('\n\n')}`;
});

document.getElementById('numContextSelect').addEventListener('change', function() {
    num_context = parseInt(this.value);
    updateSystemPrompt();
    console.log('num_context set to:', num_context);
});

sendButton.addEventListener('click', async function() {
    sendMessage();
});

input.addEventListener('keydown', async function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    } else if (event.key === 'Enter' && event.shiftKey) {
        event.preventDefault();
        this.value += '\n';
    }
});

async function sendMessage() {
    if (input.value.trim() == '') {
        return;
    }
    const userMessage = input.value;
    input.value = '';

    // Add user message to conversation history
    conversationHistory.push({ role: 'user', content: userMessage });

    // Display user message
    const userDiv = document.createElement('div');
    userDiv.classList.add('message', 'user-message');
    userDiv.textContent = userMessage;
    const userLabel = document.createElement('div');
    userLabel.textContent = 'You:';
    userLabel.classList.add('message-label');
    messagesContainer.appendChild(userLabel);
    messagesContainer.appendChild(userDiv);

    // Prepare the messages for the API call
    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory
    ];

    let APICall = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "model": "openai/gpt-4o-mini",
            "messages": messages,
        })
    });

    const jsonResponse = await APICall.json();
    const response = jsonResponse.choices[0].message.content;

    // Add AI response to conversation history
    conversationHistory.push({ role: 'assistant', content: response });

    // Display AI response
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