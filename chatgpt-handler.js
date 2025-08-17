const { OpenAI } = require('openai');
const https = require('https');
const http = require('http');

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

    async sendMessage(message, onResponse, onError, screenshotBase64 = null, isQuestion = false) {
        if (!this.openai) {
            console.error('❌ OpenAI client not initialized');
            if (onError) onError('OpenAI client not initialized');
            return;
        }

        try {
            // Auto-detect if not explicitly provided
            if (!isQuestion) {
                isQuestion = this.isQuestionPattern(message);
            }
            
            console.log('🔍 ChatGPT Handler - Question detection:', isQuestion, 'for message:', message);
            console.log('🤖 Sending message to ChatGPT:', message);
            console.log('📸 Screenshot included:', !!screenshotBase64);
            console.log('📸 Screenshot length:', screenshotBase64 ? screenshotBase64.length : 0);

            // Detect if we need web search for current information
            const needsWebSearch = this.needsWebSearch(message);
            console.log('🌐 Web search needed:', needsWebSearch);

            // Prepare tools array
            const tools = [];
            if (needsWebSearch && isQuestion) {
                tools.push({ type: "web_search_preview" });
                console.log('🔧 Added web_search_preview tool');
            }

            // Prepare user message content with enhanced prompting
            let userContent;
            
            if (screenshotBase64) {
                // Use screenshots for actions OR questions (let AI decide relevance)
                if (isQuestion) {
                    // Question with screenshot - let AI determine if screen analysis is needed
                    userContent = [
                        {
                            type: "text",
                            text: `The user is asking: "${message}"

I'm providing you with a screenshot of their current screen. Please determine if this question requires analyzing what's shown on the screen or if it's a general question that doesn't need screen analysis.

If the question is about what's visible on the screen (like "what is this?", "what do you see?", "what's this error?", etc.), please analyze the screenshot and describe what you see.

If the question is general knowledge (like "who is the president?", "what's the weather?", etc.), please answer the question directly without referencing the screenshot.

Be intelligent about determining which type of question this is and respond accordingly.`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/png;base64,${screenshotBase64}`
                            }
                        }
                    ];
                    console.log('📸 Using screenshot for question - AI will determine relevance');
                } else {
                    // Action request - provide automation instructions
                    const contextAnalysis = this.getActionAnalysisPrompt(message);
                    userContent = [
                        {
                            type: "text",
                            text: `${contextAnalysis}\n\nUser's message: "${message}"\n\nPlease analyze this screenshot and provide automation instructions based on the visual context and the user's request.
                        If the user is asking something specific such as "what does this mean", then please use the screenshot to answer the question, as well as your own knowledge.`
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/png;base64,${screenshotBase64}`
                        }
                    }
                ];
                console.log('📸 Using screenshot for action request');
                }
            } else {
                // Text only - for questions or actions without screenshots
                userContent = isQuestion ?
                    `Please provide a comprehensive answer to: "${message}"${needsWebSearch ? ' Please search the web for the most current information if needed.' : ''}` :
                    message;
                console.log(isQuestion ? '❓ Processing as text-only question' : '🤖 Processing as text-only action');
            }

            // Enhanced system prompts for better structure
            const systemPrompt = this.getEnhancedSystemPrompt(isQuestion, screenshotBase64, needsWebSearch);

            // Add user message to history
            this.addToHistory('user', screenshotBase64 ? `[Voice + Screenshot]: ${message}` : message);

            // Prepare messages for API call
            const messages = [
                { role: "system", content: systemPrompt },
                ...this.conversationHistory.slice(-6), // Reduced for better performance
                { role: "user", content: userContent }
            ];

            // Use models with built-in web search capabilities for questions
            let model;
            if (isQuestion && needsWebSearch) {
                model = "gpt-4o"; // gpt-4o has built-in web search capabilities
            } else if (screenshotBase64) {
                model = "gpt-4o"; // Vision capabilities
            } else if (isQuestion) {
                model = "gpt-4o"; // Better reasoning for questions
            } else {
                model = "gpt-4o-mini"; // Faster for actions
            }

            const maxTokens = screenshotBase64 ? 1000 : (isQuestion ? 600 : 500);

            console.log('📡 Sending to OpenAI with model:', model, 'tools:', tools.length > 0 ? tools.map(t => t.type) : 'none');
            
            // Create completion parameters
            const completionParams = {
                model: model,
                messages: messages,
                max_tokens: maxTokens,
                temperature: isQuestion ? 0.2 : 0.7,
                stream: false,
                top_p: isQuestion ? 0.9 : 1.0
            };

            // Add tools if needed
            if (tools.length > 0) {
                completionParams.tools = tools;
                completionParams.tool_choice = "auto";
            }

            console.log('🚀 Making OpenAI API call...');
            console.log('📋 Completion params:', {
                model: completionParams.model,
                hasTools: !!completionParams.tools,
                messageCount: completionParams.messages.length,
                lastMessageType: typeof completionParams.messages[completionParams.messages.length - 1].content
            });
            
            const completion = await this.openai.chat.completions.create(completionParams);
            console.log('✅ OpenAI API call completed successfully');

            let response = completion.choices[0].message.content || '';
            console.log('📝 Raw response received, length:', response.length);
            
            // Handle tool calls if present
            if (completion.choices[0].message.tool_calls) {
                console.log('🔧 Tool calls detected:', completion.choices[0].message.tool_calls.length);
                // The response should already include the web search results
                response = completion.choices[0].message.content || 'Information retrieved using web search.';
            }

            console.log('🤖 ChatGPT response:', response ? response.substring(0, 200) + '...' : 'No response content');

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