const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { Configuration, OpenAIApi } = require('openai');

// Take an argument when the JS file is called. This is path of a directory. Iterate through the directory and read it. Expect a folder that contains a PDF file and a JSON file. Read and parse the PDF file and the JSON file. Get mainTopic.subTopics from the JSON. This is an array of objects. Each object has the key "title". Send the text from the PDF file to OpenAI with the model gpt-4 and a prompt string. The prompt should be: "I am a medical student preparing for an exam. Help me. Based on the text below, generate revision questions with their correct answers for me. Structure the questions and answers based on the following subtopics" followed by the subtopics from the JSON file. The response from OpenAI should be saved output to the console.

const directoryPath = process.argv[2];

fs.readdir(directoryPath, async (err, files) => {
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    }

    let pdfFilePath, jsonFilePath;

    files.forEach(file => {
        if (path.extname(file) === '.pdf') {
            pdfFilePath = path.join(directoryPath, file);
        } else if (path.extname(file) === '.json') {
            jsonFilePath = path.join(directoryPath, file);
        }
    });

    if (!pdfFilePath || !jsonFilePath) {
        return console.log('PDF file or JSON file not found in the directory');
    }

    const pdfData = await fs.promises.readFile(pdfFilePath);
    const pdfText = await pdfParse(pdfData).then(data => data.text);

    const jsonData = await fs.promises.readFile(jsonFilePath, 'utf8');
    const jsonObject = JSON.parse(jsonData);
    const subTopics = jsonObject.mainTopic.subTopics.map(subTopic => subTopic.title).join(', ');

    const prompt = `I am a medical student preparing for an exam. Help me. Based on the text below, generate revision questions with their correct answers for me. Structure the questions and answers based on the following subtopics: ${subTopics}\n\n${pdfText}`;

    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    try {
        const response = await openai.createCompletion({
            model: 'gpt-4',
            prompt: prompt,
            max_tokens: 2000,
        });

        console.log(response.data.choices[0].text);
    } catch (error) {
        console.error('Error communicating with OpenAI:', error);
    }
});
