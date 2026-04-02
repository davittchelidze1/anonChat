# Message Analysis & Classification System

## Overview

The anonChat platform now includes an AI-powered message analysis and classification system that maintains a safe, respectful, and engaging environment while preserving natural conversation flow.

## Features

### Real-time Message Analysis

Every incoming message is analyzed across the following dimensions:

- **Toxicity**: Detects insults, harassment, and hate speech
- **Sexual Content**: Identifies explicit, suggestive, or inappropriate content
- **Spam**: Recognizes repetitive, promotional, or bot-like behavior
- **Threats**: Flags harmful intent or threatening language
- **Safe Content**: Confirms normal, friendly messages

### Severity Scoring

Each message receives a severity score from 0 to 1:
- **0.0**: Completely safe
- **1.0**: Extremely harmful

### Automatic Actions

Based on severity, the system automatically takes appropriate action:

| Severity Range | Action | Description |
|---------------|--------|-------------|
| 0.0 - 0.3 | **Allow** | Message is sent normally |
| 0.3 - 0.6 | **Flag** | Message sent, but logged internally for monitoring |
| 0.6 - 0.8 | **Warn** | Message sent with a warning to the sender |
| 0.8 - 1.0 | **Block** | Message blocked and user marked for moderation |

### Classification Output

For each analyzed message, the system provides:
1. **Severity score** (0-1)
2. **Label** (e.g., "safe", "mild toxicity", "severe abuse", "spam")
3. **Category** (toxicity, sexual, spam, threats, or safe)
4. **Action** (allow, flag, warn, or block)
5. **Reason** (short explanation)

## Behavior Rules

The AI moderation system follows these principles:

- ✅ **Strict on harmful content**: Zero tolerance for hate speech, threats, and harassment
- ✅ **Tolerant of casual language**: Jokes and slang are allowed if not harmful
- ✅ **Prevents over-blocking**: Normal human conversation flows naturally
- ✅ **Detects disguised toxicity**: Identifies sarcasm, coded language, and repeated patterns
- ✅ **Recognizes spam patterns**: Even when wording changes slightly

## Context Awareness

The system considers:

- **Previous messages**: Conversation history when available
- **User behavior**: Escalates severity for repeat offenders
- **Relationship context**: Can reduce severity for friendly exchanges

## Configuration

### Environment Variables

To enable the message analysis service, set the following environment variable:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

If `GEMINI_API_KEY` is not configured, the system will:
- Log a warning: "GEMINI_API_KEY not configured. Message analysis disabled."
- Allow all messages through (graceful degradation)
- Still apply basic bad-words filtering

### Getting a Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Add it to your `.env` file or environment variables

## Technical Implementation

### Architecture

```
Client Message
    ↓
Socket.IO Handler (socketHandlers.ts)
    ↓
Bad Words Filter
    ↓
Message Analysis Service (messageAnalysisService.ts)
    ↓
Google Gemini AI Analysis
    ↓
Action Decision (allow/flag/warn/block)
    ↓
Message Delivery or Blocking
```

### Key Files

- `server/services/messageAnalysisService.ts` - Main service implementation
- `server/types/messageAnalysis.ts` - TypeScript type definitions
- `server/handlers/socketHandlers.ts` - Integration with message handling

### User History Tracking

The system maintains an in-memory history of user violations:

```typescript
interface UserModerationHistory {
  userId: string;
  flaggedMessages: number;
  warnedMessages: number;
  blockedMessages: number;
  lastViolation?: string;
}
```

Users with 5+ violations receive stricter moderation (severity increases by up to 0.2).

## Socket Events

### New Client Events

The system emits the following events to clients:

#### `message-blocked`
Sent when a message is blocked (severity >= 0.8)

```typescript
{
  messageId: string;
  reason: string;
  severity: number;
}
```

#### `message-warning`
Sent when a message triggers a warning (severity >= 0.6)

```typescript
{
  messageId: string;
  reason: string;
  severity: number;
}
```

## Example Analysis Results

### Safe Message
```json
{
  "severity": 0.05,
  "label": "safe",
  "category": "safe",
  "action": "allow",
  "reason": "Friendly greeting"
}
```

### Mild Toxicity
```json
{
  "severity": 0.45,
  "label": "mild toxicity",
  "category": "toxicity",
  "action": "flag",
  "reason": "Minor profanity detected"
}
```

### Severe Abuse
```json
{
  "severity": 0.95,
  "label": "severe abuse",
  "category": "toxicity",
  "action": "block",
  "reason": "Hate speech and harassment"
}
```

## Performance

- **Analysis time**: ~500-1500ms per message (using Gemini 2.0 Flash)
- **Temperature**: 0.1 (low temperature for consistent moderation)
- **Max tokens**: 256 (sufficient for analysis JSON response)

## Logging

The system logs important events:

```
Message Analysis Service initialized with Gemini AI
Message flagged: abc123 - Minor profanity detected (severity: 0.45)
Message warned: def456 - Inappropriate language (severity: 0.65)
Message blocked: ghi789 - Hate speech detected (severity: 0.92)
```

## Error Handling

The service includes robust error handling:

- If Gemini API fails, messages are allowed through (fail-open)
- Parsing errors default to "safe" classification
- Invalid JSON responses are caught and logged
- Network failures don't block legitimate messages

## Future Enhancements

Potential improvements:
- [ ] Persistent user history (database storage)
- [ ] Admin dashboard for moderation review
- [ ] Customizable severity thresholds
- [ ] Multi-language support
- [ ] Image/video content moderation
- [ ] Appeal system for blocked messages
- [ ] Rate limiting per user
- [ ] Moderation statistics and analytics

## Privacy & Security

- Message analysis is performed server-side only
- No message content is stored permanently
- User IDs are used only for history tracking
- Gemini API calls are secure (HTTPS)
- Fail-safe: If analysis fails, communication continues

## License

Apache-2.0
