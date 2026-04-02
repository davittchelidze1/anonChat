/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Input validation utilities for socket events and API requests
 *
 * This module provides type-safe validation for all user inputs
 * to prevent injection attacks and ensure data integrity.
 */

// ============================================================================
// Type Guards
// ============================================================================

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

// ============================================================================
// String Validation
// ============================================================================

export interface StringValidationOptions {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  trim?: boolean;
  allowEmpty?: boolean;
}

export function validateString(
  value: unknown,
  options: StringValidationOptions = {}
): { valid: boolean; value?: string; error?: string } {
  if (!isString(value)) {
    return { valid: false, error: 'Value must be a string' };
  }

  let str = value;
  if (options.trim !== false) {
    str = str.trim();
  }

  if (!options.allowEmpty && str.length === 0) {
    return { valid: false, error: 'String cannot be empty' };
  }

  if (options.minLength !== undefined && str.length < options.minLength) {
    return {
      valid: false,
      error: `String must be at least ${options.minLength} characters`,
    };
  }

  if (options.maxLength !== undefined && str.length > options.maxLength) {
    return {
      valid: false,
      error: `String must be at most ${options.maxLength} characters`,
    };
  }

  if (options.pattern && !options.pattern.test(str)) {
    return { valid: false, error: 'String does not match required pattern' };
  }

  return { valid: true, value: str };
}

// ============================================================================
// Number Validation
// ============================================================================

export interface NumberValidationOptions {
  min?: number;
  max?: number;
  integer?: boolean;
}

export function validateNumber(
  value: unknown,
  options: NumberValidationOptions = {}
): { valid: boolean; value?: number; error?: string } {
  if (!isNumber(value)) {
    return { valid: false, error: 'Value must be a number' };
  }

  if (options.integer && !Number.isInteger(value)) {
    return { valid: false, error: 'Value must be an integer' };
  }

  if (options.min !== undefined && value < options.min) {
    return { valid: false, error: `Value must be at least ${options.min}` };
  }

  if (options.max !== undefined && value > options.max) {
    return { valid: false, error: `Value must be at most ${options.max}` };
  }

  return { valid: true, value };
}

// ============================================================================
// UUID Validation
// ============================================================================

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: unknown): value is string {
  return isString(value) && UUID_REGEX.test(value);
}

export function validateUUID(value: unknown): { valid: boolean; value?: string; error?: string } {
  if (!isString(value)) {
    return { valid: false, error: 'UUID must be a string' };
  }

  if (!UUID_REGEX.test(value)) {
    return { valid: false, error: 'Invalid UUID format' };
  }

  return { valid: true, value };
}

// ============================================================================
// Message Validation
// ============================================================================

export interface SendMessagePayload {
  id?: string;
  text?: string;
  image?: string;
  video?: string;
  maxViews?: number;
}

