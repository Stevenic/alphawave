import { LocalIndex } from "vectra";
import { createHash } from "crypto";
import * as fs from 'fs/promises';
import * as path from 'path';

const INDEX_VERSION: number = 1;

export interface DocumentCacheOptions {
    /**
     * The path to the folder where the cache will be stored.
     */
    folderPath: string;

    /**
     * If true, documents will be indexed for semantic search when they are added to the cache.
     * Defaults to false.
     */
    indexDocuments?: boolean;

    /**
     * Maximum number of document indexes loaded into memory at any one time. Defaults to 10.
     */
    maxIndexesLoaded?: number;
}

export interface ConfiguredDocumentCacheOptions {
    /**
     * The path to the folder where the cache will be stored.
     */
    folderPath: string;

    /**
     * If true, documents will be indexed for semantic search when they are added to the cache.
     * Defaults to false.
     */
    indexDocuments: boolean;

    /**
     * Maximum number of document indexes loaded into memory at any one time. Defaults to 10.
     */
    maxIndexesLoaded: number;
}

export class DocumentCache {
    private readonly _indexCache: Map<string, IndexCacheEntry> = new Map<string, IndexCacheEntry>();
    private readonly _options: ConfiguredDocumentCacheOptions;

    public constructor(options: DocumentCacheOptions) {
        this._options = Object.assign({
            indexDocuments: false,
            maxIndexesLoaded: 10
        }, options) as ConfiguredDocumentCacheOptions;
    }

    public get options(): ConfiguredDocumentCacheOptions {
        return this._options;
    }

    /**
     * Checks if the cache contains an entry for the given URI.
     * @param uri The URI to check for.
     * @returns True if the cache contains an entry for the given URI, false otherwise.
     */
    public async hasCacheEntry(uri: string): Promise<boolean> {
        await this.ensureCacheCreated();

        // Get the cache ID for the URI and compute the path to the cache entry
        const id = this.getCacheID(uri);
        const entryFolder = path.join(this.options.folderPath, id);

        // Check if the cache entry exists
        try {
            await fs.access(entryFolder);
            return true;
        } catch (err: unknown) {
            return false;
        }
    }

    public async upsertDocument(uri: string, document: string): Promise<void> {
        await this.ensureCacheCreated();

        // Get the cache ID for the URI and compute the path to the cache entry
        const id = this.getCacheID(uri);
        const entryFolder = path.join(this.options.folderPath, id);

        // Create folder for entry
        try {
            await fs.mkdir(entryFolder, { recursive: true });
        } catch (err: unknown) {
            throw new Error(`Error creating document cache entry: ${(err as any).toString()}`);
        }

        // Write document to cache
        try {
            await fs.writeFile(path.join(entryFolder, 'document.txt'), document);
        } catch (err: unknown) {
            throw new Error(`Error writing document to cache: ${(err as any).toString()}`);
        }

        // If not indexing documents, we're done
        if (!this.options.indexDocuments) {
            return;
        }

        // Create new local Vectra index
        // - deletes it and creates a new one if it exists
        const index = await this.createNewIndex(id);

        // Index

    }

    /**
     * Ensures that the cache folder exists.
     * @remarks
     * The folder will be created if it doesn't exist.
     */
    protected async ensureCacheCreated(): Promise<void> {
        try {
            await fs.access(this.options.folderPath);
            return;
        } catch (err: unknown) {
            // Cache folder doesn't exist
        }

        // Create folder for index
        try {
            await fs.mkdir(this.options.folderPath, { recursive: true });
        } catch (err: unknown) {
            throw new Error(`Error creating document cache: ${(err as any).toString()}`);
        }
    }

    /**
     * Returns the cache ID for the given URI.
     * @remarks
     * The cache ID is a SHA256 hash of the URI.
     * @param uri URI to get the cache ID for.
     * @returns Unique cache ID for the given URI.
     */
    protected getCacheID(uri: string): string {
        return createHash('sha256').update(uri).digest('hex');
    }

    private async createNewIndex(id: string): Promise<LocalIndex> {
        const index = new LocalIndex(path.join(this.options.folderPath, id));
        await index.createIndex({
            version: INDEX_VERSION,
            deleteIfExists: true
        });

        // Cache index and prune the cache if necessary
        this._indexCache.set(id, {
            id,
            index,
            lastAccess: Date.now()
        });
        this.pruneIndex();

        return index;
    }

    private pruneIndex(): void {
        while (this._indexCache.size > this._options.maxIndexesLoaded) {
            // Find oldest entry
            let oldest: IndexCacheEntry|undefined = undefined;
            const keys = this._indexCache.keys();
            for (const key of keys) {
                const entry = this._indexCache.get(key)!;
                if (oldest == undefined || oldest.lastAccess > entry.lastAccess) {
                    oldest = entry;
                }
            }

            // Remove it
            this._indexCache.delete(oldest!.id);
        }
    }
}

interface IndexCacheEntry {
    id: string;
    index: LocalIndex;
    lastAccess: number;
}