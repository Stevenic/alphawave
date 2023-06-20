import { EmbeddingsModel, EmbeddingsResponse } from "alphawave";
import { Embeddings } from "langchain/embeddings/base";

/**
 * An adaptor that lets embeddings from either AlphaWave or LangChain.JS work in either library.
 */
export class LangChainEmbeddings extends Embeddings implements EmbeddingsModel {
    private readonly _instance: EmbeddingsModel|Embeddings;

    /**
     * Creates a new `LangChainEmbeddings` instance.
     * @param instance Embeddings instance being adapted.
     */
    public constructor(instance: EmbeddingsModel|Embeddings) {
        super({});
        this._instance = instance;
    }

    /**
     * Returns the embeddings instance that's being adapted.
     */
    public get instance(): EmbeddingsModel|Embeddings {
        return this._instance;
    }

    /**
     * Returns true if the instance being adapted is an AlphaWave based `EmbeddingsModel`.
     */
    public get isAlphaWaveInstance(): boolean {
        return typeof (this.instance as EmbeddingsModel).createEmbeddings == 'function';
    }

    /**
     * @private
     */
    public async embedDocuments(documents: string[]): Promise<number[][]> {
        if (this.isAlphaWaveInstance) {
            const response = await (this._instance as EmbeddingsModel).createEmbeddings(documents);
            if (response.status == 'success') {
                return response.output!;
            } else {
                throw new Error(`Embeddings ${response.status} error: ${response.message}`);
            }
        } else {
            return await (this._instance as Embeddings).embedDocuments(documents);
        }
    }

    /**
     * @private
     */
    public async embedQuery(query: string): Promise<number[]> {
        if (this.isAlphaWaveInstance) {
            const response = await (this._instance as EmbeddingsModel).createEmbeddings(query);
            if (response.status == 'success') {
                return response.output![0];
            } else {
                throw new Error(`Embeddings ${response.status} error: ${response.message}`);
            }
        } else {
            return await (this._instance as Embeddings).embedQuery(query);
        }
    }

    /**
     * @private
     */
    public async createEmbeddings(inputs: string | string[]): Promise<EmbeddingsResponse> {
        if (this.isAlphaWaveInstance) {
            return await (this._instance as EmbeddingsModel).createEmbeddings(inputs);
        } else {
            try {
                if (typeof inputs == 'string') {
                    const embeddings = await (this._instance as Embeddings).embedQuery(inputs);
                    return {
                        status: 'success',
                        output: [embeddings]
                    };
                } else {
                    const output = await (this._instance as Embeddings).embedDocuments(inputs);
                    return {
                        status: 'success',
                        output
                    };
                }
            } catch (err: unknown) {
                return {
                    status: 'error',
                    message: (err as any).toString()
                };
            }
        }
    }
}
