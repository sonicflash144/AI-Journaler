const fs = require('fs');
const path = require('path');
const prompt = require('electron-prompt');
const marked = require('marked');
let entries = [];
let tags = {};

const entriesFile = path.join(__dirname, 'user_entries', 'entries.json');
const tagsFile = path.join(__dirname, 'user_entries', 'tags.json');
const entriesFolder = path.join(__dirname, 'user_entries');

// Load entries from entries.json
if (fs.existsSync(entriesFile)) {
    const data = JSON.parse(fs.readFileSync(entriesFile, 'utf-8'));
    entries = data.map(entry => {
        const entryText = fs.readFileSync(path.join(entriesFolder, entry.fileName), 'utf-8');
        return { ...entry, text: entryText };
    });
}
// Load tags from tags.json
if (fs.existsSync(tagsFile)) {
    const data = JSON.parse(fs.readFileSync(tagsFile, 'utf-8'));
    tags = data;
}
renderAll();

// Create directory if it doesn't exist
if (!fs.existsSync(entriesFolder)){
    fs.mkdirSync(entriesFolder);
}

function addEntry() {
    const entryText = document.getElementById('entryInput').value;
    const entryTags = document.getElementById('tagInput').value.split(',').map(tag => tag.trim()).filter(tag => tag);
    const entryDate = new Date().toLocaleString();

    // Save entry as .md file
    const fileName = entryDate.replace(/:/g, '.').replace(/\//g, '-') + '.md';
    fs.writeFileSync(path.join(entriesFolder, fileName), entryText);
    const newEntry = { fileName, date: entryDate, tags: []};
    entryTags.forEach(tag => {
        const tagParts = tag.split('/');
        let currentTag = '';
        for (let part of tagParts) {
            currentTag += (currentTag ? '/' : '') + part;
            if (!newEntry.tags.includes(currentTag)) {
                newEntry.tags.push(currentTag);
            }
            if (!tags[currentTag]) {
                tags[currentTag] = [];
            }
            if (!tags[currentTag].includes(fileName)) {
                tags[currentTag].push(fileName);
            }
        }
    });
    entries.push(newEntry);
    document.getElementById('entryInput').value = '';
    document.getElementById('tagInput').value = '';
    renderAll();

    fs.writeFileSync(entriesFile, JSON.stringify(entries));
    fs.writeFileSync(tagsFile, JSON.stringify(tags));
}

function renderEntries(filterTags = []) {
    const container = document.getElementById('entriesContainer');
    container.innerHTML = '';
    entries.filter(entry => filterTags.length === 0 || filterTags.every(tag => entry.tags.includes(tag)))    
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach(entry => {
        const entryText = fs.readFileSync(path.join(entriesFolder, entry.fileName), 'utf-8');

        const entryElement = document.createElement('div');
        entryElement.className = 'p-4 border mb-2 flex justify-between items-center';
        
        const textElement = document.createElement('div');
        textElement.innerHTML = marked.parse(entryText); // Convert markdown to HTML
        entryElement.appendChild(textElement);
        
        const tagsElement = document.createElement('div');
        tagsElement.className = 'entry-tags-container';
        entry.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'entry-tag';
            tagElement.textContent = tag;
            tagsElement.appendChild(tagElement);
        });
        
        const dateElement = document.createElement('span');
        dateElement.textContent = ` - ${entry.date}`;
        dateElement.style.fontSize = '0.75rem';
        dateElement.style.color = '#6b7280';
        entryElement.appendChild(dateElement);
        
        entryElement.appendChild(tagsElement);

        // Add edit button
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.onclick = async () => {
            const result = await prompt({
                title: 'Edit Entry',
                label: 'Enter new text:',
                value: entryText,
                inputAttrs: {
                    type: 'text'
                },
                type: 'input'
            });

            if (result !== null) {
                const newText = result;
                // Update markdown file
                fs.writeFileSync(path.join(entriesFolder, entry.fileName), newText);
                renderAll();
            }
        };
        entryElement.appendChild(editButton);

        // Add delete button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => {
            // Remove markdown file
            fs.unlinkSync(path.join(entriesFolder, entry.fileName));

            // Remove entry from entries array
            const entryIndex = entries.findIndex(e => e.fileName === entry.fileName);
            if (entryIndex > -1) {
                entries.splice(entryIndex, 1);
            }

            console.log(entry.tags);
            // Remove entry from tags
            entry.tags.forEach(tag => {
                const tagIndex = tags[tag].indexOf(entry.fileName);
                if (tagIndex > -1) {
                    tags[tag].splice(tagIndex, 1);
                }
                // If a tag array is empty, delete the tag
                if (tags[tag].length === 0) {
                    delete tags[tag];
                }
            });

            fs.writeFileSync(entriesFile, JSON.stringify(entries));
            fs.writeFileSync(tagsFile, JSON.stringify(tags));
            renderAll();
        };
        entryElement.appendChild(deleteButton);

        container.appendChild(entryElement);
    });
}
function renderTags() {
    const container = document.getElementById('tagsContainer');
    container.innerHTML = '';
    Object.keys(tags).forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag bg-gray-200 hover:bg-gray-300 rounded px-2 py-1';
        tagElement.textContent = tag;
        tagElement.onclick = () => {
            const selectedTags = Array.from(document.querySelectorAll('.tag.selected')).map(t => t.textContent);
            if (tagElement.classList.contains('selected')) {
                tagElement.classList.remove('selected');
                const index = selectedTags.indexOf(tag);
                selectedTags.splice(index, 1);
            } else {
                tagElement.classList.add('selected');
                selectedTags.push(tag);
            }
            renderEntries(selectedTags);
        };
        container.appendChild(tagElement);
    });
}
function renderAll(){
    renderEntries();
    renderTags();
}