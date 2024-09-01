// preload.js
// All the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency])
  }
});

const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const marked = require('marked');

contextBridge.exposeInMainWorld('electron', {
    fs: {
        readFileSync: fs.readFileSync,
        writeFileSync: fs.writeFileSync,
        existsSync: fs.existsSync,
        mkdirSync: fs.mkdirSync,
        unlinkSync: fs.unlinkSync,
    },
    path: {
        join: path.join,
    },
    marked: {
        parse: marked.parse,
    },
    app: {
        getPath: (name) => ipcRenderer.invoke('app-get-path', name),
    },
    ipcRenderer: {
      send: (channel, data) => ipcRenderer.send(channel, data),
      on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
      invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  }
});