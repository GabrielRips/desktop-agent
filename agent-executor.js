const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

class AgentExecutor {
    constructor() {
        this.isInitialized = false;
        this.tempDir = path.join(__dirname, 'temp');
    }

    async initialize() {
        if (this.isInitialized) {
            console.log('⚠️ Agent executor already initialized');
            return true;
        }

        try {
            console.log('🤖 Initializing Agent Executor...');

            // Check if OpenAI API key is available
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                console.error('❌ OpenAI API key not found for agent executor');
                return false;
            }

            // Create temp directory for screenshots
            try {
                await fs.mkdir(this.tempDir, { recursive: true });
            } catch (error) {
                // Directory might already exist, ignore error
            }

            this.isInitialized = true;
            console.log('✅ Agent Executor initialized successfully');
            return true;

        } catch (error) {
            console.error('❌ Error initializing agent executor:', error);
            await this.cleanup();
            return false;
        }
    }

    async executeCommand(instructions, screenshotBase64 = null) {
        if (!this.isInitialized) {
            console.error('❌ Agent executor not initialized');
            return { success: false, error: 'Agent executor not initialized' };
        }

        let screenshotPath = null;

        try {
            console.log(`🎯 Executing automation: "${instructions.substring(0, 100)}..."`);
            console.log('📸 Screenshot provided:', !!screenshotBase64);

            // Save screenshot to temporary file if provided
            if (screenshotBase64) {
                screenshotPath = path.join(this.tempDir, `screenshot_${Date.now()}.png`);
                const screenshotBuffer = Buffer.from(screenshotBase64, 'base64');
                await fs.writeFile(screenshotPath, screenshotBuffer);
                console.log('📸 Screenshot saved to:', screenshotPath);
            }

            const result = await this.runAgentProcess(instructions, screenshotPath);
            
            console.log('✅ Agent execution completed');
            if (result.output) {
                console.log('📄 Output preview:', result.output.substring(0, 200) + (result.output.length > 200 ? '...' : ''));
            }
            
            return result;

        } catch (error) {
            console.error('❌ Error executing agent command:', error);
            return { 
                success: false, 
                error: error.message || 'Failed to execute agent command' 
            };
        } finally {
            // Clean up screenshot file
            if (screenshotPath) {
                try {
                    await fs.unlink(screenshotPath);
                    console.log('🧹 Cleaned up screenshot file');
                } catch (error) {
                    console.warn('⚠️ Could not clean up screenshot file:', error.message);
                }
            }
        }
    }

    runAgentProcess(instructions, screenshotPath = null) {
        return new Promise((resolve, reject) => {
            // Prepare arguments for agent.ts
            const args = ['tsx', path.join(__dirname, 'agent.ts'), instructions];
            if (screenshotPath) {
                args.push(screenshotPath);
            }

            console.log('🚀 Starting agent process...');
            const child = spawn('npx', args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env }
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                const output = data.toString();
                console.log('🤖 Agent:', output.trim());
                stdout += output;
            });

            child.stderr.on('data', (data) => {
                const error = data.toString();
                if (!error.includes('Warning') && !error.includes('deprecated')) {
                    console.error('🤖 Agent error:', error.trim());
                }
                stderr += error;
            });

            child.on('close', (code) => {
                if (code === 0) {
                    // Extract the result from stdout (look for the "RESULT:" section)
                    const resultMatch = stdout.match(/✅ RESULT:\s*([\s\S]*?)(?=\n\n|\n🔧|\n$|$)/);
                    const output = resultMatch ? resultMatch[1].trim() : 'Automation completed successfully';
                    
                    resolve({ 
                        success: true, 
                        output: output,
                        fullOutput: stdout
                    });
                } else {
                    const errorMessage = stderr.trim() || `Agent process exited with code ${code}`;
                    resolve({ 
                        success: false, 
                        error: errorMessage,
                        stderr: stderr,
                        stdout: stdout,
                        code: code
                    });
                }
            });

            child.on('error', (error) => {
                reject(new Error(`Failed to spawn agent process: ${error.message}`));
            });

            // The agent.ts now auto-exits when called with arguments, so no need to send quit
        });
    }

    async cleanup() {
        try {
            // Clean up any remaining screenshot files
            try {
                const files = await fs.readdir(this.tempDir);
                for (const file of files) {
                    if (file.startsWith('screenshot_') && file.endsWith('.png')) {
                        await fs.unlink(path.join(this.tempDir, file));
                    }
                }
            } catch (error) {
                // Ignore cleanup errors
            }

            console.log('🧹 Agent executor cleanup completed');
        } catch (error) {
            console.error('❌ Error during agent executor cleanup:', error);
        }

        this.isInitialized = false;
    }

    isReady() {
        return this.isInitialized;
    }
}

module.exports = AgentExecutor;