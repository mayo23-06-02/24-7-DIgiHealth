/**
 * Message validation utilities for chat system
 */

export interface MessageData {
  conversationId?: string;
  senderId?: string;
  receiverId?: string;
  content?: string;
  type?: string;
  fileUrl?: string;
  fileMime?: string;
  clientId?: string;
}

const VALID_MESSAGE_TYPES = [
  'text',
  'image',
  'file',
  'audio',
  'quick_phrase',
  'record_attachment',
  'call_log',
] as const;

const VALID_FILE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'video/mp4',
  'video/webm',
];

/**
 * Validate message data before sending
 */
export function validateMessage(message: MessageData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!message.conversationId) {
    errors.push('conversationId is required');
  }

  if (!message.senderId) {
    errors.push('senderId is required');
  }

  if (!message.receiverId) {
    errors.push('receiverId is required');
  }

  // Content validation
  if (!message.content || typeof message.content !== 'string') {
    errors.push('content is required and must be a string');
  } else if (message.content.length > 10000) {
    errors.push('content must be less than 10,000 characters');
  } else if (message.content.trim().length === 0 && message.type !== 'file' && message.type !== 'image') {
    errors.push('content cannot be empty');
  }

  // Type validation
  if (message.type && !VALID_MESSAGE_TYPES.includes(message.type as any)) {
    errors.push(`type must be one of: ${VALID_MESSAGE_TYPES.join(', ')}`);
  }

  // File URL validation
  if (message.fileUrl) {
    try {
      new URL(message.fileUrl);
    } catch {
      errors.push('fileUrl must be a valid URL');
    }
  }

  // File MIME validation
  if (message.fileMime && !VALID_FILE_MIMES.includes(message.fileMime)) {
    errors.push(`fileMime must be one of: ${VALID_FILE_MIMES.join(', ')}`);
  }

  // Client ID validation (for idempotent operations)
  if (message.clientId && typeof message.clientId !== 'string') {
    errors.push('clientId must be a string');
  }

  // Type-specific validations
  if (message.type === 'file' && !message.fileUrl) {
    errors.push('fileUrl is required for file messages');
  }

  if (message.type === 'image' && !message.fileUrl) {
    errors.push('fileUrl is required for image messages');
  }

  if (message.type === 'audio' && !message.fileUrl) {
    errors.push('fileUrl is required for audio messages');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize message content to prevent XSS
 */
export function sanitizeContent(content: string): string {
  // Remove HTML tags
  let sanitized = content.replace(/<[^>]*>/g, '');
  
  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Validate file attachment
 */
export function validateFileAttachment(file: File): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // File size validation (max 10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    errors.push('File size must be less than 10MB');
  }

  // MIME type validation
  if (!VALID_FILE_MIMES.includes(file.type as any)) {
    errors.push(`File type must be one of: ${VALID_FILE_MIMES.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate conversation ID format
 */
export function validateConversationId(conversationId: string): boolean {
  // MongoDB ObjectId format (24 hex characters)
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  return objectIdPattern.test(conversationId);
}

/**
 * Validate user ID format
 */
export function validateUserId(userId: string): boolean {
  // MongoDB ObjectId format (24 hex characters)
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  return objectIdPattern.test(userId);
}

/**
 * Check if message contains potentially harmful content
 */
export function containsHarmfulContent(content: string): boolean {
  const harmfulPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /data:text\/html/i,
  ];

  return harmfulPatterns.some(pattern => pattern.test(content));
}

/**
 * Rate limit check for message sending
 */
export class MessageRateLimiter {
  private timestamps: number[] = [];
  private maxMessages: number;
  private windowMs: number;

  constructor(maxMessages: number = 60, windowMs: number = 60000) {
    this.maxMessages = maxMessages;
    this.windowMs = windowMs;
  }

  canSend(): boolean {
    const now = Date.now();
    
    // Remove timestamps outside the window
    this.timestamps = this.timestamps.filter(
      timestamp => now - timestamp < this.windowMs
    );

    if (this.timestamps.length >= this.maxMessages) {
      return false;
    }

    this.timestamps.push(now);
    return true;
  }

  getRemainingMessages(): number {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(
      timestamp => now - timestamp < this.windowMs
    );
    return Math.max(0, this.maxMessages - this.timestamps.length);
  }

  getResetTime(): number {
    if (this.timestamps.length === 0) return 0;
    const oldestTimestamp = this.timestamps[0];
    return oldestTimestamp + this.windowMs;
  }
}
