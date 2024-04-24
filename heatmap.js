const fs = require('fs');
const path = require('path');
import CalHeatmap from 'cal-heatmap';
import 'cal-heatmap/cal-heatmap.css';

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
}
createHeatmap(data);