export function validateSendMessagePayload(
  payload: unknown
): { valid: boolean; data?: SendMessagePayload; error?: string } {
  if (!isObject(payload) && !isString(payload)) {
    return { valid: false, error: 'Payload must be an object or string' };
  }

  // Handle string payload (legacy support)
  if (isString(payload)) {
    const textValidation = validateString(payload, { maxLength: 5000 });
    if (!textValidation.valid) {
      return { valid: false, error: textValidation.error };
    }
    return {
      valid: true,
      data: {
        text: textValidation.value,
      },
    };
  }

  const data: SendMessagePayload = {};

  // Validate ID if present
  if (payload.id !== undefined) {
    if (!isString(payload.id) || payload.id.length === 0) {
      return { valid: false, error: 'Message ID must be a non-empty string' };
    }
    data.id = payload.id;
  }

  // Validate text if present
  if (payload.text !== undefined) {
    const textValidation = validateString(payload.text, { maxLength: 5000, allowEmpty: true });
    if (!textValidation.valid) {
      return { valid: false, error: `Text: ${textValidation.error}` };
    }
    data.text = textValidation.value;
  }

  // Validate image if present (base64)
  if (payload.image !== undefined) {
    if (!isString(payload.image)) {
      return { valid: false, error: 'Image must be a base64 string' };
    }
    // Basic base64 check
    if (payload.image.length > 5_000_000) {
      // 5MB limit for base64
      return { valid: false, error: 'Image too large (max 5MB)' };
    }
    data.image = payload.image;
  }

  // Validate video if present (base64)
  if (payload.video !== undefined) {
    if (!isString(payload.video)) {
      return { valid: false, error: 'Video must be a base64 string' };
    }
    if (payload.video.length > 10_000_000) {
      // 10MB limit for base64
      return { valid: false, error: 'Video too large (max 10MB)' };
    }
    data.video = payload.video;
  }

  // Validate maxViews if present
  if (payload.maxViews !== undefined) {
    const viewsValidation = validateNumber(payload.maxViews, { min: 1, max: 100, integer: true });
    if (!viewsValidation.valid) {
      return { valid: false, error: `MaxViews: ${viewsValidation.error}` };
    }
    data.maxViews = viewsValidation.value;
  }

  // Must have at least text, image, or video
  if (!data.text && !data.image && !data.video) {
    return { valid: false, error: 'Message must contain text, image, or video' };
  }

  return { valid: true, data };
}

// ============================================================================
// Game Event Validation
// ============================================================================

export interface GameInvitePayload {
  gameType: string;
  toUserId?: string;
}

export function validateGameInvitePayload(
  payload: unknown
): { valid: boolean; data?: GameInvitePayload; error?: string } {
  // Handle string payload (legacy)
  if (isString(payload)) {
    return {
      valid: true,
      data: {
        gameType: payload,
      },
    };
  }

  if (!isObject(payload)) {
    return { valid: false, error: 'Payload must be an object or string' };
  }

  if (!isString(payload.gameType) || payload.gameType.length === 0) {
    return { valid: false, error: 'Game type must be a non-empty string' };
  }

  const data: GameInvitePayload = {
    gameType: payload.gameType,
  };

  if (payload.toUserId !== undefined) {
    if (!isString(payload.toUserId)) {
      return { valid: false, error: 'toUserId must be a string' };
    }
    data.toUserId = payload.toUserId;
  }

  return { valid: true, data };
}

// ============================================================================
// Array Validation
// ============================================================================

export function validateStringArray(
  value: unknown,
  options: { maxLength?: number; itemMaxLength?: number } = {}
): { valid: boolean; value?: string[]; error?: string } {
  if (!isArray(value)) {
    return { valid: false, error: 'Value must be an array' };
  }

  if (options.maxLength !== undefined && value.length > options.maxLength) {
    return { valid: false, error: `Array must have at most ${options.maxLength} items` };
  }

  const strings: string[] = [];
  for (const item of value) {
    if (!isString(item)) {
      return { valid: false, error: 'All array items must be strings' };
    }

    if (options.itemMaxLength !== undefined && item.length > options.itemMaxLength) {
      return {
        valid: false,
        error: `Array items must be at most ${options.itemMaxLength} characters`,
      };
    }

    strings.push(item);
  }

  return { valid: true, value: strings };
}

// ============================================================================
// Sanitization
// ============================================================================

/**
 * Sanitize HTML to prevent XSS
 * Basic implementation - for production consider using a library like DOMPurify
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize username
 */
export function validateUsername(
  username: unknown
): { valid: boolean; value?: string; error?: string } {
  const validation = validateString(username, {
    minLength: 3,
    maxLength: 24,
    pattern: /^[a-z0-9_]+$/,
  });

  if (!validation.valid) {
    return validation;
  }

  return {
    valid: true,
    value: validation.value,
  };
}

/**
 * Validate user ID (Firebase UID or custom)
 */
export function validateUserId(
  userId: unknown
): { valid: boolean; value?: string; error?: string } {
  const validation = validateString(userId, {
    minLength: 1,
    maxLength: 128,
  });

  if (!validation.valid) {
    return { valid: false, error: 'Invalid user ID' };
  }

  return validation;
}
