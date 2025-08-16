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

    async sendMessage(message, onResponse, onError, screenshotBase64 = null) {
        if (!this.openai) {
            console.error('❌ OpenAI client not initialized');
            if (onError) onError('OpenAI client not initialized');
            return;
        }

        try {
            console.log('🤖 Sending message to ChatGPT:', message);
            console.log('📸 Screenshot included:', !!screenshotBase64);

            // Prepare user message content
            let userContent;
            
            if (screenshotBase64) {
                // If screenshot is provided, use vision format
                userContent = [
                    {
                        type: "text",
                        text: `Here's what I'm seeing on my screen along with my voice command: "${message}". Please help me based on both the visual context and my request.`
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/png;base64,${screenshotBase64}`
                        }
                    }
                ];
            } else {
                // Text only
                userContent = message;
            }

            // Add user message to history
            this.addToHistory('user', screenshotBase64 ? `[Voice + Screenshot]: ${message}` : message);

            // Prepare messages for API call
            const messages = [
                {
                    role: "system",
                    content: screenshotBase64 ? 
                        "You are an AI automation assistant with vision capabilities. Analyze the screenshot and voice command to generate PRECISE, CLEAR automation instructions for macOS. \n\nYour response should be specific instructions that describe exactly what needs to be automated based on what you see in the screenshot and the user's voice command.\n\nFocus on:\n1. Identifying the current application and context from the screenshot\n2. Understanding the user's intent from their voice command\n3. Providing clear, step-by-step automation instructions\n4. Being specific about file paths, URLs, and actions\n5. Mentioning the specific application and UI elements visible\n\nExamples:\n- User sees GitHub repo + says 'clone this': 'I can see a GitHub repository page open in Brave browser. Please automate cloning this repository: extract the repository URL from the current browser tab, add .git extension if needed, open Terminal, navigate to ~/Desktop/projects/, and execute the git clone command.'\n- User sees form + says 'fill this': 'I can see a form with multiple input fields on the current webpage. Please automate filling out this form with appropriate test data for each visible field.'\n\nProvide clear, actionable instructions that an automation system can understand and execute." :
                        "You are a helpful AI assistant. Provide concise, helpful responses."
                },
                ...this.conversationHistory.slice(-8), // Use fewer history items for vision calls to save tokens
                {
                    role: "user",
                    content: userContent
                }
            ];

            // Use GPT-4 Vision model if screenshot is provided
            const model = screenshotBase64 ? "gpt-4o" : "gpt-4o-mini";
            const maxTokens = screenshotBase64 ? 800 : 500; // More tokens for vision responses

            const completion = await this.openai.chat.completions.create({
                model: model,
                messages: messages,
                max_tokens: maxTokens,
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