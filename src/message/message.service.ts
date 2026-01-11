import { Injectable, Logger } from '@nestjs/common';
import { PetsciiService } from '../petscii/petscii.service';
import {
  StreamScannerChatMessage,
  ParsedChatMessage,
  UserRole,
} from '../pusher/pusher.types';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(private readonly petsciiService: PetsciiService) {}

  /**
   * Parse a StreamScanner chat message into a simplified format
   */
  parseMessage(data: StreamScannerChatMessage): ParsedChatMessage {
    const badges = data.badges || [];

    const isBroadcaster = badges.some((b) => b.set_id === 'broadcaster');
    const isModerator = badges.some((b) => b.set_id === 'moderator');
    const isVip = badges.some((b) => b.set_id === 'vip');
    const isSubscriber = badges.some((b) => b.set_id === 'subscriber');

    let role = UserRole.REGULAR;
    if (isBroadcaster) role = UserRole.BROADCASTER;
    else if (isModerator) role = UserRole.MODERATOR;
    else if (isVip) role = UserRole.VIP;
    else if (isSubscriber) role = UserRole.SUBSCRIBER;

    // Extract text without emotes from fragments
    const messageText = this.extractTextFromFragments(data);

    return {
      messageId: data.message_id,
      userName: data.chatter_user_login,
      displayName: data.chatter_user_name,
      message: messageText,
      role,
      color: data.color,
      isSubscriber,
      isModerator,
      isBroadcaster,
      isVip,
      replyToUser: data.reply?.parent_user_name || null,
      badges,
    };
  }

  /**
   * Extract text from message fragments, skipping emotes
   */
  private extractTextFromFragments(data: StreamScannerChatMessage): string {
    const fragments = data.message?.fragments || [];

    // If no fragments, fall back to raw text
    if (fragments.length === 0) {
      return data.message?.text || '';
    }

    // Build message from non-emote fragments
    return fragments
      .filter((f) => f.type !== 'emote' && f.type !== 'cheermote')
      .map((f) => f.text)
      .join('')
      .trim();
  }

  /**
   * Format a chat message for C64 display with PETSCII colors
   */
  formatForC64(parsed: ParsedChatMessage): string {
    const codes = this.petsciiService.codes;

    // Clean the message for C64 display
    let message = this.petsciiService.cleanMessage(parsed.message);

    if (!message) {
      return ''; // Skip empty messages
    }

    // Handle reply highlighting
    if (parsed.replyToUser) {
      const replyMention = `@${parsed.replyToUser.toLowerCase()}`;
      const highlightedMention =
        `${codes.REVERSE_ON}${codes.WHITE}@${parsed.replyToUser.toLowerCase()}` +
        `${codes.LIGHT_BLUE}${codes.REVERSE_OFF}`;
      message = message.replace(replyMention, highlightedMention);
    }

    // Determine user color and formatting based on role
    let userColor = codes.WHITE;
    let inverter = '';

    if (parsed.isSubscriber) {
      inverter = codes.REVERSE_ON;
    }

    if (parsed.isModerator) {
      inverter = codes.REVERSE_ON;
      userColor = codes.GREEN;
    }

    if (parsed.isBroadcaster) {
      userColor = codes.PINK;
      inverter = ''; // Broadcaster doesn't get inverse
    }

    // Format: [inverse?][color]username[/inverse]: [light_blue]message
    const chatMessage =
      `${inverter}${userColor}${parsed.userName.toLowerCase()}${codes.REVERSE_OFF}: ` +
      `${codes.LIGHT_BLUE}${message}\r\r`;

    return chatMessage;
  }

  /**
   * Generate the welcome message for new C64 connections
   */
  getWelcomeMessage(version: string): string {
    const codes = this.petsciiService.codes;

    // Build the welcome animation
    let message =
      `${codes.CLEAR}\r\r\r\r` +
      `${codes.LIGHT_GREY}*** ${codes.WHITE}welcome to the ` +
      `${codes.PINK}neon ${codes.CYAN}void ${codes.LIGHT_GREY}***\r\r`;

    // Add underscored version line
    message += this.petsciiService.drawUnderscore(
      `commodore 64 terminal rev:${version}`,
      codes.LIGHT_BLUE,
      codes.LIGHT_GREY,
    );

    message += `${codes.GREEN}all systems are operational\r`;

    // Show link status with animation (starts "down", animates to "up")
    message += `${codes.LIGHT_GREEN}cyberspace link is `;
    message += `${codes.RED}${codes.REVERSE_ON}down${codes.REVERSE_OFF}`;

    // Add delay effect with spaces
    message += ' '.repeat(8);
    message += codes.DELETE.repeat(8);

    // Delete "down" and show "up"
    message += codes.DELETE.repeat(4);
    message += `${codes.GREEN}${codes.REVERSE_ON}up${codes.REVERSE_OFF}\r\r\r`;

    message += `${codes.CYAN}ready.\r`;

    return message;
  }

  /**
   * Generate ephemeral status message (shown every 2 minutes when idle)
   */
  getEphemeralMessage(): string {
    const codes = this.petsciiService.codes;

    // Format current time (PST)
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Los_Angeles',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    const timeString = now.toLocaleString('en-US', options) + ' (PST)';

    const cleanedTime = this.petsciiService.cleanMessage(timeString, 36);

    // Create the ephemeral message that shows and then erases itself
    let padded =
      `${codes.CYAN}${codes.REVERSE_ON}  ${cleanedTime}  ` +
      `${codes.REVERSE_OFF}${codes.LIGHT_BLUE}`;

    padded += '\r' + codes.CURSOR_LEFT.repeat(40);
    padded +=
      `${codes.GREY}${codes.REVERSE_ON}  ${cleanedTime}  ` +
      `${codes.REVERSE_OFF}${codes.LIGHT_BLUE}`;

    // Add delete sequence to erase the message
    padded += this.petsciiService.addDelete();

    return padded;
  }

  /**
   * Generate Pusher status notification message
   */
  getPusherStatusMessage(isConnected: boolean): string {
    const codes = this.petsciiService.codes;

    if (isConnected) {
      return (
        `\r${codes.GREEN}${codes.REVERSE_ON} cyberspace link restored ` +
        `${codes.REVERSE_OFF}\r\r`
      );
    } else {
      return (
        `\r${codes.RED}${codes.REVERSE_ON} twitch link lost ` +
        `${codes.REVERSE_OFF}\r\r`
      );
    }
  }

  /**
   * Generate reconnection attempt notification
   */
  getReconnectingMessage(): string {
    const codes = this.petsciiService.codes;

    return (
      `\r${codes.YELLOW}${codes.REVERSE_ON} reconnecting to twitch... ` +
      `${codes.REVERSE_OFF}\r\r`
    );
  }
}
