import { Injectable } from '@nestjs/common';
import { PETSCII, ALLOWED_CHARS_PATTERN } from './petscii.constants';

@Injectable()
export class PetsciiService {
  /**
   * Clean and sanitize a message for C64 display
   * - Filters to allowed characters only
   * - Converts to lowercase
   * - Removes consecutive spaces
   * - Trims to max length
   */
  cleanMessage(input: string, maxLength = 256): string {
    const message = input.trim();

    // Extract only allowed characters
    const matches = message.match(ALLOWED_CHARS_PATTERN) || [];
    let cleaned = matches
      .filter((match) => match.trim() !== '')
      .join(' ')
      .trim();

    // Convert to lowercase (C64 native character set)
    cleaned = cleaned.toLowerCase();

    // Replace multiple spaces with single space
    cleaned = cleaned.replace(/\s+/g, ' ');

    // Trim to max length
    if (cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength) + '...';
    }

    return cleaned;
  }

  /**
   * Draw text with underscore decoration
   */
  drawUnderscore(text: string, color: string, underscoreColor: string): string {
    return (
      color +
      text +
      '\r' +
      underscoreColor +
      PETSCII.UP_UNDERSCORE.repeat(text.length) +
      '\r' +
      color
    );
  }

  /**
   * Create a delete sequence to erase text
   */
  addDelete(): string {
    return (
      '\r' + PETSCII.CURSOR_LEFT.repeat(40) + '\r' + PETSCII.DELETE.repeat(40)
    );
  }

  /**
   * Get PETSCII constants
   */
  get codes() {
    return PETSCII;
  }
}
