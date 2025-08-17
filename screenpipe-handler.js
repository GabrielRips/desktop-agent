const screenshot = require('screenshot-desktop');
const { QdrantClient } = require('@qdrant/js-client-rest');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;

class ScreenpipeHandler {
    constructor() {
        this.qdrantClient = null;
        this.collectionName = 'screenshots';
        this.isInitialized = false;
        this.screenshotDir = path.join(__dirname, 'screenshots');
        this.embeddingModel = 'text-embedding-ada-002'; // OpenAI embedding model
        this.openaiApiKey = null;
    }

    async initialize(openaiApiKey) {
        try {
            this.openaiApiKey = openaiApiKey;
            
            // Create screenshots directory if it doesn't exist
            await this.ensureScreenshotDir();
            
            // Initialize Qdrant client
            this.qdrantClient = new QdrantClient({
                url: process.env.QDRANT_URL || 'http://localhost:6333'
            });
            
            // Check if Qdrant is running
            try {
                await this.qdrantClient.getCollections();
                console.log('✅ Qdrant connection established');
            } catch (error) {
                console.error('❌ Failed to connect to Qdrant. Make sure Qdrant is running on http://localhost:6333');
                console.error('You can start Qdrant with: docker run -p 6333:6333 qdrant/qdrant');
                return false;
            }
            
            // Create collection if it doesn't exist
            await this.createCollection();
            
            // Initialize Tesseract
            await Tesseract.createWorker();
            
            this.isInitialized = true;
            console.log('✅ Screenpipe handler initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize screenpipe handler:', error);
            return false;
        }
    }

    async ensureScreenshotDir() {
        try {
            await fs.access(this.screenshotDir);
        } catch {
            await fs.mkdir(this.screenshotDir, { recursive: true });
        }
    }

    async createCollection() {
        try {
            const collections = await this.qdrantClient.getCollections();
            const collectionExists = collections.collections.some(
                col => col.name === this.collectionName
            );

            if (!collectionExists) {
                await this.qdrantClient.createCollection(this.collectionName, {
                    vectors: {
                        size: 1536, // OpenAI ada-002 embedding size
                        distance: 'Cosine'
                    }
                });
                console.log(`✅ Created Qdrant collection: ${this.collectionName}`);
            } else {
                console.log(`✅ Using existing Qdrant collection: ${this.collectionName}`);
            }
        } catch (error) {
            console.error('❌ Failed to create collection:', error);
            throw error;
        }
    }

    async captureScreenshot() {
        if (!this.isInitialized) {
            throw new Error('Screenpipe handler not initialized');
        }

        try {
            console.log('📸 Capturing screenshot...');
            
            // Capture screenshot using screenshot-desktop
            const screenshotBuffer = await screenshot();
            
            // Generate unique filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `screenshot-${timestamp}.png`;
            const filepath = path.join(this.screenshotDir, filename);
            
            // Save screenshot
            await fs.writeFile(filepath, screenshotBuffer);
            console.log(`✅ Screenshot saved: ${filepath}`);
            
            return { filepath, filename, timestamp };
        } catch (error) {
            console.error('❌ Failed to capture screenshot:', error);
            throw error;
        }
    }

    async extractTextFromImage(imagePath) {
        try {
            console.log('🔍 Extracting text from image...');
            
            // Optimize image for OCR
            const optimizedImageBuffer = await sharp(imagePath)
                .resize(1920, null, { withoutEnlargement: true })
                .png()
                .toBuffer();
            
            // Perform OCR
            const worker = await Tesseract.createWorker();
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            
            const { data: { text } } = await worker.recognize(optimizedImageBuffer);
            await worker.terminate();
            
            console.log(`✅ Extracted ${text.length} characters of text`);
            return text.trim();
        } catch (error) {
            console.error('❌ Failed to extract text from image:', error);
            return '';
        }
    }

