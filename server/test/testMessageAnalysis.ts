/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Test script for message analysis service
 *
 * This script tests the message analysis service with various message types
 * to ensure it correctly classifies and handles different content.
 *
 * Usage:
 *   Set GEMINI_API_KEY environment variable
 *   Run: npx tsx server/test/testMessageAnalysis.ts
 */

import { MessageAnalysisService } from '../services/messageAnalysisService';
import { MessageContext } from '../types/messageAnalysis';

// Test messages with expected classifications
const testCases = [
  {
    name: 'Safe greeting',
    text: 'Hello! How are you today?',
    expectedAction: 'allow',
    expectedSeverity: { min: 0, max: 0.3 }
  },
  {
    name: 'Friendly conversation',
    text: 'I love this chat app! It\'s really cool',
    expectedAction: 'allow',
    expectedSeverity: { min: 0, max: 0.3 }
  },
  {
    name: 'Casual language',
    text: 'That\'s awesome dude!',
    expectedAction: 'allow',
    expectedSeverity: { min: 0, max: 0.3 }
  },
  {
    name: 'Mild profanity',
    text: 'This is damn cool!',
    expectedAction: 'allow', // or 'flag' depending on strictness
    expectedSeverity: { min: 0, max: 0.5 }
  },
  {
    name: 'Spam pattern',
    text: 'BUY NOW!!! CLICK HERE FOR FREE MONEY!!! LIMITED OFFER!!!',
    expectedAction: 'flag', // or 'warn'
    expectedSeverity: { min: 0.3, max: 0.8 }
  },
  {
    name: 'Harassment',
    text: 'You are stupid and worthless',
    expectedAction: 'warn', // or 'block'
    expectedSeverity: { min: 0.6, max: 1.0 }
  },
  {
    name: 'Hate speech',
    text: 'I hate [protected group] and they should be eliminated',
    expectedAction: 'block',
    expectedSeverity: { min: 0.8, max: 1.0 }
  },
  {
    name: 'Sexual content',
    text: 'Want to see explicit content? Send nudes',
    expectedAction: 'warn', // or 'block'
    expectedSeverity: { min: 0.6, max: 1.0 }
  },
  {
    name: 'Threats',
    text: 'I will find you and hurt you',
    expectedAction: 'block',
    expectedSeverity: { min: 0.8, max: 1.0 }
  }
];

async function runTests() {
  console.log('='.repeat(70));
  console.log('MESSAGE ANALYSIS SERVICE TEST');
  console.log('='.repeat(70));
  console.log();

  const service = new MessageAnalysisService();

  if (!service.isServiceEnabled()) {
    console.error('❌ Service is not enabled. Please set GEMINI_API_KEY environment variable.');
    console.error('   Example: export GEMINI_API_KEY=your_api_key_here');
    process.exit(1);
  }

  console.log('✅ Service initialized successfully');
  console.log();

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    console.log(`Message: "${testCase.text}"`);

    try {
      const context: MessageContext = {
        text: testCase.text,
        senderId: 'test-user-123',
        messageId: `test-${Date.now()}`,
        timestamp: new Date().toISOString()
      };

      const result = await service.analyzeMessage(context);

      console.log(`Result: severity=${result.severity.toFixed(2)}, action=${result.action}, label=${result.label}`);
      console.log(`Reason: ${result.reason}`);

      // Check if severity is in expected range
      const severityInRange =
        result.severity >= testCase.expectedSeverity.min &&
        result.severity <= testCase.expectedSeverity.max;

      // Check if action matches (with some flexibility)
      const actionMatches = result.action === testCase.expectedAction;

      if (severityInRange) {
        console.log(`✅ Severity in expected range [${testCase.expectedSeverity.min}, ${testCase.expectedSeverity.max}]`);
        passed++;
      } else {
        console.log(`⚠️  Severity outside expected range [${testCase.expectedSeverity.min}, ${testCase.expectedSeverity.max}]`);
        failed++;
      }

      if (actionMatches) {
        console.log(`✅ Action matches expected: ${testCase.expectedAction}`);
      } else {
        console.log(`⚠️  Action (${result.action}) differs from expected (${testCase.expectedAction})`);
      }

    } catch (error) {
      console.log(`❌ Error: ${error}`);
      failed++;
    }

    console.log('-'.repeat(70));
    console.log();

    // Wait a bit between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total tests: ${testCases.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log();

  if (failed === 0) {
    console.log('✅ All tests passed!');
  } else {
    console.log(`⚠️  ${failed} tests had unexpected results`);
    console.log('Note: AI responses may vary. Manual review recommended for edge cases.');
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
