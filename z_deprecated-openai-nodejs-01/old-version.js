// 1. Import necessary modules
import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse';

// 2. Load environment variables
dotenv.config();

// 3. Initialize OpenAI API
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 4. Function to split text into smaller chunks
function splitText(text, maxTokens = 8000) {
    const sentences = text.split(/(?<=[.!?])\s+/); // Split by sentences
    let chunks = [];
    let currentChunk = "";

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxTokens) {
            chunks.push(currentChunk);
            currentChunk = sentence;
        } else {
            currentChunk += " " + sentence;
        }
    }
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
}

// 5. Function to process a single file
async function processFile(filePath, model, instructions) {
    let content = "";
    
    if (filePath.endsWith('.pdf')) {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        content = pdfData.text;
    } else {
        content = fs.readFileSync(filePath, 'utf-8');
    }
    
    const chunks = splitText(content);
    for (const [index, chunk] of chunks.entries()) {
        console.log(`Processing chunk ${index + 1}/${chunks.length} of ${filePath}`);
        try {
            const response = await openai.chat.completions.create({
                model,
                messages: [
                    { role: "system", content: instructions },
                    { role: "user", content: chunk }
                ]
            });
            console.log(`Response for chunk ${index + 1}:`, response.choices[0].message.content);
        } catch (error) {
            console.error(`Error processing chunk ${index + 1}:`, error);
        }
    }
}

// 6. Process all files in a directory
async function processBatch(directory, model = 'gpt-4', instructions = "") {
    const files = fs.readdirSync(directory);
    
    for (const file of files) {
        const filePath = path.join(directory, file);
        if (fs.statSync(filePath).isFile()) {
            console.log(`Processing: ${file}`);
            await processFile(filePath, model, instructions);
        }
    }
}

// 7. Execute script with directory and optional parameters
const args = process.argv.slice(2);
const directory = args[0] || './files'; // Default directory
const model = args[1] || 'gpt-4';
const instructions = args[2] || 'Provide a concise summary of the content.';

if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OpenAI API Key. Set it in the .env file.");
    process.exit(1);
}

processBatch(directory, model, instructions);
