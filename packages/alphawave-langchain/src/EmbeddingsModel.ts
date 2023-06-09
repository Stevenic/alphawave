import { EmbeddingsClient } from "alphawave";
import { Embeddings } from "langchain/embeddings/base";

export interface EmbeddingsModelOptions {
    client: EmbeddingsClient;
    model: string;
}

export class EmbeddingsModel extends Embeddings {
     public constructor(public readonly options: EmbeddingsModelOptions) {
        super({});
    }

    /**
     * @private
     */
    public async embedDocuments(documents: string[]): Promise<number[][]> {
        const response = await this.options.client.createEmbeddings(this.options.model, documents);
        if (response.status == 'success') {
            return response.output!;
        } else {
            throw new Error(`Embeddings ${response.status} error: ${response.message}`);
        }
    }

    /**
     * @private
     */
    public async embedQuery(document: string): Promise<number[]> {
        const response = await this.options.client.createEmbeddings(this.options.model, document);
        if (response.status == 'success') {
            return response.output![0];
        } else {
            throw new Error(`Embeddings ${response.status} error: ${response.message}`);
        }
    }
}
