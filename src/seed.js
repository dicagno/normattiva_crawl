import 'dotenv/config';
import { Vectoriser } from './nlp.js'
import { getJsonFileContents, listFilesInDirectory } from './storage.js';
import fs from 'fs';
import path from 'path';

const vectoriser = new Vectoriser({
    openaiApiKey: process.env.OPENAI_API_KEY,
    pineconeApiKey: process.env.PINECONE_API_KEY,
    pineconeEnvironment: process.env.PINECONE_ENVIRONMENT,
    pineconeIndex: process.env.PINECONE_INDEX,
});

await vectoriser.initPinecone();

try {
    console.warn('flushing Pinecone')
    await vectoriser.flushPinecone();
} catch (error) {
    console.warn('flushing Pinecone failed. skipping...')
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

        
        
        const files = (await listFilesInDirectory('/normattiva-crawl'))
        .filter(f => f['.tag'] === 'file' && f.name.startsWith('article_nlped-') && f.name.endsWith('.json'));

        for (const file of files) {
            console.log(`> processing ${file.name}`)

            const articleData = await getJsonFileContents(file.path_lower);

            await vectoriser.processInput(articleData);
        }
    } catch (error) {
        console.error('Error processing files:', error);
    }
})();