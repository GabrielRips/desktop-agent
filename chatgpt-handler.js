const { OpenAI } = require('openai');
const https = require('https');
const http = require('http');

class ChatGPTHandler {
    constructor() {
        this.openai = null;
        this.conversationHistory = [];
        this.maxHistoryLength = 10;
        this.screenpipeHandler = null;
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

    setScreenpipeHandler(screenpipeHandler) {
        this.screenpipeHandler = screenpipeHandler;
        console.log('✅ Screenpipe handler connected to ChatGPT');
    }

    async sendMessage(message, onResponse, onError, screenshotBase64 = null, isQuestion = false) {
        if (!this.openai) {
            console.error('❌ OpenAI client not initialized');
            if (onError) onError('OpenAI client not initialized');
            return;
        }

        try {
            console.log('🤖 Sending message to ChatGPT:', message);
            console.log('📸 Screenshot provided:', !!screenshotBase64);
            console.log('❓ Is question:', isQuestion);

            // Prepare user content - prioritize current screenshot over historical search
            let userContent;
            let systemPrompt;
            
            if (screenshotBase64) {
                // Current screenshot available - use it directly for analysis
                console.log('📸 Using current screenshot for analysis');
                userContent = [
                    {
                        type: "text",
                        text: `The user is asking: "${message}"\n\nI'm providing you with a screenshot of their current screen. Please analyze what's visible and answer their question based on what you can see in the image.`
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/png;base64,${screenshotBase64}`
                        }
                    }
                ];
                systemPrompt = "You are a helpful AI assistant with vision capabilities. Analyze the screenshot and provide helpful answers based on what you can see.";
            } else {
                // No current screenshot - fall back to screenpipe search for historical context
                console.log('🔍 No current screenshot, searching historical screen context...');
                let screenContext = '';
                if (this.screenpipeHandler && this.screenpipeHandler.isInitialized) {
                    try {
                        const relevantScreenshots = await this.screenpipeHandler.searchScreenshots(message, 3);
                        if (relevantScreenshots && relevantScreenshots.length > 0) {
                            screenContext = this.buildScreenContext(relevantScreenshots);
                            console.log('✅ Found relevant historical screen context');
                        } else {
                            console.log('ℹ️ No relevant screen context found');
                        }
                    } catch (error) {
                        console.warn('⚠️ Error searching screen context:', error.message);
                    }
                }
                userContent = `Please answer: "${message}"`;
                systemPrompt = this.buildSystemPrompt(screenContext);
            }

            // Add user message to history
            this.addToHistory('user', message);

            // Prepare messages for API call
            const messages = [
                {
                    role: "system",
                    content: systemPrompt
                },
                ...this.conversationHistory,
                {
                    role: "user", 
                    content: userContent
                }
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

    needsWebSearch(text) {
        const lowerText = text.toLowerCase().trim();
        const webSearchPatterns = [
            /\b(today|now|current|latest|recent|news|weather)\b/,
            /\b(price|cost|stock)\b.*\b(today|now|current)\b/,
            /\bwhat.*happening\b/,
            /\bevents.*today\b/,
            /\blatest.*update\b/,
            /\bcurrent.*status\b/,
            /\bnews\b/,
            /\bweather\b/,
            /\btime.*in\b/,
            /\bexchange.*rate\b/
        ];
        return webSearchPatterns.some(pattern => pattern.test(lowerText));
    }

    isQuestionPattern(text) {
        const lowerText = text.toLowerCase().trim();
        const questionPatterns = [
            /^what(\s+is|\s+are|\s+was|\s+were|\s+does|\s+do|\s+did|\s+'s)/,
            /^how(\s+do|\s+does|\s+did|\s+can|\s+to|\s+much|\s+many)/,
            /^why(\s+is|\s+are|\s+do|\s+does|\s+did)/,
            /^when(\s+is|\s+are|\s+was|\s+were|\s+do|\s+does|\s+did)/,
            /^where(\s+is|\s+are|\s+was|\s+were|\s+do|\s+does|\s+did)/,
            /^who(\s+is|\s+are|\s+was|\s+were)/,
            /^which(\s+is|\s+are|\s+was|\s+were)/,
            /^can\s+you(\s+tell|\s+explain|\s+describe)/,
            /^tell\s+me(\s+about)/,
            /^explain/,
            /^describe/,
            /\berror\b.*\?$/,
            /\bissue\b.*\?$/,
            /\bproblem\b.*\?$/,
            /weather/,
            /time(\s+is\s+it)?$/
        ];
        return questionPatterns.some(pattern => pattern.test(lowerText));
    }

    getQuestionAnalysisPrompt(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('error') || lowerMessage.includes('issue') || lowerMessage.includes('problem')) {
            return `TASK: Analyze the screenshot to identify and explain an error or issue.

ANALYSIS STRUCTURE:
1. **Error Identification**: What specific error/issue is visible?
2. **Context**: What application/service/system is involved?
3. **Root Cause**: What likely caused this error?
4. **Solution Steps**: Clear, numbered steps to resolve it
5. **Prevention**: How to avoid this in the future

Focus on being precise and actionable.`;
        }
        
        return `TASK: Provide a comprehensive answer using the screenshot as visual context.

RESPONSE STRUCTURE:
1. **Current Context**: What do you see in the screenshot?
2. **Direct Answer**: Address the specific question asked
3. **Additional Details**: Relevant context or related information
4. **Next Steps**: If applicable, suggest follow-up actions

Be clear, accurate, and well-structured.`;
    }

    getActionAnalysisPrompt(message) {
        return `TASK: Generate automation instructions based on the screenshot and voice command.

ANALYSIS STRUCTURE:
1. **Current State**: Describe what's visible in the screenshot
2. **User Intent**: What the user wants to accomplish  
3. **Automation Steps**: Specific, executable instructions
4. **Target Elements**: Identify specific UI elements to interact with
5. **Success Criteria**: How to verify the task completed

Provide precise, actionable automation instructions for macOS.`;
    }

    getEnhancedSystemPrompt(isQuestion, hasScreenshot, needsWebSearch) {
        if (isQuestion) {
            let basePrompt = `You are a knowledgeable AI assistant specialized in providing structured, comprehensive answers.

RESPONSE FORMAT:
- Use clear headings and bullet points
- Provide specific, actionable information
- Include examples when helpful
- Structure complex information logically`;

            if (hasScreenshot) {
                basePrompt += `\n- Analyze the screenshot carefully for visual context
- Reference specific UI elements you can see
- Explain what's happening in the interface`;
            }

            if (needsWebSearch) {
                basePrompt += `\n- Search for current, up-to-date information when needed
- Provide the most recent and accurate data available
- Include relevant context from current sources`;
            }

            basePrompt += `\n\nFor ERROR ANALYSIS specifically:
## Error Details
- **Type**: Specific error classification
- **Location**: Where the error appears
- **Message**: Exact error text if visible

## Root Cause
- **Primary Cause**: Main reason for the error
- **Contributing Factors**: Additional issues

## Solution
1. **Immediate Steps**: Quick fixes to try first
2. **Comprehensive Fix**: Complete resolution process
3. **Verification**: How to confirm it's resolved

## Prevention
- Best practices to avoid recurrence
- Monitoring or maintenance suggestions`;

            return basePrompt;
        } else {
            // Action/automation prompts remain the same
            return hasScreenshot ? 
                "You are an AI automation assistant with vision capabilities. Analyze the screenshot and voice command to generate PRECISE, CLEAR automation instructions for macOS..." :
                "You are a helpful AI assistant. Provide concise, helpful responses.";
        }
    }

    buildScreenContext(screenshots) {
        if (!screenshots || screenshots.length === 0) {
            return '';
        }

        const contextParts = screenshots.map((screenshot, index) => {
            const timestamp = new Date(screenshot.payload.timestamp).toLocaleString();
            const text = screenshot.payload.text.substring(0, 300);
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