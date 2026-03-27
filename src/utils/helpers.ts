/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Check if there's a winner in a Tic-Tac-Toe game
 * @param board - Array of 9 cells representing the game board
 * @returns 'X', 'O', 'draw', or null if game is still ongoing
 */
export function checkTicTacToeWinner(board: (string | null)[]): string | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6] // diagonals
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  if (board.every(cell => cell !== null)) return 'draw';
  return null;
}

/**
 * Determine winner of Rock-Paper-Scissors game
 * @param myMove - Player's move
 * @param partnerMove - Partner's move
 * @returns 'me', 'partner', or 'draw'
 */
export function checkRPSWinner(myMove: string, partnerMove: string): 'me' | 'partner' | 'draw' {
  if (myMove === partnerMove) return 'draw';

  const winConditions: Record<string, string> = {
    rock: 'scissors',
    paper: 'rock',
    scissors: 'paper',
  };

  return winConditions[myMove] === partnerMove ? 'me' : 'partner';
}

/**
 * Generate a random stranger alias
 * @returns A string like "Stranger 4523"
 */
export function generateStrangerAlias(): string {
  const min = 1000;
  const max = 10000;
  const number = Math.floor(Math.random() * (max - min)) + min;
  return `Stranger ${number}`;
}

/**
 * Generate a random avatar color from predefined options
 * @returns A color name like "indigo", "emerald", etc.
 */
export function getRandomAvatarColor(): string {
  const colors = ['indigo', 'emerald', 'rose', 'amber', 'violet', 'cyan', 'fuchsia'];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Generate a unique message ID
 * @returns A random alphanumeric string
 */
export function generateMessageId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Validate media file size
 * @param file - File to validate
 * @param maxSize - Maximum allowed size in bytes
 * @returns true if valid, false otherwise
 */
export function isValidFileSize(file: File, maxSize: number): boolean {
  return file.size <= maxSize;
}

/**
 * Validate video duration
 * @param videoElement - Video element to check
 * @param maxDuration - Maximum allowed duration in seconds
 * @returns true if valid, false otherwise
 */
export function isValidVideoDuration(videoElement: HTMLVideoElement, maxDuration: number): boolean {
  return videoElement.duration <= maxDuration;
}

/**
 * Create a system message object
 * @param text - Message text
 * @param idPrefix - Prefix for the message ID
 * @returns A Message object with system sender
 */
export function createSystemMessage(text: string, idPrefix: string = 'system') {
  return {
    id: `${idPrefix}-${Date.now()}`,
    text,
    sender: 'system' as const,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Convert File to Base64 string
 * @param file - File to convert
 * @returns Promise that resolves to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as base64'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
