const { OpenAI } = require('openai');

class ChatGPTHandler {
    constructor() {
        this.openai = null;
        this.conversationHistory = [];
        this.maxHistoryLength = 10; // Keep last 10 exchanges
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

    async sendMessage(message, onResponse, onError) {
        if (!this.openai) {
            console.error('❌ OpenAI client not initialized');
            if (onError) onError('OpenAI client not initialized');
            return;
        }

        try {
            console.log('🤖 Sending message to ChatGPT:', message);

            // Add user message to history
            this.addToHistory('user', message);

            // Prepare messages for API call
            const messages = [
                {
                    role: "system",
                    content: "You are a helpful AI assistant. Provide concise, helpful responses."
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