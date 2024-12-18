import { OpenAI } from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

export async function generateEmbedding(openaiClient, sentence) {
    const response = await openaiClient.embeddings.create({
        model: "text-embedding-ada-002",
        input: sentence,
    });
    return response.data[0].embedding;
}

export class Vectoriser {
    constructor({ openaiApiKey, pineconeApiKey, pineconeIndex }) {
        this.openaiApiKey = openaiApiKey;
        this.pineconeApiKey = pineconeApiKey;
        this.pineconeIndex = pineconeIndex;

        // Initialize OpenAI API
        this.openai = new OpenAI({
                apiKey: this.openaiApiKey,
            });

        // Initialize Pinecone client
        this.pineconeClient = new Pinecone({
            apiKey: this.pineconeApiKey,
        });
    }

    async initPinecone() {
        this.pineconeIndexInstance = this.pineconeClient.index(this.pineconeIndex);
    }

    async generateEmbeddings(sentences) {
        const embeddings = [];
        for (const sentence of sentences) {
            try {
                embeddings.push({
                    sentence,
                    embedding: await this.generateEmbedding(this.openai, sentence),
                });
            } catch (error) {
                console.error(`Error generating embedding for sentence: ${sentence}`, error.message);
            }
        }
        return embeddings;
    }

    async upsertEmbeddings(input, embeddings) {
        const vectors = embeddings.map((item, index) => ({
            id: `${input.metadata.uriHash}_${index}`,
            values: item.embedding,
            metadata: {
                sentence: item.sentence,
                ...input.metadata,
            },
        }));

        try {
            await this.pineconeIndexInstance.namespace('ns1').upsert(vectors);
            console.log("Data successfully upserted to Pinecone.");
        } catch (error) {
            console.error("Error upserting data to Pinecone:", error.message);
        }
    }

    async processInput(input) {
        try {
            console.log("Generating embeddings...");
            const embeddings = await this.generateEmbeddings(input.sentences);

            console.log("Upserting embeddings to Pinecone...");
            await this.upsertEmbeddings(input, embeddings);
        } catch (error) {
            console.error("Error processing input:", error.message);
        }
    }
}

