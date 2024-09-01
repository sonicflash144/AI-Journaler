require('dotenv').config();
const { app, BrowserWindow, ipcMain, Menu, MenuItem } = require('electron');
if (require('electron-squirrel-startup')) app.quit();
const fs = require('fs').promises;
const path = require('node:path');
require('@electron/remote/main').initialize();
const enableRemoteModule = require('@electron/remote/main');
const { Document: LlamaDocument, Settings, VectorStoreIndex, OpenAI, OpenAIEmbedding } = require("llamaindex");
const entriesFile = path.join(__dirname, 'user_entries', 'entries.json');
const entriesFolder = path.join(__dirname, 'user_entries');
Settings.llm = new OpenAI({ model: "gpt-4o-mini", apiKey: process.env.OPENAI_API_KEY });
Settings.embedModel = new OpenAIEmbedding();
Settings.chunkSize = 512;
var retriever;

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    //width: 1000,
    //height: 750,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.maximize();

  // and load the index.html of the app.
  mainWindow.loadFile('index.html');
  enableRemoteModule.enable(mainWindow.webContents);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  mainWindow.webContents.on('did-navigate', (event, url) => {
    if(url.endsWith('chat.html')){
      initializeChatEngine();
    }
  });

  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = new Menu()

    // Add each spelling suggestion
    for (const suggestion of params.dictionarySuggestions) {
      menu.append(new MenuItem({
        label: suggestion,
        click: () => mainWindow.webContents.replaceMisspelling(suggestion)
      }))
    }

    // Allow users to add the misspelled word to the dictionary
    if (params.misspelledWord) {
      menu.append(
        new MenuItem({
          label: 'Add To Dictionary',
          click: () => mainWindow.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
        })
      )
    }

    menu.popup()
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

async function initializeChatEngine() {
  let entries = [];
  try {
      await fs.access(entriesFile);
      const data = JSON.parse(await fs.readFile(entriesFile, 'utf-8'));
      for (const entry of data) {
          const entryText = await fs.readFile(path.join(entriesFolder, entry.fileName), 'utf-8');
          entries.push({ ...entry, text: entryText });
      }
  } catch (error) {
      console.error(error);
  }

  // Create Document objects with entries
  const documents = entries.map(entry => new LlamaDocument({ text: entry.text, id_: entry.fileName }));

  // Split text and create embeddings. Store them in a VectorStoreIndex
  const index = await VectorStoreIndex.fromDocuments(documents);
  retriever = index.asRetriever();
  retriever.similarityTopK = 5;
  /*
  chatEngine = new ContextChatEngine({ 
      retriever, 
      contextSystemPrompt: customContextSystemPrompt
  });
  */
  console.log("Initialized!");
}
ipcMain.handle('getRelatedEntries', async (event, query) => {
  await initializeChatEngine();
  const sourceNodes = await retriever.retrieve({ query: query });
  return sourceNodes.map(node => ({
      score: node.score,
      fileName: node.node.relationships['SOURCE'].nodeId
  }));
});
/*
function customContextSystemPrompt({ context = '' }) {
  const SYSTEM_PROMPT = `You are an AI within the user's personal journal. You have access to the user's journal entries as context. Provide personalized responses to the user's questions based on the context provided. Don't answer in lists all the time. Try to keep responses consise. \nCurrent date and time: ${new Date().toISOString()} \nSome relevant past journal entries for context: ${context}`;
  return SYSTEM_PROMPT;
}
ipcMain.handle('sendMessage', async (event, query) => {
  const stream = await chatEngine.chat({ message: query, stream: true });
  let response = '';
  for await (const chunk of stream) {
      response += chunk.response;
  }
  return response;
});
*/