type TelegramChat = {
  id?: string | number;
  type?: string;
  username?: string;
};

export type TelegramPost = {
  chat?: TelegramChat;
  message_id?: string | number;
  date?: number;
  text?: string;
  caption?: string;
  entities?: unknown[];
  caption_entities?: unknown[];
};

type TelegramUpdate = {
  message?: TelegramPost;
  edited_message?: TelegramPost;
  channel_post?: TelegramPost;
  edited_channel_post?: TelegramPost;
};

export function inboundTelegramPost(update: TelegramUpdate) {
  if (update.channel_post) {
    return { post: update.channel_post, edited: false };
  }
  if (update.edited_channel_post) {
    return { post: update.edited_channel_post, edited: true };
  }
  if (update.message && update.message.chat?.type !== 'private') {
    return { post: update.message, edited: false };
  }
  if (update.edited_message && update.edited_message.chat?.type !== 'private') {
    return { post: update.edited_message, edited: true };
  }
  return null;
}
