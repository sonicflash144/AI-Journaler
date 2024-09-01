const fs = window.electron.fs;
const path = window.electron.path;
const marked = window.electron.marked;

const angleUpIcon = document.createElement('i');
angleUpIcon.className = 'fas fa-angle-up';
const angleDownIcon = document.createElement('i');
angleDownIcon.className = 'fas fa-angle-down';
const container = document.getElementById('entriesContainer');
const calHeatmapDiv = document.getElementById('cal-heatmap');

var entriesFile, entriesFolder;
let entries = [];
window.electron.app.getPath('userData').then(userDataPath => {
    entriesFile = path.join(userDataPath, 'user_entries', 'entries.json');
    entriesFolder = path.join(userDataPath, 'user_entries');
    if (fs.existsSync(entriesFile)) {
        const data = JSON.parse(fs.readFileSync(entriesFile, 'utf-8'));
        entries = data.map(entry => {
            return { ...entry};
        });
    }
    if (!fs.existsSync(entriesFolder)){
        fs.mkdirSync(entriesFolder);
    } 
    var data = entries.reduce((acc, entry) => {
        const date = new Date(entry.date);
        date.setHours(0, 0, 0, 0);
        const timestamp = date.getTime();
        acc[timestamp] = (acc[timestamp] || []).concat(entry.sentimentScore);
        return acc;
    }, {});
    
    // Convert data to an array of objects
    data = Object.entries(data).map(([date, values]) => {
        const averageValue = values.reduce((a, b) => a + b, 0) / values.length;
        return { date: parseInt(date), value: averageValue };
    });   
    createHeatmap(data);
});

let clickedDate;
const contextBtn = document.getElementById('toggleContextButton');
let showContext = false;
contextBtn.onclick = function() {
    container.classList.toggle('show-context');
    showContext = container.classList.contains('show-context');
    contextBtn.textContent = showContext ? 'Hide Context' : 'Show Context';
    filterEntries(clickedDate);
}

function createHeatmap(data){
    const monthsPerPage = 3;

    window.cal = new CalHeatmap();
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1);

    window.cal.paint(
    {
        data: {
            source: data, 
            x: 'date', 
            y: 'value',
        },
        verticalOrientation: true,
        range: monthsPerPage,
        itemSelector: '#cal-heatmap',
        date: { start: startDate },
        scale: { color: { type: 'diverging', scheme: 'PRGn', domain: [-1, 1] } },
        domain: {
            type: 'month',
            padding: [10, 10, 5, 10],
            label: { position: 'top', height: 30 },
        },
        subDomain: { type: 'xDay', radius: 2, width: 30, height: 30, label: 'D' },
    }
    );

    const prevButton = document.createElement('a');
    prevButton.className = "button button--sm button--secondary";
    prevButton.style.marginRight = "16px";
    prevButton.href = "#";
    prevButton.onclick = function(event) {
        event.preventDefault();
        window.cal.previous();
    };
    prevButton.textContent = "← Previous";

    const nextButton = document.createElement('a');
    nextButton.className = "button button--sm button--secondary margin-left--xs";
    nextButton.href = "#";
    nextButton.onclick = function(event) {
        event.preventDefault();
        window.cal.next();
    };
    nextButton.textContent = "Next →";

    calHeatmapDiv.appendChild(prevButton);
    calHeatmapDiv.appendChild(nextButton);

    cal.on('click', (event, timestamp, value) => {
        // Convert the timestamp to a date object
        clickedDate = new Date(timestamp);
        clickedDate.setDate(clickedDate.getDate() + 1);
    
        filterEntries(clickedDate);
    });
}

function filterEntries(clickedDate) {
    container.innerHTML = '';
    const entriesForDate = entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getDate() === clickedDate.getDate() &&
            entryDate.getMonth() === clickedDate.getMonth() &&
            entryDate.getFullYear() === clickedDate.getFullYear();
    });
    if (showContext) {
        const renderedEntries = new Set();
        entriesForDate.forEach(entry => {
            if (entry.parent === "") {
                renderEntry(entry);
                renderedEntries.add(entry.fileName);
            } else {
                // Find the parent entry
                const parentEntry = entries.find(e => e.fileName === entry.parent);
                if (parentEntry && !renderedEntries.has(parentEntry.fileName)) {
                    renderEntry(parentEntry);
                    renderedEntries.add(parentEntry.fileName);
                }
            }
        });
    } else {
        entriesForDate.forEach(entry => {
            renderEntry(entry);
        });
    }
}

function renderEntry(entry, showReplies=showContext) {
    const entryText = fs.readFileSync(path.join(entriesFolder, entry.fileName), 'utf-8');

    const entryElement = document.createElement('div');
    entryElement.className = 'entry-element p-4 border mb-2';

    const parentDiv = document.createElement('div');
    parentDiv.className = 'parent-div';

    const textDiv = document.createElement('div');
    textDiv.className = 'text-div';

    const textElement = document.createElement('div');
    textElement.innerHTML = marked.parse(entryText);
    textElement.classList.add('truncate');

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

    parentDiv.appendChild(textDiv);

    const utilitiesDiv = document.createElement('div');
    utilitiesDiv.className = 'utilities-div mt-2';

    const relatedButton = document.createElement('button');
    relatedButton.textContent = 'Related';
    relatedButton.className = 'related-button';
    relatedButton.onclick = () => {
        const query = { fileName: entry.fileName, text: entryText };
        fs.writeFileSync(path.join(userDataPath, 'query.json'), JSON.stringify(query));
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
    parentDiv.appendChild(utilitiesDiv);
    entryElement.appendChild(parentDiv);

    if(!showReplies){
        container.appendChild(entryElement);
        return;
    }

    // Display replies
    if (entry.replies.length > 0) {
        const toggleRepliesButton = document.createElement('button');
        toggleRepliesButton.innerHTML = '';
        toggleRepliesButton.appendChild(angleUpIcon.cloneNode(true)); 
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
        parentDiv.insertBefore(toggleRepliesButton, parentDiv.firstChild);
    }
    entryElement.appendChild(parentDiv);

    entry.replies.forEach(fileName => {
        const replyElement = document.createElement('div');
        replyElement.className = 'reply-element hide';

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
            fs.writeFileSync(path.join(userDataPath, 'query.json'), JSON.stringify(query));
            window.location.href = 'related.html';
        };
        utilitiesDiv.appendChild(relatedButton);

        const replyEntry = entries.find(entry => entry.fileName === fileName);
        const dateElement = document.createElement('span');
        dateElement.textContent = `${replyEntry.date}`;
        dateElement.className = 'date-element';
        utilitiesDiv.appendChild(dateElement);
        replyElement.appendChild(utilitiesDiv);

        entryElement.appendChild(replyElement);
    });

    container.appendChild(entryElement);
}