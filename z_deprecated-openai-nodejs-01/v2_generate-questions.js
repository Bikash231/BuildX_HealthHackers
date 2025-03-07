import fs from 'fs';
import pdf from 'pdf-parse';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const USER_PROMPT = 'I am a medical student and need to learn for an exam based on this text. Generate revision questions with their correct answers for me based on this text so that I can learn for my exam.';

async function readPdf(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
}

async function sendToOpenAI(text, prompt) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: 'You are an AI assistant.' },
                    { role: 'user', content: `${prompt}\n\n${text}` }
                ],
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error sending to OpenAI:', error.response?.data || error.message);
    }
}

(async () => {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Please provide a file path as an argument.');
        process.exit(1);
    }

    try {
        console.log('Reading PDF...');
        const pdfText = await readPdf(filePath);
        console.log('Sending to OpenAI...');
        const response = await sendToOpenAI(pdfText, USER_PROMPT);
        console.log('Response from OpenAI:', response);
    } catch (error) {
        console.error('Error:', error);
    }
})();
