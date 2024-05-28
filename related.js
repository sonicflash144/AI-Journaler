const fs = require('fs');
const path = require('path');
const marked = require('marked');
const { ipcRenderer } = require('electron');

const container = document.getElementById('entriesContainer');
const entriesFile = path.join(__dirname, 'user_entries', 'entries.json');
const entriesFolder = path.join(__dirname, 'user_entries');
let entries = [];
let isOriginal = true;

if (fs.existsSync(entriesFile)) {
    const data = JSON.parse(fs.readFileSync(entriesFile, 'utf-8'));
    entries = data.map(entry => {
        return { ...entry};
    });
}
if (!fs.existsSync(entriesFolder)){
    fs.mkdirSync(entriesFolder);
}

(async () => {
    const queryFile = path.join(__dirname, 'query.json');
    const query = JSON.parse(fs.readFileSync(queryFile, 'utf-8'));
    let sourceNodes = await ipcRenderer.invoke('getRelatedEntries', query.text);
    sourceNodes = sourceNodes.filter(node => node.score >= 0.75);
    const relatedEntries = sourceNodes.map(node => 
        entries.find(entry => entry.fileName === node.fileName)
    ).filter(entry => entry !== undefined);
    renderEntries(relatedEntries);
})();

function renderEntries(entries) {
    container.innerHTML = '';
    entries.forEach(entry => {
        const entryText = fs.readFileSync(path.join(entriesFolder, entry.fileName), 'utf-8');

        const entryElement = document.createElement('div');
        entryElement.className = 'entry-element p-4 border mb-2';

        const parentDiv = document.createElement('div');
        parentDiv.className = 'parent-div';

        const textDiv = document.createElement('div');
        textDiv.className = 'text-div';

        const textElement = document.createElement('div');
        textElement.innerHTML = marked.parse(entryText);
        textDiv.appendChild(textElement);

        parentDiv.appendChild(textDiv);

        const utilitiesDiv = document.createElement('div');
        utilitiesDiv.className = 'utilities-div mt-2';

        if(!isOriginal){
            const relatedButton = document.createElement('button');
            relatedButton.textContent = 'Related';
            relatedButton.className = 'related-button';
            relatedButton.onclick = () => {
                const query = { fileName: entry.fileName, text: entryText };
                fs.writeFileSync(path.join(__dirname, 'query.json'), JSON.stringify(query));
                window.location.href = 'related.html';
            };
            utilitiesDiv.appendChild(relatedButton);
        }
        
        const tagsElement = document.createElement('div');
        tagsElement.className = 'entry-tags-container';
        entry.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'entry-tag';
            tagElement.textContent = tag;
            tagsElement.appendChild(tagElement);
        });
        utilitiesDiv.appendChild(tagsElement);
        
        const dateElement = document.createElement('span');
        dateElement.textContent = `${entry.date}`;
        dateElement.className = 'date-element';
        utilitiesDiv.appendChild(dateElement);

        parentDiv.appendChild(utilitiesDiv);

        entryElement.appendChild(parentDiv);

        container.appendChild(entryElement);

        if(isOriginal){
            isOriginal = false;         
            const divider = document.createElement('hr');
            divider.style.marginTop = '4rem';
            divider.style.marginBottom = '4rem';
            divider.style.borderTop = '2px dashed #ccc';
            container.appendChild(divider);
        }
        
    });
}
