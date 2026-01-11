// StreamScanner EventSub payload types

export interface MessageFragment {
  type: 'text' | 'emote' | 'cheermote' | 'mention';
  text: string;
  emote?: {
    id: string;
    emote_set_id: string;
  };
  cheermote?: {
    prefix: string;
    bits: number;
    tier: number;
  };
  mention?: {
    user_id: string;
    user_name: string;
    user_login: string;
  };
}

export interface Badge {
  set_id: string; // 'broadcaster', 'moderator', 'subscriber', 'vip', etc.
  id: string;
  info: string;
}

export interface ReplyInfo {
  parent_message_id: string;
  parent_user_id: string;
  parent_user_login: string;
  parent_user_name: string;
  parent_message_body: string;
  thread_message_id?: string;
  thread_user_id?: string;
  thread_user_login?: string;
  thread_user_name?: string;
}

export interface StreamScannerChatMessage {
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  chatter_user_id: string;
  chatter_user_login: string;
  chatter_user_name: string;
  message_id: string;
  message: {
    text: string;
    fragments: MessageFragment[];
  };
  color: string | null;
  badges: Badge[];
  message_type: string;
  cheer: {
    bits: number;
  } | null;
  reply: ReplyInfo | null;
  channel_points_custom_reward_id: string | null;
  source_broadcaster_user_id?: string;
  source_broadcaster_user_login?: string;
  source_broadcaster_user_name?: string;
  source_message_id?: string;
  source_badges?: Badge[];
}

export enum UserRole {
  BROADCASTER = 'broadcaster',
  MODERATOR = 'moderator',
  VIP = 'vip',
  SUBSCRIBER = 'subscriber',
  REGULAR = 'regular',
}

export interface ParsedChatMessage {
  messageId: string;
  userName: string;
  displayName: string;
  message: string;
  role: UserRole;
  color: string | null;
  isSubscriber: boolean;
  isModerator: boolean;
  isBroadcaster: boolean;
  isVip: boolean;
  replyToUser: string | null;
  badges: Badge[];
}