    async generateEmbedding(text) {
        if (!text || text.length === 0) {
            return null;
        }

        try {
            console.log('🧠 Generating embedding...');
            
            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.openaiApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    input: text,
                    model: this.embeddingModel
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            const embedding = data.data[0].embedding;
            
            console.log(`✅ Generated embedding with ${embedding.length} dimensions`);
            return embedding;
        } catch (error) {
            console.error('❌ Failed to generate embedding:', error);
            return null;
        }
    }

    async storeScreenshot(filepath, filename, text, embedding, timestamp) {
        if (!embedding) {
            console.log('⚠️ No embedding generated, skipping storage');
            return null;
        }

        try {
            const id = uuidv4();
            const payload = {
                id,
                filename,
                filepath,
                text,
                timestamp,
                created_at: new Date().toISOString()
            };

            await this.qdrantClient.upsert(this.collectionName, {
                points: [{
                    id,
                    vector: embedding,
                    payload
                }]
            });

            console.log(`✅ Stored screenshot in Qdrant with ID: ${id}`);
            return id;
        } catch (error) {
            console.error('❌ Failed to store screenshot in Qdrant:', error);
            throw error;
        }
    }

    async captureAndProcess() {
        try {
            // Capture screenshot
            const { filepath, filename, timestamp } = await this.captureScreenshot();
            
            // Extract text
            const text = await this.extractTextFromImage(filepath);
            
            // Generate embedding
            const embedding = await this.generateEmbedding(text);
            
            // Store in Qdrant
            const id = await this.storeScreenshot(filepath, filename, text, embedding, timestamp);
            
            // Clean up old screenshots if we have too many (keep last 1000)
            try {
                await this.cleanupOldScreenshots(1000);
            } catch (cleanupError) {
                console.warn('⚠️ Failed to cleanup old screenshots:', cleanupError.message);
            }
            
            return {
                id,
                filepath,
                filename,
                text,
                timestamp,
                success: true
            };
        } catch (error) {
            console.error('❌ Failed to capture and process screenshot:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async searchScreenshots(query, limit = 5) {
        if (!this.isInitialized) {
            throw new Error('Screenpipe handler not initialized');
        }

        try {
            console.log(`🔍 Searching screenshots for: "${query}"`);
            
            // Generate embedding for the query
            const queryEmbedding = await this.generateEmbedding(query);
            if (!queryEmbedding) {
                throw new Error('Failed to generate embedding for query');
            }
            
            // Search in Qdrant
            const searchResult = await this.qdrantClient.search(this.collectionName, {
                vector: queryEmbedding,
                limit,
                with_payload: true,
                with_vectors: false
            });
            
            console.log(`✅ Found ${searchResult.length} relevant screenshots`);
            return searchResult;
        } catch (error) {
            console.error('❌ Failed to search screenshots:', error);
            throw error;
        }
    }

    async getScreenshotById(id) {
        try {
            const result = await this.qdrantClient.retrieve(this.collectionName, {
                ids: [id],
                with_payload: true
            });
            
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('❌ Failed to retrieve screenshot:', error);
            throw error;
        }
    }

    async deleteScreenshot(id) {
        try {
            // Get screenshot info first
            const screenshot = await this.getScreenshotById(id);
            if (!screenshot) {
                throw new Error('Screenshot not found');
            }
            
            // Delete from Qdrant
            await this.qdrantClient.delete(this.collectionName, {
                points: [id]
            });
            
            // Delete file
            try {
                await fs.unlink(screenshot.payload.filepath);
                console.log(`✅ Deleted file: ${screenshot.payload.filepath}`);
            } catch (fileError) {
                console.warn('⚠️ Failed to delete file:', fileError.message);
            }
            
            console.log(`✅ Deleted screenshot with ID: ${id}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to delete screenshot:', error);
            throw error;
        }
    }

    async getStats() {
        try {
            const collectionInfo = await this.qdrantClient.getCollection(this.collectionName);
            const count = collectionInfo.points_count;
            
            // Get disk usage
            const files = await fs.readdir(this.screenshotDir);
            const totalSize = await Promise.all(
                files.map(async (file) => {
                    const filepath = path.join(this.screenshotDir, file);
                    const stats = await fs.stat(filepath);
                    return stats.size;
                })
            ).then(sizes => sizes.reduce((sum, size) => sum + size, 0));
            
            return {
                totalScreenshots: count,
                diskUsageBytes: totalSize,
                diskUsageMB: Math.round(totalSize / 1024 / 1024 * 100) / 100
            };
        } catch (error) {
            console.error('❌ Failed to get stats:', error);
            throw error;
        }
    }

    async cleanupOldScreenshots(maxScreenshots = 1000) {
        try {
            const collectionInfo = await this.qdrantClient.getCollection(this.collectionName);
            const count = collectionInfo.points_count;
            
            if (count <= maxScreenshots) {
                return { deleted: 0, remaining: count };
            }
            
            const toDelete = count - maxScreenshots;
            console.log(`🧹 Cleaning up ${toDelete} old screenshots (keeping ${maxScreenshots} most recent)`);
            
            // Get all points sorted by creation time (oldest first)
            const allPoints = await this.qdrantClient.scroll(this.collectionName, {
                limit: count,
                with_payload: true,
                with_vectors: false
            });
            
            // Sort by creation time and get oldest ones
            const sortedPoints = allPoints.points.sort((a, b) => {
                const timeA = new Date(a.payload.created_at).getTime();
                const timeB = new Date(b.payload.created_at).getTime();
                return timeA - timeB;
            });
            
            const pointsToDelete = sortedPoints.slice(0, toDelete);
            const idsToDelete = pointsToDelete.map(p => p.id);
            
            // Delete from Qdrant
            await this.qdrantClient.delete(this.collectionName, {
                points: idsToDelete
            });
            
            // Delete files
            for (const point of pointsToDelete) {
                try {
                    await fs.unlink(point.payload.filepath);
                } catch (fileError) {
                    console.warn(`⚠️ Failed to delete file: ${point.payload.filepath}`);
                }
            }
            
            console.log(`✅ Cleaned up ${toDelete} old screenshots`);
            return { deleted: toDelete, remaining: maxScreenshots };
            
        } catch (error) {
            console.error('❌ Failed to cleanup old screenshots:', error);
            throw error;
        }
    }

    async startPeriodicCapture(intervalMinutes = 0.17) {
        if (!this.isInitialized) {
            throw new Error('Screenpipe handler not initialized');
        }

        const intervalMs = intervalMinutes * 60 * 1000;
        const intervalSeconds = intervalMinutes * 60;
        
        if (intervalSeconds < 1) {
            console.log(`🔄 Starting frequent screenshot capture every ${intervalSeconds} seconds`);
        } else if (intervalMinutes < 1) {
            console.log(`🔄 Starting frequent screenshot capture every ${intervalSeconds} seconds`);
        } else {
            console.log(`🔄 Starting periodic screenshot capture every ${intervalMinutes} minutes`);
        }
        
        this.captureInterval = setInterval(async () => {
            try {
                await this.captureAndProcess();
            } catch (error) {
                console.error('❌ Periodic capture failed:', error);
            }
        }, intervalMs);
        
        // Capture immediately
        await this.captureAndProcess();
    }

    stopPeriodicCapture() {
        if (this.captureInterval) {
            clearInterval(this.captureInterval);
            this.captureInterval = null;
            console.log('⏹️ Stopped periodic screenshot capture');
        }
    }

    async cleanup() {
        this.stopPeriodicCapture();
        
        if (this.qdrantClient) {
            try {
                await this.qdrantClient.close();
            } catch (error) {
                console.warn('⚠️ Failed to close Qdrant client:', error.message);
            }
        }
    }
}

module.exports = ScreenpipeHandler; 