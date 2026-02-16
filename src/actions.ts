/**
 * MAX channel message actions adapter — implements message tool actions
 */

import type {
  ChannelMessageActionAdapter,
  ChannelMessageActionName,
  OpenClawConfig,
} from "openclaw/plugin-sdk";
import {
  createActionGate,
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk";
import { listMaxAccountIds, resolveMaxAccount } from "./accounts.js";
import { sendMaxMessage, editMaxMessage, deleteMaxMessage, sendMaxMediaMessage, sendMaxSticker } from "./send.js";
import { getMaxRuntime } from "./runtime.js";

const providerId = "max";

function listEnabledAccounts(cfg: OpenClawConfig) {
  return listMaxAccountIds(cfg)
    .map((accountId) => resolveMaxAccount({ cfg, accountId }))
    .filter((account) => account.enabled && account.token);
}

export const maxMessageActions: ChannelMessageActionAdapter = {
  listActions: ({ cfg }) => {
    const accounts = listEnabledAccounts(cfg);
    if (accounts.length === 0) {
      return [];
    }
    const actions = new Set<ChannelMessageActionName>([]);
    actions.add("send");
    actions.add("edit");
    actions.add("delete");
    // Note: stickers are sent via action=send with stickerId param (not separate action)
    return Array.from(actions);
  },

  extractToolSend: ({ args }) => {
    const action = typeof args.action === "string" ? args.action.trim() : "";
    if (action !== "send") {
      return null;
    }
    const to = typeof args.target === "string" ? args.target : undefined;
    if (!to) {
      return null;
    }
    const accountId = typeof args.accountId === "string" ? args.accountId.trim() : undefined;
    return { to, accountId };
  },

  handleAction: async ({ action, params, cfg, accountId }) => {
    const account = resolveMaxAccount({
      cfg,
      accountId,
    });
    if (!account.token) {
      throw new Error("MAX bot token not configured");
    }

    if (action === "send") {
      const to = readStringParam(params, "target", { required: true });
      const content = readStringParam(params, "message", {
        required: true,
        allowEmpty: true,
      });
      const mediaUrl = readStringParam(params, "media", { trim: false });
      const buffer = readStringParam(params, "buffer", { trim: false });
      const filePath = readStringParam(params, "filePath", { trim: false });
      const replyTo = readStringParam(params, "replyTo");
      const stickerId = readStringParam(params, "stickerId");

      // Sticker sending (by sticker code)
      if (stickerId) {
        // stickerId can be a single id or comma-separated
        const codes = Array.isArray(params.stickerId)
          ? (params.stickerId as string[])
          : [stickerId];
        const firstCode = codes[0];
        if (firstCode) {
          const result = await sendMaxSticker(to, firstCode, {
            token: account.token,
            replyToMessageId: replyTo ?? undefined,
          });
          return jsonResult({ ok: true, to, messageId: result.messageId });
        }
      }

      // Resolve media source: media param, buffer (local path), or filePath
      const mediaSource = mediaUrl || buffer || filePath;

      if (mediaSource) {
        // Upload media from URL or local path
        const core = getMaxRuntime();
        
        // Download if URL, otherwise use as local file path
        if (mediaSource.startsWith("http://") || mediaSource.startsWith("https://")) {
          const maxBytes = (account.config.mediaMaxMb ?? 20) * 1024 * 1024;
          const loaded = await core.channel.media.fetchRemoteMedia({ url: mediaSource, maxBytes });
          
          // Write to temp file
          const fs = await import("fs/promises");
          const tmpPath = `/tmp/max-media-${Date.now()}-${loaded.fileName ?? "file"}`;
          await fs.writeFile(tmpPath, loaded.buffer);
          
          try {
            const result = await sendMaxMediaMessage(to, content, tmpPath, {
              token: account.token,
              replyToMessageId: replyTo ?? undefined,
              format: "markdown",
            });
            return jsonResult({ ok: true, to, messageId: result.messageId });
          } finally {
            // Cleanup
            await fs.unlink(tmpPath).catch(() => {});
          }
        } else {
          // Local file path (from media, buffer, or filePath params)
          const result = await sendMaxMediaMessage(to, content, mediaSource, {
            token: account.token,
            replyToMessageId: replyTo ?? undefined,
            format: "markdown",
          });
          return jsonResult({ ok: true, to, messageId: result.messageId });
        }
      }

      const result = await sendMaxMessage(to, content, {
        token: account.token,
        replyToMessageId: replyTo ?? undefined,
        format: "markdown",
      });
      return jsonResult({ ok: true, to, messageId: result.messageId });
    }

    if (action === "edit") {
      const messageId = readStringParam(params, "messageId", { required: true });
      const text = readStringParam(params, "message", {
        required: true,
        allowEmpty: true,
      });
      await editMaxMessage(messageId, text, {
        token: account.token,
        format: "markdown",
      });
      return jsonResult({ ok: true, messageId });
    }

    if (action === "delete") {
      const messageId = readStringParam(params, "messageId", { required: true });
      await deleteMaxMessage(messageId, {
        token: account.token,
      });
      return jsonResult({ ok: true, messageId });
    }

    if (action === "sticker") {
      const to = readStringParam(params, "to") ?? readStringParam(params, "target", { required: true });
      const stickerCode = readStringParam(params, "stickerId") ?? readStringParam(params, "fileId");
      if (!stickerCode) {
        throw new Error("stickerId is required. Use a sticker code from an incoming sticker message (shown as [Sticker: code=CODE]).");
      }
      const replyTo = readStringParam(params, "replyTo");

      const result = await sendMaxSticker(to, stickerCode, {
        token: account.token,
        replyToMessageId: replyTo ?? undefined,
      });
      return jsonResult({ ok: true, to, messageId: result.messageId });
    }

    throw new Error(`Action ${action} is not supported for provider ${providerId}.`);
  },
};
