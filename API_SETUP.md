# API Setup Guide

## Required API Keys

This desktop agent requires two API keys to function properly:

### 1. OpenAI API Key

**Purpose**: Sends transcriptions to ChatGPT for processing

**How to get it**:
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the generated key

**Cost**: Pay-per-use, typically very low cost for chat interactions

### 2. Deepgram API Key

**Purpose**: Converts speech to text in real-time

**How to get it**:
1. Go to [Deepgram Console](https://console.deepgram.com/)
2. Sign up or sign in
3. Create a new project
4. Go to "API Keys" section
5. Copy your API key

**Cost**: Free tier available (200 hours/month), then pay-per-use

## Configuration

1. **Edit the `.env` file** in the desktop-agent directory:
   ```bash
   # Replace the placeholder values with your actual API keys
   OPENAI_API_KEY=sk-your-actual-openai-key-here
   DEEPGRAM_API_KEY=your-actual-deepgram-key-here
   
   # Optional: Adjust speech completion delay (default: 3000ms)
   # This controls how long to wait after speech stops before executing automation
   # Increase for more time to continue speaking, decrease for faster response
   SPEECH_COMPLETION_DELAY=3000
   ```

2. **Save the file** and restart the application

## Optional Settings

### Speech Completion Delay
- **Purpose**: Controls the pause duration after speech detection stops before automation executes
- **Default**: 3000ms (3 seconds) 
- **Recommended range**: 2000-5000ms depending on your speaking pace
- **Usage**: Add `SPEECH_COMPLETION_DELAY=4000` to `.env` for a 4-second delay

## Troubleshooting

### "API key not configured" error
- Make sure you've replaced the placeholder values in `.env`
- Ensure there are no extra spaces or quotes around the keys
- Restart the application after making changes

### "Failed to initialize" error
- Verify your API keys are correct
- Check that you have sufficient credits/quota
- Ensure your internet connection is working

### Deepgram connection errors
- Verify your Deepgram API key is valid
- Check that your account has available credits
- Try regenerating your API key if issues persist

## Security Notes

- Never commit your `.env` file to version control
- Keep your API keys secure and don't share them
- Consider using environment variables for production deployments 