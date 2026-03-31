/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { MessageAnalysis, MessageContext, UserModerationHistory } from '../types/messageAnalysis';

/**
 * AI-powered message analysis and moderation service
 */
export class MessageAnalysisService {
  private genai: GoogleGenAI | null = null;
  private model: any = null;
  private userHistory: Map<string, UserModerationHistory> = new Map();
  private isEnabled: boolean = false;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        this.genai = new GoogleGenAI({ apiKey });
        this.model = this.genai.getGenerativeModel({
          model: 'gemini-2.0-flash-exp',
          generationConfig: {
            temperature: 0.1, // Low temperature for consistent moderation
            maxOutputTokens: 256,
          }
        });
        this.isEnabled = true;
        console.log('Message Analysis Service initialized with Gemini AI');
      } catch (error) {
        console.error('Failed to initialize Gemini AI:', error);
        this.isEnabled = false;
      }
    } else {
      console.warn('GEMINI_API_KEY not configured. Message analysis disabled.');
      this.isEnabled = false;
    }
  }

  /**
   * Check if the service is enabled
   */
  public isServiceEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Analyze a message for harmful content
   */
  public async analyzeMessage(context: MessageContext): Promise<MessageAnalysis> {
    // If service is disabled, return safe result
    if (!this.isEnabled || !this.model) {
      return this.createSafeResult();
    }

    // Empty messages are safe
    if (!context.text || context.text.trim().length === 0) {
      return this.createSafeResult();
    }

    try {
      // Build analysis prompt
      const prompt = this.buildAnalysisPrompt(context);

      // Call Gemini API
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const analysis = this.parseAnalysisResponse(text);

      // Adjust severity based on user history if available
      if (context.senderId) {
        const adjustedAnalysis = this.adjustSeverityBasedOnHistory(
          analysis,
          context.senderId
        );

        // Update user history
        this.updateUserHistory(context.senderId, adjustedAnalysis);

        return adjustedAnalysis;
      }

      return analysis;
    } catch (error) {
      console.error('Message analysis failed:', error);
      // On error, allow message but log the failure
      return this.createSafeResult();
    }
  }

  /**
   * Build the analysis prompt for Gemini
   */
  private buildAnalysisPrompt(context: MessageContext): string {
    let prompt = `You are an advanced AI moderation system for an anonymous chat platform. Your primary goal is to maintain a safe, respectful, and engaging environment while preserving natural conversation flow.

Analyze the following message in real time and classify it across these dimensions:
* Toxicity (insults, harassment, hate speech)
* Sexual content (explicit, suggestive, inappropriate)
* Spam (repetitive, promotional, bot-like behavior)
* Threats or harmful intent
* Normal / safe message

MESSAGE: "${context.text}"

`;

    // Add context if available
    if (context.sessionContext) {
      prompt += `CONTEXT:
- Message count in session: ${context.sessionContext.messageCount || 'unknown'}
- Session duration: ${context.sessionContext.sessionDuration || 'unknown'} seconds
`;
    }

    // Add user history context
    if (context.senderId) {
      const history = this.userHistory.get(context.senderId);
      if (history && (history.flaggedMessages > 0 || history.warnedMessages > 0 || history.blockedMessages > 0)) {
        prompt += `- User has previous violations: ${history.flaggedMessages} flagged, ${history.warnedMessages} warned, ${history.blockedMessages} blocked\n`;
      }
    }

    prompt += `
BEHAVIOR RULES:
* Be strict on hate speech, threats, and harassment (zero tolerance for severe cases).
* Be tolerant of casual language, jokes, and slang if not harmful.
* Do NOT over-block normal human conversation.
* Detect disguised toxicity (sarcasm, coded language, repeated patterns).
* Identify spam patterns even if wording changes slightly.
* Consider previous violations when available - escalate severity if user repeatedly sends borderline content.
* Reduce severity if message is clearly friendly or joking.

SEVERITY SCORING:
* 0.0–0.3 → allow message (completely safe to mildly questionable)
* 0.3–0.6 → allow but flag internally (borderline content, monitor user)
* 0.6–0.8 → temporarily warn the user (clear policy violation)
* 0.8–1.0 → block message and mark user for moderation (severe abuse)

Output ONLY valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
{
  "severity": 0.0,
  "label": "safe",
  "category": "safe",
  "action": "allow",
  "reason": "Normal friendly message"
}

Possible values:
- severity: number between 0.0 and 1.0
- label: "safe", "mild toxicity", "moderate toxicity", "severe abuse", "spam", "sexual content", "threats", "harassment"
- category: "safe", "toxicity", "sexual", "spam", "threats", "harassment"
- action: "allow", "flag", "warn", "block"
- reason: short explanation (max 100 characters)

Analyze now and respond with JSON only:`;

    return prompt;
  }

  /**
   * Parse the JSON response from Gemini
   */
  private parseAnalysisResponse(text: string): MessageAnalysis {
    try {
      // Remove markdown code blocks if present
      let cleaned = text.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.substring(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.substring(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
      }
      cleaned = cleaned.trim();

      const parsed = JSON.parse(cleaned);

      // Validate and normalize the response
      return {
        severity: this.clamp(parsed.severity || 0, 0, 1),
        label: parsed.label || 'safe',
        category: parsed.category || 'safe',
        action: this.determineAction(parsed.severity || 0, parsed.action),
        reason: parsed.reason || 'Analyzed successfully'
      };
    } catch (error) {
      console.error('Failed to parse analysis response:', error, 'Text:', text);
      return this.createSafeResult();
    }
  }

  /**
   * Determine the action based on severity
   */
  private determineAction(severity: number, suggestedAction?: string): 'allow' | 'flag' | 'warn' | 'block' {
    // Use suggested action if it matches severity range
    if (suggestedAction) {
      const action = suggestedAction as 'allow' | 'flag' | 'warn' | 'block';
      if (this.isActionValidForSeverity(action, severity)) {
        return action;
      }
    }

    // Determine based on severity
    if (severity >= 0.8) return 'block';
    if (severity >= 0.6) return 'warn';
    if (severity >= 0.3) return 'flag';
    return 'allow';
  }

  /**
   * Check if action is valid for severity
   */
  private isActionValidForSeverity(action: string, severity: number): boolean {
    if (action === 'block') return severity >= 0.8;
    if (action === 'warn') return severity >= 0.6 && severity < 0.8;
    if (action === 'flag') return severity >= 0.3 && severity < 0.6;
    if (action === 'allow') return severity < 0.3;
    return false;
  }

  /**
   * Adjust severity based on user history
   */
  private adjustSeverityBasedOnHistory(
    analysis: MessageAnalysis,
    userId: string
  ): MessageAnalysis {
    const history = this.userHistory.get(userId);

    if (!history) {
      return analysis;
    }

    // Escalate if user has multiple violations
    const totalViolations = history.flaggedMessages + history.warnedMessages + history.blockedMessages;

    if (totalViolations >= 5 && analysis.severity >= 0.2) {
      // User with 5+ violations: be more strict
      const escalation = Math.min(0.2, totalViolations * 0.02);
      const newSeverity = this.clamp(analysis.severity + escalation, 0, 1);

      return {
        ...analysis,
        severity: newSeverity,
        action: this.determineAction(newSeverity),
        reason: `${analysis.reason} (repeat offender)`
      };
    }

    return analysis;
  }

  /**
   * Update user moderation history
   */
  private updateUserHistory(userId: string, analysis: MessageAnalysis): void {
    let history = this.userHistory.get(userId);

    if (!history) {
      history = {
        userId,
        flaggedMessages: 0,
        warnedMessages: 0,
        blockedMessages: 0
      };
      this.userHistory.set(userId, history);
    }

    // Update counts based on action
    if (analysis.action === 'flag') {
      history.flaggedMessages++;
      history.lastViolation = new Date().toISOString();
    } else if (analysis.action === 'warn') {
      history.warnedMessages++;
      history.lastViolation = new Date().toISOString();
    } else if (analysis.action === 'block') {
      history.blockedMessages++;
      history.lastViolation = new Date().toISOString();
    }
  }

  /**
   * Get user moderation history
   */
  public getUserHistory(userId: string): UserModerationHistory | undefined {
    return this.userHistory.get(userId);
  }

  /**
   * Create a safe result (default when service is disabled or on error)
   */
  private createSafeResult(): MessageAnalysis {
    return {
      severity: 0,
      label: 'safe',
      category: 'safe',
      action: 'allow',
      reason: 'No issues detected'
    };
  }

  /**
   * Clamp a number between min and max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Clear user history (for testing or admin purposes)
   */
  public clearUserHistory(userId: string): void {
    this.userHistory.delete(userId);
  }

  /**
   * Clear all history
   */
  public clearAllHistory(): void {
    this.userHistory.clear();
  }
}

// Singleton instance
let messageAnalysisService: MessageAnalysisService | null = null;

/**
 * Get the singleton instance of MessageAnalysisService
 */
export function getMessageAnalysisService(): MessageAnalysisService {
  if (!messageAnalysisService) {
    messageAnalysisService = new MessageAnalysisService();
  }
  return messageAnalysisService;
}
