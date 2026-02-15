/**
 * Outbound message sending for MAX.
 */

import { MaxApi, type MaxNewMessageBody, type MaxSendResult, type MaxInlineKeyboardAttachment } from "./api.js";
import { resolveMaxAccount } from "./accounts.js";
import type { OpenClawConfig } from "openclaw/plugin-sdk";

export interface MaxSendOptions {
  token?: string;
  accountId?: string;
  cfg?: OpenClawConfig;
  replyToMessageId?: string;
  format?: "markdown" | "html";
  disableLinkPreview?: boolean;
  notify?: boolean;
  buttons?: Array<Array<{ text: string; payload?: string; url?: string }>>;
}

/**
 * Resolve a token from options or config.
 */
function resolveToken(opts: MaxSendOptions): string {
  if (opts.token) return opts.token;
  if (opts.cfg) {
    const account = resolveMaxAccount({ cfg: opts.cfg, accountId: opts.accountId });
    if (account.token) return account.token;
  }
  throw new Error("MAX bot token not available");
}

/**
 * Send a text message to a MAX chat or user.
 */
export async function sendMaxMessage(
  to: string,
  text: string,
  opts: MaxSendOptions = {},
): Promise<{ messageId: string; raw: MaxSendResult }> {
  const token = resolveToken(opts);
  const api = new MaxApi({ token });

  const chatId = Number(to);
  const isUserId = !Number.isNaN(chatId);

  // Build message body
  const body: MaxNewMessageBody = {
    text: text || undefined,
    format: opts.format ?? undefined,
    notify: opts.notify,
  };

  // Reply context
  if (opts.replyToMessageId) {
    body.link = { type: "reply", mid: opts.replyToMessageId };
  }

  // Inline keyboard from buttons
  if (opts.buttons?.length) {
    const keyboard: MaxInlineKeyboardAttachment = {
      type: "inline_keyboard",
      payload: {
        buttons: opts.buttons.map((row) =>
          row.map((btn) => {
            if (btn.url) {
              return { type: "link" as const, text: btn.text, url: btn.url };
            }
            return {
              type: "callback" as const,
              text: btn.text,
              payload: btn.payload ?? btn.text,
            };
          }),
        ),
      },
    };
    body.attachments = [keyboard];
  }

  // Determine params
  const params: { chat_id?: number; user_id?: number; disable_link_preview?: boolean } = {};

  if (isUserId) {
    // Could be either chat_id or user_id. For DMs, prefer chat_id if negative or large.
    // MAX uses positive IDs for both users and chats.
    // Convention: if we have a chat_id from an inbound message, use chat_id.
    // For now, try chat_id first, fall back to user_id.
    params.chat_id = chatId;
  }

  if (opts.disableLinkPreview) {
    params.disable_link_preview = true;
  }

  const result = await api.sendMessage(body, params);

  return {
    messageId: result.message?.body?.mid ?? "",
    raw: result,
  };
}

/**
 * Edit an existing MAX message.
 */
export async function editMaxMessage(
  messageId: string,
  text: string,
  opts: MaxSendOptions = {},
): Promise<void> {
  const token = resolveToken(opts);
  const api = new MaxApi({ token });

  await api.editMessage(messageId, {
    text,
    format: opts.format ?? undefined,
  });
}

/**
 * Delete a MAX message.
 */
export async function deleteMaxMessage(
  messageId: string,
  opts: MaxSendOptions = {},
): Promise<void> {
  const token = resolveToken(opts);
  const api = new MaxApi({ token });

  await api.deleteMessage(messageId);
}
