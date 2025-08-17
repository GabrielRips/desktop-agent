const { OpenAI } = require('openai');

class ChatGPTHandler {
    constructor() {
        this.openai = null;
        this.conversationHistory = [];
        this.maxHistoryLength = 10; // Keep last 10 exchanges
        this.screenpipeHandler = null; // Reference to screenpipe handler
    }

    initialize(apiKey) {
        if (!apiKey) {
            console.error('❌ OpenAI API key is required');
            return false;
        }

        try {
            this.openai = new OpenAI({ apiKey: apiKey });
            console.log('✅ OpenAI client initialized');
            return true;
        } catch (error) {
            console.error('❌ Error initializing OpenAI client:', error);
            return false;
        }
    }

    // Set reference to screenpipe handler
    setScreenpipeHandler(screenpipeHandler) {
        this.screenpipeHandler = screenpipeHandler;
        console.log('✅ Screenpipe handler connected to ChatGPT');
    }

    async sendMessage(message, onResponse, onError) {
        if (!this.openai) {
            console.error('❌ OpenAI client not initialized');
            if (onError) onError('OpenAI client not initialized');
            return;
        }

        try {
            console.log('🤖 Sending message to ChatGPT:', message);

            // Search for relevant screenpipe context
            let screenContext = '';
            if (this.screenpipeHandler && this.screenpipeHandler.isInitialized) {
                try {
                    console.log('🔍 Searching for relevant screen context...');
                    const relevantScreenshots = await this.screenpipeHandler.searchScreenshots(message, 3);
                    
                    if (relevantScreenshots && relevantScreenshots.length > 0) {
                        screenContext = this.buildScreenContext(relevantScreenshots);
                        console.log('✅ Found relevant screen context');
                    } else {
                        console.log('ℹ️ No relevant screen context found');
                    }
                } catch (error) {
                    console.warn('⚠️ Error searching screen context:', error.message);
                }
            }

            // Add user message to history
            this.addToHistory('user', message);

            // Prepare messages for API call with screen context
            const messages = [
                {
                    role: "system",
                    content: this.buildSystemPrompt(screenContext)
                },
                ...this.conversationHistory
            ];

            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: messages,
                max_tokens: 500,
                temperature: 0.7
            });

            const response = completion.choices[0].message.content;
            console.log('🤖 ChatGPT response:', response);

            // Add assistant response to history
            this.addToHistory('assistant', response);

            if (onResponse) {
                onResponse(response);
            }

        } catch (error) {
            console.error('❌ Error calling ChatGPT API:', error);
            if (onError) {
                onError(error.message || 'Failed to get response from ChatGPT');
            }
        }
    }

    buildScreenContext(screenshots) {
        if (!screenshots || screenshots.length === 0) {
            return '';
        }

        const contextParts = screenshots.map((screenshot, index) => {
            const timestamp = new Date(screenshot.payload.timestamp).toLocaleString();
            const text = screenshot.payload.text.substring(0, 300); // Limit text length
            const score = (screenshot.score * 100).toFixed(1);
            
            return `Screenshot ${index + 1} (${score}% relevant, captured ${timestamp}):
Content: ${text}${screenshot.payload.text.length > 300 ? '...' : ''}`;
        });

        return `RELEVANT SCREEN CONTEXT:
${contextParts.join('\n\n')}

Use this context to provide more relevant and contextual responses. If the user is asking about something visible on their screen, reference this information. If the context isn't relevant to their question, respond normally without mentioning it.`;
    }

    buildSystemPrompt(screenContext) {
        let prompt = "You are a helpful AI assistant integrated with the user's desktop. Provide concise, helpful responses.";

        if (screenContext) {
            prompt += `\n\n${screenContext}`;
        }

        return prompt;
    }

    addToHistory(role, content) {
        this.conversationHistory.push({ role, content });
        
        // Keep only the last maxHistoryLength exchanges
        if (this.conversationHistory.length > this.maxHistoryLength * 2) {
            this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
        }
    }

    clearHistory() {
        this.conversationHistory = [];
        console.log('🗑️ Conversation history cleared');
    }

    getHistory() {
        return this.conversationHistory;
    }
}

module.exports = ChatGPTHandler; 