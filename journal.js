require('dotenv').config();
const fs = require('fs');
const path = require('path');
const marked = require('marked');
const VISION_API_KEY = process.env.VISION_API_KEY;
async function analyzeSentiment(text) {
    const response = await fetch(`https://language.googleapis.com/v2/documents:analyzeSentiment?key=${VISION_API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            document: {
                type: 'HTML',
                content: text
            }
        })
    });

    if (response.ok) {
        const result = await response.json();
        return result.documentSentiment.score;
    } else {
        const error = await response.json();
        console.error(`Error: ${response.status}, Message: ${error.message}`);
    }
}

const angleUpIcon = document.createElement('i');
angleUpIcon.className = 'fas fa-angle-up';
const angleDownIcon = document.createElement('i');
angleDownIcon.className = 'fas fa-angle-down';

const container = document.getElementById('entriesContainer');
const entriesFile = path.join(__dirname, 'user_entries', 'entries.json');
const tagsFile = path.join(__dirname, 'user_entries', 'tags.json');
const entriesFolder = path.join(__dirname, 'user_entries');
const searchBar = document.getElementById('searchBar');
var currentQuery = "";
var currentTags = [];
var modal = document.getElementById("myModal");
var textarea = document.getElementById("modalTextarea");
var modalTagsInput = document.getElementById('modalTagsInput');
var saveButton = document.getElementById("saveButton");
var mouseDownInside = false;
modal.addEventListener('mousedown', function(event) {
    mouseDownInside = (event.target !== modal);
});
window.addEventListener('mouseup', function(event) {
    if (event.target === modal && !mouseDownInside) {
        modal.style.display = "none";
    }
    mouseDownInside = false;
});
function toggleReplyInput(index) {
    const replyInputs = document.querySelectorAll('.reply-input');
    const addReplyButtons = document.querySelectorAll('.add-reply');
    replyInputs[index].style.display = replyInputs[index].style.display === 'block' ? 'none' : 'block';
    addReplyButtons[index].style.display = addReplyButtons[index].style.display === 'block' ? 'none' : 'block';
}

let entries = [];
let tags = {};
// Load local entries and tags
if (fs.existsSync(entriesFile)) {
    const data = JSON.parse(fs.readFileSync(entriesFile, 'utf-8'));
    entries = data.map(entry => {
        const entryText = fs.readFileSync(path.join(entriesFolder, entry.fileName), 'utf-8');
        return { ...entry};
    });
}
if (fs.existsSync(tagsFile)) {
    const data = JSON.parse(fs.readFileSync(tagsFile, 'utf-8'));
    tags = data;
}
if (!fs.existsSync(entriesFolder)){
    fs.mkdirSync(entriesFolder);
}
renderAll();

async function addReply(parentFileName, replyText) {
    const entryDate = new Date().toLocaleString();
    const fileName = entryDate.replace(/:/g, '.').replace(/\//g, '-') + '.md';
    const parentFile = entries.find(entry => entry.fileName === parentFileName);
    parentFile.replies.push(fileName);
    fs.writeFileSync(path.join(entriesFolder, fileName), replyText);
    var newEntry = { fileName, date: entryDate, sentimentScore: null, tags: [], parent: parentFile.fileName, replies: [] };
    entries.push(newEntry);
    renderAll();
    newEntry.sentimentScore = await analyzeSentiment(replyText);
    fs.writeFileSync(entriesFile, JSON.stringify(entries));

    console.log("Reply " + fileName + " added");
}
async function addEntry() {
    const entryText = document.getElementById('entryInput').value;
    if (!entryText.trim()) {
        return;
    }
    const entryTags = document.getElementById('tagInput').value.split(',').map(tag => tag.trim()).filter(tag => tag);
    const entryDate = new Date().toLocaleString();

    // Save entry as .md file
    const fileName = entryDate.replace(/:/g, '.').replace(/\//g, '-') + '.md';
    fs.writeFileSync(path.join(entriesFolder, fileName), entryText);
    var newEntry = { fileName, date: entryDate, sentimentScore: null, tags: [], parent: "", replies: [] };
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
    newEntry.sentimentScore = await analyzeSentiment(entryText);
    const entryIndex = entries.findIndex(entry => entry.fileName === fileName);
    if (entryIndex !== -1) {
        entries[entryIndex] = newEntry;
    }
    fs.writeFileSync(entriesFile, JSON.stringify(entries));
    fs.writeFileSync(tagsFile, JSON.stringify(tags));

    console.log(fileName + " added");
}
function editEntry(entryText, entry) {

    modal.style.display = "block";
    textarea.value = entryText;

    if (entry.parent === "") {
        modalTagsInput.style.display = 'block';
        modalTagsInput.value = entry.tags.join(', ');
    } else {
        modalTagsInput.style.display = 'none';
    }

    saveButton.onclick = async function() {
        const newText = textarea.value;
        if (!newText.trim()) {
            return;
        }
        fs.writeFileSync(path.join(entriesFolder, entry.fileName), newText);
    
        // Update tags if it's not a reply
        if (entry.parent === "") {
            const newTags = modalTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
            const oldTags = [...entry.tags];
            entry.tags = [];
            newTags.forEach(tag => {
                const tagParts = tag.split('/');
                let currentTag = '';
                for (let part of tagParts) {
                    currentTag += (currentTag ? '/' : '') + part;
                    if (!entry.tags.includes(currentTag)) {
                        entry.tags.push(currentTag);
                    }
                    if (!tags[currentTag]) {
                        tags[currentTag] = [];
                    }
                    if (!tags[currentTag].includes(entry.fileName)) {
                        tags[currentTag].push(entry.fileName);
                    }
                }
            });
            // Remove entry from tags that are not in newTags
            oldTags.forEach(tag => {
                if (!newTags.includes(tag)) {
                    const index = tags[tag].indexOf(entry.fileName);
                    if (index > -1) {
                        tags[tag].splice(index, 1);
                    }
                    // If the array for this tag is empty, delete the key from the tags object
                    if (tags[tag].length === 0) {
                        delete tags[tag];
                    }
                }
            });
        }
        
        modal.style.display = "none";
        renderAll();

        entry.sentimentScore = await analyzeSentiment(newText);
        fs.writeFileSync(entriesFile, JSON.stringify(entries));
        fs.writeFileSync(tagsFile, JSON.stringify(tags));

        console.log(entry.fileName + " edited")
    };
}

searchBar.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        currentQuery = this.value;
        searchEntries(currentQuery, currentTags);
    }
});
function searchEntries(query, tags) {
    if(query === ""){
        renderEntries(tags);
        return;
    }
    const lowerCaseQuery = query.toLowerCase();
    const matchingEntries = entries.filter(entry => {
        const entryText = fs.readFileSync(path.join(entriesFolder, entry.fileName), 'utf-8').toLowerCase();
        return entryText.includes(lowerCaseQuery);
    });
    renderEntries(tags, matchingEntries);
}
function renderEntries(filterTags=[], filteredEntries=[-1]) {
    container.innerHTML = '';
    //Search bar is empty, show all entries
    if(filteredEntries[0] === -1){
        entries.filter(entry => entry.parent === "" && (filterTags.length === 0 || filterTags.every(tag => entry.tags.includes(tag))))    
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach(entry => {
            const entryElement = document.createElement('div');
            entryElement.className = 'entry-element p-4 border mb-2';
            entryElement.setAttribute('data-filename', entry.fileName);
            container.appendChild(entryElement);
        });
    }
    //Search bar is not empty, show only matching entries
    else{
        const renderedEntries = new Set();
        filteredEntries.filter(entry => filterTags.length === 0 || filterTags.every(tag => entry.tags.includes(tag)))
        .forEach(entry => {
            let fileNameToUse = entry.fileName;
            const entryElement = document.createElement('div');
            if(entry.parent === "" && !renderedEntries.has(entry.fileName)){
                renderedEntries.add(entry.fileName);
            }
            else{
                const parentEntry = entries.find(e => e.fileName === entry.parent);
                if (parentEntry && !renderedEntries.has(parentEntry.fileName)) {
                    entryElement.setAttribute('data-showReplies', true);
                    renderedEntries.add(parentEntry.fileName);
                    fileNameToUse = parentEntry.fileName;
                }
            }
            entryElement.className = 'entry-element p-4 border mb-2';
            entryElement.setAttribute('data-filename', fileNameToUse);
            container.appendChild(entryElement);
        });
    }
    lazyLoad();
}
function lazyLoad(){
    let allDOMEntries = document.querySelectorAll('.entry-element');
    let config = {root: null, rootMargin: '0px', threshold: 0.75};  

    function intersect(observerEntries, observer){
        observerEntries.forEach((entry, replyIndex) => {
            if(entry.isIntersecting){
                const entryElement = entry.target;
                let entryIndex = entries.findIndex(e => e.fileName === entryElement.getAttribute('data-filename'));
                entryElement.setAttribute('data-index', entryIndex);
                entryElement.setAttribute('data-reply-index', replyIndex);
                let showReplies = entryElement.getAttribute('data-showReplies') === 'true';
                renderEntry(entries[entryIndex], entryElement, showReplies);
                observer.unobserve(entry.target);
            }
        });
    }
    const observer = new IntersectionObserver(intersect, config);
    allDOMEntries.forEach(entry => {
        observer.observe(entry);
    });
}

function renderEntry(entry, entryElement, showReplies=false){
    const entryText = fs.readFileSync(path.join(entriesFolder, entry.fileName), 'utf-8');

    const parentDiv = document.createElement('div');
    parentDiv.className = 'parent-div';

    const textAndCheveronDiv = document.createElement('div');
    textAndCheveronDiv.className = 'text-and-chevron-div';

    const textDiv = document.createElement('div');
    textDiv.className = 'text-div';

    const textElement = document.createElement('div');
    textElement.innerHTML = marked.parse(entryText);
    textElement.classList.add('truncate');
    entryElement.textElement = textElement;

    //See more
    const seeMoreLink = document.createElement('a');
    seeMoreLink.textContent = 'See more';
    seeMoreLink.href = '#';
    seeMoreLink.style.display = 'none';
    seeMoreLink.style.color = 'gray';
    seeMoreLink.onclick = (e) => {
        e.preventDefault();
        if (textElement.classList.contains('truncate')) {
            textElement.classList.remove('truncate');
            seeMoreLink.textContent = 'See less';
        } else {
            textElement.classList.add('truncate');
            seeMoreLink.textContent = 'See more';
        }
    };
    textDiv.appendChild(textElement);
    textDiv.appendChild(seeMoreLink);
    setTimeout(() => {
        const lineHeight = parseFloat(window.getComputedStyle(textElement).lineHeight);
        if (textElement.scrollHeight <= lineHeight * 3) {
            seeMoreLink.style.display = 'none';
            textElement.classList.remove('truncate');
        } else {
            seeMoreLink.style.display = 'block';
        }
    }, 0);

    //Reply input
    const replyInput = document.createElement('textarea');
    replyInput.rows = 3;
    replyInput.type = 'text';
    replyInput.placeholder = 'Write a reply...';
    replyInput.className = 'mt-2 reply-input border';
    textDiv.appendChild(replyInput);

    const addReplyButton = document.createElement('button');
    addReplyButton.textContent = 'Add Reply';
    addReplyButton.className = 'add-reply bg-blue-500 hover:bg-blue-700 text-white mt-2';
    addReplyButton.onclick = () => {
        if(!replyInput.value.trim()){
            return;
        }
        addReply(entry.fileName, replyInput.value);
        replyInput.value = '';
    };

    textDiv.appendChild(addReplyButton);
    textAndCheveronDiv.appendChild(textDiv);

    const utilitiesDiv = document.createElement('div');
    utilitiesDiv.className = 'utilities-div mt-2';

    //Reply button
    const replyButton = document.createElement('button');
    replyButton.textContent = 'Reply';
    replyButton.className = 'reply-button';
    let replyIndex = entryElement.getAttribute('data-reply-index');
    replyButton.onclick = () => toggleReplyInput(replyIndex);
    utilitiesDiv.appendChild(replyButton);

    const relatedButton = document.createElement('button');
    relatedButton.textContent = 'Related';
    relatedButton.className = 'related-button';
    relatedButton.onclick = () => {
        const query = { fileName: entry.fileName, text: entryText };
        fs.writeFileSync(path.join(__dirname, 'query.json'), JSON.stringify(query));
        window.location.href = 'related.html';
    };
    utilitiesDiv.appendChild(relatedButton);
    
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

    // Edit button
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.className = 'edit-button';
    editButton.onclick = async () => {
        editEntry(entryText, entry);
    };
    utilitiesDiv.appendChild(editButton);

    // Delete button
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'delete-button';
    deleteButton.onclick = () => {
        // Remove markdown file
        fs.unlinkSync(path.join(entriesFolder, entry.fileName));
        // Remove entry from entries array
        const entryIndex = entries.findIndex(e => e.fileName === entry.fileName);
        if (entryIndex > -1) {
            entries.splice(entryIndex, 1);
        }
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

        // Delete replies
        entry.replies.forEach(replyFileName => {
            fs.unlinkSync(path.join(entriesFolder, replyFileName));
            // Remove entry from entries array
            const replyIndex = entries.findIndex(e => e.fileName === replyFileName);
            if (replyIndex > -1) {
                entries.splice(replyIndex, 1);
            }
        });

        fs.writeFileSync(entriesFile, JSON.stringify(entries));
        fs.writeFileSync(tagsFile, JSON.stringify(tags));
        renderAll();
        console.log(entry.fileName + " deleted");
    };
    utilitiesDiv.appendChild(deleteButton);
    parentDiv.appendChild(utilitiesDiv);

    if (entry.replies.length > 0) {
        const toggleRepliesButton = document.createElement('button');
        toggleRepliesButton.innerHTML = '';
        if(showReplies){
            toggleRepliesButton.appendChild(angleDownIcon.cloneNode(true));
        }
        else{
            toggleRepliesButton.appendChild(angleUpIcon.cloneNode(true));
        }
        toggleRepliesButton.onclick = () => {
        const replyElements = entryElement.querySelectorAll('.reply-element');
        replyElements.forEach(replyElement => {
            if (replyElement.classList.contains('hide')) {
                replyElement.classList.remove('hide');
                toggleRepliesButton.innerHTML = '';
                toggleRepliesButton.appendChild(angleDownIcon.cloneNode(true));

                // Calculate scrollHeight when the reply is visible
                const textElement = replyElement.querySelector('.text-div div');
                const seeMoreLink = replyElement.querySelector('.text-div a');
                const lineHeight = parseFloat(window.getComputedStyle(textElement).lineHeight);
                if (textElement.scrollHeight > lineHeight * 3) {
                    seeMoreLink.style.display = 'block';
                    textElement.classList.add('truncate');
                }
            } else {
                replyElement.classList.add('hide');
                toggleRepliesButton.innerHTML = '';
                toggleRepliesButton.appendChild(angleUpIcon.cloneNode(true));
            }
        });
    };
        textAndCheveronDiv.insertBefore(toggleRepliesButton, textAndCheveronDiv.firstChild);
    }

    parentDiv.insertBefore(textAndCheveronDiv, parentDiv.firstChild);
    entryElement.appendChild(parentDiv);

    //Display replies
    entry.replies.forEach(fileName => {
        const replyElement = document.createElement('div');
        replyElement.className = 'reply-element';
        if (!showReplies) {
            replyElement.classList.add('hide');
        }

        const textDiv = document.createElement('div');
        textDiv.className = 'text-div';

        const textElement = document.createElement('div');
        const text = fs.readFileSync(path.join(entriesFolder, fileName), 'utf-8');
        textElement.innerHTML = marked.parse(text);

        // See more
        const seeMoreLink = document.createElement('a');
        seeMoreLink.textContent = 'See more';
        seeMoreLink.href = '#';
        seeMoreLink.style.display = 'none';
        seeMoreLink.style.color = 'gray';
        seeMoreLink.onclick = (e) => {
            e.preventDefault();
            if (textElement.classList.contains('truncate')) {
                textElement.classList.remove('truncate');
                seeMoreLink.textContent = 'See less';
            } else {
                textElement.classList.add('truncate');
                seeMoreLink.textContent = 'See more';
            }
        };
        textDiv.appendChild(textElement);
        textDiv.appendChild(seeMoreLink);
        replyElement.appendChild(textDiv);

        const utilitiesDiv = document.createElement('div');
        utilitiesDiv.className = 'utilities-div mt-2';

        const relatedButton = document.createElement('button');
        relatedButton.textContent = 'Related';
        relatedButton.className = 'related-button';
        relatedButton.onclick = () => {
            const query = { fileName: fileName, text: text };
            fs.writeFileSync(path.join(__dirname, 'query.json'), JSON.stringify(query));
            window.location.href = 'related.html';
        };
        utilitiesDiv.appendChild(relatedButton);

        const replyEntry = entries.find(entry => entry.fileName === fileName);
        const dateElement = document.createElement('span');
        dateElement.textContent = `${replyEntry.date}`;
        dateElement.className = 'date-element';
        utilitiesDiv.appendChild(dateElement);

        // Edit button
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.className = 'edit-button';
        editButton.onclick = async () => {
            editEntry(text, replyEntry);
        };
        utilitiesDiv.appendChild(editButton);

        // Delete button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'delete-button';
        deleteButton.onclick = () => {
            // Remove markdown file
            fs.unlinkSync(path.join(entriesFolder, fileName));
            // Remove entry from entries array
            const entryIndex = entries.findIndex(e => e.fileName === fileName);
            if (entryIndex > -1) {
                entries.splice(entryIndex, 1);
            }
            entries.forEach(entry => {
                const replyIndex = entry.replies.indexOf(fileName);
                if (replyIndex > -1) {
                    entry.replies.splice(replyIndex, 1);
                }
            });
            fs.writeFileSync(entriesFile, JSON.stringify(entries));
            searchEntries(currentQuery, currentTags);
            console.log(fileName + " deleted");
        };
        utilitiesDiv.appendChild(deleteButton);

        replyElement.appendChild(utilitiesDiv);

        entryElement.appendChild(replyElement);
    });

    container.appendChild(entryElement);
}
function renderTags() {
    const container = document.getElementById('tagsContainer');
    container.innerHTML = '';
    Object.keys(tags).forEach(tag => {
        const tagElement = document.createElement('button');
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
            currentTags = selectedTags;
            searchEntries(currentQuery, currentTags);
        };
        container.appendChild(tagElement);
    });
}
function renderAll(){
    searchEntries(currentQuery, currentTags);
    renderTags();
}
