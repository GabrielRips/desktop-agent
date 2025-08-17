// index.ts
import { Agent, run, MCPServerStdio } from '@openai/agents';
import { setDefaultOpenAIKey } from '@openai/agents-openai';
import * as readline from 'readline';
import * as fs from 'fs';
import 'dotenv/config';

// read your OpenAI key from env
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('Error: OPENAI_API_KEY environment variable is not set.');
  console.error('Please set your OpenAI API key in the .env file or as an environment variable.');
  process.exit(1);
}
setDefaultOpenAIKey(apiKey);

async function main() {
  console.log('🤖 Starting macOS Automator Interactive Session...\n');
  
  // Spawn the macOS Automator MCP server over stdio
  const macosAutomator = new MCPServerStdio({
    name: 'macos_automator',
    // This runs the published server from npm
    fullCommand: 'npx -y @steipete/macos-automator-mcp@latest'
  });

  await macosAutomator.connect();
  console.log('✅ Connected to macOS Automator MCP Server\n');

  // Keep the model focused: it should use the MCP tools to act
  const agent = new Agent({
    name: 'Mac Automator',
    model: 'gpt-4o-mini', // Specify the model here
    instructions:
      'You are a smart macOS automation assistant that handles both QUESTIONS and AUTOMATION COMMANDS. ' +
      'CRITICAL: First determine if the user input is a QUESTION or an ACTION COMMAND. ' +
      '\n' +
      'INTENT CLASSIFICATION: ' +
      '- QUESTIONS: General inquiries, weather, facts, explanations, "what is", "how to", "tell me about" ' +
      '- ACTIONS: Commands to control/manipulate macOS, apps, files, system - anything requiring automation ' +
      '\n' +
      'FOR QUESTIONS (like "what is the weather today", "explain this concept"): ' +
      '- START your response with "QUESTION_RESPONSE:" ' +
      '- Provide a helpful, informative answer without using MCP tools ' +
      '- Do NOT execute any automation or MCP tools ' +
      '- Be conversational and informative ' +
      '\n' +
      'FOR ACTIONS (like "open browser", "clone this repo", "close window"): ' +
      '- START your response with "AUTOMATION_ACTION:" ' +
      '- Use MCP tools to understand current system state ' +
      '- Execute the requested automation using macos_automator MCP tools ' +
      '- Be concise and execute immediately without asking confirmation ' +
      '\n' +
      'AUTOMATION EXAMPLES: ' +
      '- "clone this repo" → Get browser URL, execute git clone automation ' +
      '- "open browser" → Use MCP tools to launch browser application ' +
      '- "close this window" → Use MCP tools to close active window ' +
      '\n' +
      'QUESTION EXAMPLES: ' +
      '- "what is the weather today" → Provide weather information ' +
      '- "explain machine learning" → Give informative explanation ' +
      '- "what time is it" → Provide current time ' +
      '\n' +
      'EXECUTION RULES: ' +
      '1. Always classify intent first (QUESTION vs ACTION) ' +
      '2. For actions: use MCP tools, execute once, stop immediately after success ' +
      '3. For questions: provide helpful response without automation ' +
      '4. Be concise and focused on the user\'s actual intent',
    mcpServers: [macosAutomator],
  });

  // Create readline interface for interactive input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '🔧 Enter automation command (or "quit"/"exit" to stop): '
  });

  console.log('📝 Interactive Mode Started!');
  console.log('Examples:');
  console.log('  - "Press Command+Shift+D"');
  console.log('  - "Open Safari and get the current tab URL"');
  console.log('  - "Create a folder named Test on my Desktop"');
  console.log('  - "Take a screenshot"');
  console.log('  - Type "quit" or "exit" to stop\n');

  // Handle initial command from arguments if provided
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const command = args[0];
    const screenshotPath = args[1]; // Optional screenshot path
    
    let fullCommand = command;
    
    // Enhance command to use MCP tools for context awareness
    if (screenshotPath && fs.existsSync(screenshotPath)) {
      fullCommand = `VOICE COMMAND: "${command}"\n\nCONTEXT: A screenshot was captured at the moment of this voice command. Use the available MCP tools to understand the current system state, active applications, and desktop context. Then execute the automation based on both the voice command and the current system state you discover through the MCP tools.`;
      console.log('📸 Screenshot captured - agent will use MCP tools for context');
    } else {
      fullCommand = `VOICE COMMAND: "${command}"\n\nPlease use the available MCP tools to understand the current system state and active applications, then execute the requested automation.`;
    }
    
    console.log(`🎯 Running automation: "${command}"\n`);
    try {
      const result = await run(agent, fullCommand);
      console.log('\n✅ RESULT:\n' + result.finalOutput + '\n');
      
      // Auto-exit after execution when called programmatically
      await macosAutomator.close();
      process.exit(0);
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
      await macosAutomator.close();
      process.exit(1);
    }
  }

  // Interactive loop
  const processCommand = async (input: string) => {
    const command = input.trim();
    
    if (command.toLowerCase() === 'quit' || command.toLowerCase() === 'exit') {
      console.log('👋 Goodbye!');
      rl.close();
      await macosAutomator.close();
      process.exit(0);
    }
    
    if (!command) {
      rl.prompt();
      return;
    }

    try {
      console.log(`\n🎯 Executing: "${command}"`);
      console.log('⏳ Processing...\n');
      
      const result = await run(agent, command);
      console.log('✅ RESULT:\n' + result.finalOutput + '\n');
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error, '\n');
    }
    
    rl.prompt();
  };

  rl.on('line', processCommand);
  
  rl.on('close', async () => {
    console.log('\n👋 Session ended.');
    await macosAutomator.close();
    process.exit(0);
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Received interrupt signal. Closing connections...');
    rl.close();
    await macosAutomator.close();
    process.exit(0);
  });

  rl.prompt();
}

main().catch(async (err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
