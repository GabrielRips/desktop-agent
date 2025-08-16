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
    model: 'gpt-4.1-mini', // Specify the model here
    instructions:
      'You are a macOS automation expert that controls macOS by calling the macos_automator MCP tools. ' +
      'You receive voice commands and should use MCP tools to understand the current desktop context. ' +
      'FIRST: Use MCP tools to get information about the current active application, windows, and system state. ' +
      'THEN: Combine this context with the voice command to understand exactly what the user wants to automate. ' +
      'FINALLY: Use the macos_automator MCP tools to generate and execute precise AppleScript that accomplishes the task. ' +
      'EXAMPLES: ' +
      '- Voice: "clone this repo" → Get active app (likely browser), get current URL, extract repo info, open Terminal, execute git clone into ~/Desktop/projects/ ' +
      '- Voice: "fill this form" → Get active app, identify form fields, fill with appropriate data ' +
      '- Voice: "open that file" → Get active app (Finder), identify selected file, open it ' +
      '- Voice: "what is this error" → Get active app (If it is CURSOR), execute CMD+SHIFT+D to open copilot chat ' +
      '- Voice: "what is this error in the terminal" → Get active app (IF IT IS THE CURSOR TERMINAL), execute CMD+L and type "Please explain this error" then press Enter ' +
      'ALWAYS start by using MCP tools to understand the current system state before executing automation. ' +
      'Prefer knowledge base scripts when available. Execute automation immediately without asking for confirmation. ' +
      'Be concise and focus on successful execution.',
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
