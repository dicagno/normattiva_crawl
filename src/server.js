import 'dotenv/config';

import express from 'express';
import bodyParser from 'body-parser';

import {generateEmbedding} from './nlp.js';
import OpenAI from 'openai';

import { Pinecone } from "@pinecone-database/pinecone";

const pineconeClient = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

const pineconeIndex = pineconeClient.index(process.env.PINECONE_INDEX);

// Initialize the Express app
const app = express();
const port = 3210;

// Middleware
app.use(bodyParser.json());
app.use(express.static('./public'));

const openAIClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Endpoint for semantic search
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        const limit = parseInt(req.query.limit || '5', 10);

        if (!query) {
            return res.status(400).json({ error: 'Query parameter \"q\" is required' });
        }

        // Prepare the vector embedding (replace this with your actual embedding generation logic)
        const embedding = await generateEmbedding(openAIClient, query);

        const queryObj = {
            vector: embedding,
            topK: limit,
            includeMetadata: true,
            includeValues: false,
        };

        console.log('queryObj', queryObj, query);

        // Query Pinecone index
        const response = await pineconeIndex.namespace(process.env.PINECONE_NAMESPACE).query(queryObj);

        // Respond with the results
        return res.status(200).json(response);
    } catch (error) {
        console.error('Error querying Pinecone:', error);
        return res.status(500).json({ error: 'An error occurred while querying Pinecone' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
