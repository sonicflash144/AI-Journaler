const fs = require('fs');
const path = require('path');
const marked = require('marked');
import CalHeatmap from 'cal-heatmap';
import 'cal-heatmap/cal-heatmap.css';

const container = document.getElementById('entriesContainer');
const calHeatmapDiv = document.getElementById('cal-heatmap');
const entriesFile = path.join(__dirname, 'user_entries', 'entries.json');
const entriesFolder = path.join(__dirname, 'user_entries');
let entries = [];

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

function createHeatmap(data){
    const monthsPerPage = 3;
    window.cal = new CalHeatmap();
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
        date: { start: new Date('2024-02-01') },
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
        const clickedDate = new Date(timestamp);
        clickedDate.setDate(clickedDate.getDate() + 1);
    
        // Filter the entries based on the clicked date
        const clickedEntries = entries.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate.getFullYear() === clickedDate.getFullYear() &&
                entryDate.getMonth() === clickedDate.getMonth() &&
                entryDate.getDate() === clickedDate.getDate();
        });
    
        // Call the renderEntries function with the clicked entries
        renderEntries(clickedEntries, clickedDate);
    });
}
createHeatmap(data);

function renderEntries(entries, clickedDate) {
    container.innerHTML = '';
    entries.filter(entry => entry.parent === "")
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach(entry => {
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

        //Display replies
        entry.replies.forEach(fileName => {
            const dateString = fileName.split(',')[0];
            const replyDate = new Date(dateString);
            if (replyDate.getDate() !== clickedDate.getDate() || replyDate.getMonth() !== clickedDate.getMonth() || replyDate.getFullYear() !== clickedDate.getFullYear()) {
                return;
            }

            const replyElement = document.createElement('div');
            replyElement.className = 'reply-element';

            const textDiv = document.createElement('div');
            textDiv.className = 'text-div';

            const textElement = document.createElement('div');
            const text = fs.readFileSync(path.join(entriesFolder, fileName), 'utf-8');
            textElement.innerHTML = marked.parse(text);
            textDiv.appendChild(textElement);

            replyElement.appendChild(textDiv);

            const utilitiesDiv = document.createElement('div');
            utilitiesDiv.className = 'utilities-div mt-2';

            const replyEntry = entries.find(entry => entry.fileName === fileName);
            const dateElement = document.createElement('span');
            dateElement.textContent = `${replyEntry.date}`;
            dateElement.className = 'date-element';
            utilitiesDiv.appendChild(dateElement);

            replyElement.appendChild(utilitiesDiv);

            entryElement.appendChild(replyElement);
        });

        container.appendChild(entryElement);
    });
}