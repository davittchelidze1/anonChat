<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/bcf85a1e-6f7b-4661-b260-7e07e9ef53d5

## Features

### 🛡️ AI-Powered Message Moderation
Real-time message analysis and classification system powered by Google Gemini AI. Automatically detects and handles:
- Toxicity (insults, harassment, hate speech)
- Sexual content (explicit, suggestive)
- Spam and bot-like behavior
- Threats and harmful intent

See [MESSAGE_ANALYSIS.md](MESSAGE_ANALYSIS.md) for detailed documentation.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
