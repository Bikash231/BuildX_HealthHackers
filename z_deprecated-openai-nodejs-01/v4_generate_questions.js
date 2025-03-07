import fs from 'fs/promises';
import path from 'path';
import { OpenAI } from 'openai';
import { PDFDocument } from 'pdf-lib';

// Load OpenAI API key from environment variable
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function readPDF(filePath) {
    const data = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(data);
    const text = (await Promise.all(
        pdfDoc.getPages().map(async (page) => await page.getTextContent())
    )).flat().map((content) => content.items.map((item) => item.str).join(' ')).join('\n');
    return text;
}

async function processDirectory(directoryPath) {
    try {
        const files = await fs.readdir(directoryPath, { withFileTypes: true });
        const subdirectories = files.filter(dirent => dirent.isDirectory());

        for (const subdir of subdirectories) {
            const subdirPath = path.join(directoryPath, subdir.name);
            const subdirFiles = await fs.readdir(subdirPath);

            const jsonFile = subdirFiles.find(file => file.endsWith('.json'));
            const pdfFile = subdirFiles.find(file => file.endsWith('.pdf'));

            if (jsonFile && pdfFile) {
                const jsonFilePath = path.join(subdirPath, jsonFile);
                const pdfFilePath = path.join(subdirPath, pdfFile);
                
                const jsonData = JSON.parse(await fs.readFile(jsonFilePath, 'utf-8'));
                const pdfContent = await readPDF(pdfFilePath);

                if (jsonData.mainTopic && jsonData.subTopics) {
                    await generateQuestions(jsonData.mainTopic.title, jsonData.subTopics, pdfContent);
                }
            }
        }
    } catch (error) {
        console.error('Error processing directory:', error);
    }
}

async function generateQuestions(mainTopic, subTopics, pdfContent) {
    const subTopicTitles = subTopics.map(sub => sub.title).join(', ');
    const prompt = `I am a medical student and I am preparing for an exam. I have the following medical text that I need to learn. I can only do this using revision questions that provide enough information and challenge that I can use them to prepare for the exam. Take the following main topic and subtopics and give me at least three questions per topic and at most fourteen questions per topic and provide the answers. For each question also provide three distractor questions and format them as JSON.\n\nMain Topic: ${mainTopic}\nSubtopics: ${subTopicTitles}\n\nText:\n${pdfContent}`;
    
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 4096
        });
        console.log('OpenAI Response:', response.choices[0].message.content);
    } catch (error) {
        console.error('Error generating questions:', error);
    }
}

const args = process.argv.slice(2);
if (args.length !== 1) {
    console.error('Usage: node app.js <directory-path>');
    process.exit(1);
}

processDirectory(args[0]);
