import 'dotenv/config';
import { Vectoriser } from './nlp.js'
import fs from 'fs';
import path from 'path';

const vectoriser = new Vectoriser({
    openaiApiKey: process.env.OPENAI_API_KEY,
    pineconeApiKey: process.env.PINECONE_API_KEY,
    pineconeEnvironment: process.env.PINECONE_ENVIRONMENT,
    pineconeIndex: process.env.PINECONE_INDEX,
});

await vectoriser.initPinecone();

const folderPath = '/Users/adicagno/Dropbox/Applicazioni/normattiva-crawl/normattiva-crawl';
const files = fs.readdirSync(folderPath).filter(file => file.startsWith('article_nlped-') && file.endsWith('.json'));

for (const file of files) {
    console.log(`> processing ${file}`)
    const filePath = path.join(folderPath, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const articleData = JSON.parse(fileContent);

    await vectoriser.processInput(articleData);
}

(async () => {
    try {
        const vectoriser = new Vectoriser({
            openaiApiKey: process.env.OPENAI_API_KEY,
            pineconeApiKey: process.env.PINECONE_API_KEY,
            pineconeEnvironment: process.env.PINECONE_ENVIRONMENT,
            pineconeIndex: process.env.PINECONE_INDEX,
        });

        await vectoriser.initPinecone();

        const folderPath = '/Users/adicagno/Dropbox/Applicazioni/normattiva-crawl/normattiva-crawl';
        const files = fs.readdirSync(folderPath).filter(file => file.startsWith('article_nlped-') && file.endsWith('.json'));

        for (const file of files) {
            console.log(`> processing ${file}`)
            const filePath = path.join(folderPath, file);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const articleData = JSON.parse(fileContent);

            await vectoriser.processInput(articleData);
        }
    } catch (error) {
        console.error('Error processing files:', error);
    }
})();