# Message Analysis Examples

This document provides examples of how the message analysis system classifies different types of messages.

## Example Classifications

### 1. Safe Messages ✅

#### Friendly Greeting
```
Input: "Hello! How are you doing today?"

Output:
{
  "severity": 0.05,
  "label": "safe",
  "category": "safe",
  "action": "allow",
  "reason": "Friendly greeting, no issues detected"
}
```

#### Casual Conversation
```
Input: "That's awesome! I love this feature"

Output:
{
  "severity": 0.02,
  "label": "safe",
  "category": "safe",
  "action": "allow",
  "reason": "Positive and friendly conversation"
}
```

### 2. Borderline Content (Flagged) ⚠️

#### Mild Profanity
```
Input: "This is freaking amazing!"

Output:
{
  "severity": 0.35,
  "label": "mild toxicity",
  "category": "toxicity",
  "action": "flag",
  "reason": "Minor profanity detected, monitoring user"
}
```

#### Possible Spam
```
Input: "Check out this cool site!!!"

Output:
{
  "severity": 0.40,
  "label": "possible spam",
  "category": "spam",
  "action": "flag",
  "reason": "Promotional language pattern detected"
}
```

### 3. Warning Level Content ⚠️⚠️

#### Moderate Toxicity
```
Input: "You're being really annoying, stop it"

Output:
{
  "severity": 0.65,
  "label": "moderate toxicity",
  "category": "toxicity",
  "action": "warn",
  "reason": "Mildly aggressive language toward another user"
}
```

#### Suggestive Content
```
Input: "Want to exchange photos? Let's get more personal"

Output:
{
  "severity": 0.72,
  "label": "sexual content",
  "category": "sexual",
  "action": "warn",
  "reason": "Suggestive content detected"
}
```

#### Clear Spam
```
Input: "BUY NOW!!! LIMITED OFFER!!! CLICK HERE FOR FREE MONEY!!!"

Output:
{
  "severity": 0.70,
  "label": "spam",
  "category": "spam",
  "action": "warn",
  "reason": "Clear spam pattern with promotional language"
}
```

### 4. Blocked Content 🚫

#### Severe Harassment
```
Input: "You're worthless and should die"

Output:
{
  "severity": 0.95,
  "label": "severe abuse",
  "category": "toxicity",
  "action": "block",
  "reason": "Severe harassment and abusive language"
}
```

#### Hate Speech
```
Input: "I hate [protected group] and they should all be eliminated"

Output:
{
  "severity": 0.98,
  "label": "hate speech",
  "category": "toxicity",
  "action": "block",
  "reason": "Hate speech targeting protected group"
}
```

#### Direct Threats
```
Input: "I know where you live and I'm coming for you"

Output:
{
  "severity": 0.97,
  "label": "threats",
  "category": "threats",
  "action": "block",
  "reason": "Direct threat of violence"
}
```

#### Explicit Sexual Content
```
Input: [Explicit sexual content]

Output:
{
  "severity": 0.92,
  "label": "explicit content",
  "category": "sexual",
  "action": "block",
  "reason": "Explicit sexual content"
}
```

## Contextual Adjustments

### Repeat Offender
If a user has 5+ previous violations, borderline content gets escalated:

```
User History: 6 flagged messages, 2 warned messages

Input: "You're annoying"

Without History:
{
  "severity": 0.40,
  "action": "flag"
}

With History (escalated):
{
  "severity": 0.52,
  "action": "flag",
  "reason": "Mild insult (repeat offender)"
}
```

### Friendly Context
When conversation context indicates friendly banter:

```
Input: "You're crazy! 😂"

Output:
{
  "severity": 0.15,
  "label": "safe",
  "category": "safe",
  "action": "allow",
  "reason": "Friendly banter, no malicious intent"
}
```

## Socket Events

### When Message is Blocked

The sender receives:
```javascript
socket.emit('message-blocked', {
  messageId: "msg-123",
  reason: "Severe harassment detected",
  severity: 0.95
});
```

The partner does NOT receive the message.

### When Message is Warned

The sender receives:
```javascript
socket.emit('message-warning', {
  messageId: "msg-456",
  reason: "Aggressive language",
  severity: 0.68
});
```

The partner DOES receive the message (but sender is warned).

### When Message is Flagged

The sender's message is delivered normally, but the system logs:
```
Message flagged: msg-789 - Minor profanity detected (severity: 0.42)
Message Analysis: {
  messageId: "msg-789",
  userId: "user-abc",
  severity: 0.42,
  label: "mild toxicity",
  category: "toxicity",
  action: "flag",
  reason: "Minor profanity detected"
}
```

## Testing

To test the analysis system manually:

1. Set your `GEMINI_API_KEY` environment variable
2. Run the test script:
   ```bash
   npx tsx server/test/testMessageAnalysis.ts
   ```

3. Or test interactively by starting the server:
   ```bash
   npm run dev
   ```
   Then send messages through the chat interface.

## Monitoring

Check server logs for analysis results:
```bash
npm run dev | grep "Message Analysis"
```

This will show all flagged, warned, and blocked messages in real-time.

## Configuration

The analysis service can be customized in `server/services/messageAnalysisService.ts`:

- `temperature`: Currently 0.1 for consistent results
- `maxOutputTokens`: Currently 256 for JSON response
- `model`: Currently `gemini-2.0-flash-exp` (fast and efficient)

## Best Practices

1. **Always review logs**: Monitor flagged messages to ensure accuracy
2. **Adjust thresholds**: If too many false positives, consider adjusting severity ranges
3. **User feedback**: Allow users to report false positives/negatives
4. **Regular updates**: Keep the Gemini model version up to date
5. **Test edge cases**: Regularly test with various message types

## Notes

- Analysis adds ~500-1500ms latency per message
- Empty messages are automatically marked as safe
- Media content (images/videos) is NOT analyzed (future enhancement)
- Service gracefully degrades if API key is missing
- Failed analyses default to "allow" (fail-open for user experience)
