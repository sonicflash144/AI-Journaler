import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
dotenv.config();

import {
  Document,
  MetadataMode,
  NodeWithScore,
  VectorStoreIndex,
} from "llamaindex";

const entriesFile = path.join(__dirname, 'user_entries', 'entries.json');
const entriesFolder = path.join(__dirname, 'user_entries');

async function main() {
    let entries: { fileName: string, text?: string }[] = [];
    try {
        await fs.access(entriesFile);
        const data = JSON.parse(await fs.readFile(entriesFile, 'utf-8'));
        for (const entry of data) {
            const entryText = await fs.readFile(path.join(entriesFolder, entry.fileName), 'utf-8');
            entries.push({ ...entry, text: entryText });
        }
    } catch (error) {
        console.error(error);
        return;
    }

    // Create Document objects with entries
    const documents = entries.map(entry => new Document({ text: entry.text, id_: entry.fileName }));

    // Split text and create embeddings. Store them in a VectorStoreIndex
    const index = await VectorStoreIndex.fromDocuments(documents);

    // Query the index
    const queryEngine = index.asQueryEngine();
    const { response, sourceNodes } = await queryEngine.query({
        query: "What are the author's interests?",
    });

    // Output response with sources
    console.log(response);

    if (sourceNodes) {
        sourceNodes.forEach((source: NodeWithScore, index: number) => {
        console.log(
            `\n${index}: Score: ${source.score} - ${source.node.getContent(MetadataMode.NONE).substring(0, 50)}...\n`,
        );
        });
    }
}

main().catch(console.error);