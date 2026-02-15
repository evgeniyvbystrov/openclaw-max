/**
 * MAX channel plugin for OpenClaw.
 *
 * Implements the ChannelPlugin interface to integrate MAX messenger.
 */

import type {
  ChannelPlugin,
  ChannelAccountSnapshot,
  ChannelMeta,
  OpenClawConfig,
} from "openclaw/plugin-sdk";
import {
  DEFAULT_ACCOUNT_ID,
  normalizeAccountId,
  emptyPluginConfigSchema,
  formatPairingApproveHint,
  PAIRING_APPROVED_MESSAGE,
  setAccountEnabledInConfigSection,
  deleteAccountFromConfigSection,
  applyAccountNameToChannelSection,
  migrateBaseNameToDefaultAccount,
} from "openclaw/plugin-sdk";

import {
  listMaxAccountIds,
  resolveDefaultMaxAccountId,
  resolveMaxAccount,
  type ResolvedMaxAccount,
} from "./accounts.js";
import { MaxApi, type MaxUser } from "./api.js";
import { sendMaxMessage } from "./send.js";
import { startMaxPolling } from "./monitor.js";
import { getMaxRuntime } from "./runtime.js";

// ── Meta ──

const maxMeta: ChannelMeta = {
  id: "max",
  label: "MAX",
  selectionLabel: "MAX Messenger",
  docsPath: "/channels/max",
  blurb: "MAX messenger bot via platform-api.max.ru. Supports DMs, groups, inline keyboards.",
  order: 50,
  aliases: ["max-messenger"],
};

// ── Channel Plugin ──

export const maxPlugin: ChannelPlugin<ResolvedMaxAccount> = {
  id: "max",
  meta: maxMeta,

  capabilities: {
    chatTypes: ["direct", "group", "channel"],
    reactions: false,
    threads: false,
    media: true,
    nativeCommands: false,
    blockStreaming: true,
    edit: true,
    polls: false,
  },

  reload: { configPrefixes: ["channels.max"] },

  config: {
    listAccountIds: (cfg) => listMaxAccountIds(cfg),
    resolveAccount: (cfg, accountId) => resolveMaxAccount({ cfg, accountId }),
    defaultAccountId: () => DEFAULT_ACCOUNT_ID,

    setAccountEnabled: ({ cfg, accountId, enabled }) =>
      setAccountEnabledInConfigSection({
        cfg,
        sectionKey: "max",
        accountId,
        enabled,
        allowTopLevel: true,
      }),

    deleteAccount: ({ cfg, accountId }) =>
      deleteAccountFromConfigSection({
        cfg,
        sectionKey: "max",
        accountId,
        clearBaseFields: ["botToken", "tokenFile", "name"],
      }),

    isConfigured: (account) => Boolean(account.token?.trim()),

    describeAccount: (account) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(account.token?.trim()),
      tokenSource: account.tokenSource,
    }),

    resolveAllowFrom: ({ cfg, accountId }) =>
      (resolveMaxAccount({ cfg, accountId }).config.allowFrom ?? []).map(String),

    formatAllowFrom: ({ allowFrom }) =>
      allowFrom
        .map((entry) => String(entry).trim())
        .filter(Boolean)
        .map((entry) => entry.replace(/^max:/i, "")),
  },

  security: {
    resolveDmPolicy: ({ cfg, accountId, account }) => {
      const resolvedAccountId = accountId ?? account.accountId ?? DEFAULT_ACCOUNT_ID;
      const maxSection = (cfg.channels as Record<string, unknown>)?.max as Record<string, unknown> | undefined;
      const useAccountPath = Boolean(
        (maxSection?.accounts as Record<string, unknown>)?.[resolvedAccountId],
      );
      const basePath = useAccountPath
        ? `channels.max.accounts.${resolvedAccountId}.`
        : "channels.max.";
      return {
        policy: account.config.dmPolicy ?? "pairing",
        allowFrom: account.config.allowFrom ?? [],
        policyPath: `${basePath}dmPolicy`,
        allowFromPath: basePath,
        approveHint: formatPairingApproveHint("max"),
        normalizeEntry: (raw: string) => raw.replace(/^max:/i, ""),
      };
    },
  },

  pairing: {
    idLabel: "maxUserId",
    normalizeAllowEntry: (entry) => entry.replace(/^max:/i, ""),
    notifyApproval: async ({ cfg, id }) => {
      const account = resolveMaxAccount({ cfg });
      if (!account.token) throw new Error("MAX bot token not configured");
      await sendMaxMessage(id, PAIRING_APPROVED_MESSAGE, { token: account.token });
    },
  },

  threading: {
    resolveReplyToMode: () => "first",
  },

  messaging: {
    normalizeTarget: (raw) => {
      const trimmed = raw.trim();
      // MAX uses numeric IDs
      if (/^-?\d+$/.test(trimmed)) return trimmed;
      return undefined;
    },
    targetResolver: {
      looksLikeId: (raw) => /^-?\d+$/.test(raw.trim()),
      hint: "<chatId|userId>",
    },
  },

  outbound: {
    deliveryMode: "direct",
    chunker: (text, limit) => getMaxRuntime().channel.text.chunkMarkdownText(text, limit),
    chunkerMode: "markdown",
    textChunkLimit: 4000,

    sendText: async ({ to, text, accountId, replyToId }) => {
      const cfg = await getMaxRuntime().config.loadConfig();
      const account = resolveMaxAccount({ cfg, accountId });
      if (!account.token) throw new Error("MAX bot token not configured");

      const result = await sendMaxMessage(to, text, {
        token: account.token,
        replyToMessageId: replyToId ?? undefined,
        format: "markdown",
      });

      return {
        channel: "max",
        messageId: result.messageId,
      };
    },

    sendMedia: async ({ to, text, mediaUrl, accountId, replyToId }) => {
      // For now, send media URL as text. Full media upload can be added later.
      const cfg = await getMaxRuntime().config.loadConfig();
      const account = resolveMaxAccount({ cfg, accountId });
      if (!account.token) throw new Error("MAX bot token not configured");

      const fullText = mediaUrl ? `${text}\n${mediaUrl}`.trim() : text;
      const result = await sendMaxMessage(to, fullText, {
        token: account.token,
        replyToMessageId: replyToId ?? undefined,
      });

      return {
        channel: "max",
        messageId: result.messageId,
      };
    },
  },

  setup: {
    resolveAccountId: ({ accountId }) => normalizeAccountId(accountId),

    applyAccountName: ({ cfg, accountId, name }) =>
      applyAccountNameToChannelSection({
        cfg,
        channelKey: "max",
        accountId,
        name,
      }),

    validateInput: ({ accountId, input }) => {
      if (input.useEnv && accountId !== DEFAULT_ACCOUNT_ID) {
        return "MAX_BOT_TOKEN can only be used for the default account.";
      }
      if (!input.useEnv && !input.token && !input.tokenFile) {
        return "MAX requires --token or --token-file (or --use-env with MAX_BOT_TOKEN).";
      }
      return null;
    },

    applyAccountConfig: ({ cfg, accountId, input }) => {
      const namedConfig = applyAccountNameToChannelSection({
        cfg,
        channelKey: "max",
        accountId,
        name: input.name,
      });
      const next =
        accountId !== DEFAULT_ACCOUNT_ID
          ? migrateBaseNameToDefaultAccount({
              cfg: namedConfig,
              channelKey: "max",
            })
          : namedConfig;

      if (accountId === DEFAULT_ACCOUNT_ID) {
        return {
          ...next,
          channels: {
            ...next.channels,
            max: {
              ...(next.channels as Record<string, unknown>)?.max as Record<string, unknown>,
              enabled: true,
              ...(input.useEnv
                ? {}
                : input.token
                  ? { botToken: input.token }
                  : {}),
            },
          },
        };
      }

      const maxSection = (next.channels as Record<string, unknown>)?.max as Record<string, unknown> ?? {};
      return {
        ...next,
        channels: {
          ...next.channels,
          max: {
            ...maxSection,
            enabled: true,
            accounts: {
              ...(maxSection.accounts as Record<string, unknown>),
              [accountId]: {
                ...((maxSection.accounts as Record<string, unknown>)?.[accountId] as Record<string, unknown>),
                enabled: true,
                ...(input.token ? { botToken: input.token } : {}),
              },
            },
          },
        },
      };
    },
  },

  status: {
    defaultRuntime: {
      accountId: DEFAULT_ACCOUNT_ID,
      running: false,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
    },

    buildChannelSummary: ({ snapshot }) => ({
      configured: snapshot.configured ?? false,
      tokenSource: snapshot.tokenSource ?? "none",
      running: snapshot.running ?? false,
      lastStartAt: snapshot.lastStartAt ?? null,
      lastStopAt: snapshot.lastStopAt ?? null,
      lastError: snapshot.lastError ?? null,
      probe: snapshot.probe,
    }),

    probeAccount: async ({ account, timeoutMs }) => {
      if (!account.token) return { ok: false, error: "no token" };
      const api = new MaxApi({ token: account.token, timeoutMs });
      try {
        const me = await api.getMe();
        return { ok: true, bot: me };
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    },

    buildAccountSnapshot: ({ account, runtime, probe }) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(account.token?.trim()),
      tokenSource: account.tokenSource,
      running: runtime?.running ?? false,
      lastStartAt: runtime?.lastStartAt ?? null,
      lastStopAt: runtime?.lastStopAt ?? null,
      lastError: runtime?.lastError ?? null,
      probe,
      lastInboundAt: runtime?.lastInboundAt ?? null,
      lastOutboundAt: runtime?.lastOutboundAt ?? null,
    }),
  },

  gateway: {
    startAccount: async (ctx) => {
      const account = ctx.account;
      const token = account.token.trim();

      let botLabel = "";
      let botUserId: number | undefined;
      let botUsername: string | undefined;
      try {
        const probeApi = new MaxApi({ token, timeoutMs: 3000 });
        const me = await probeApi.getMe();
        if (me.username) {
          botLabel = ` (@${me.username})`;
          botUsername = me.username;
        }
        botUserId = me.user_id;
      } catch {
        // probe failed, continue anyway
      }

      ctx.log?.info(`[${account.accountId}] Starting MAX provider${botLabel}`);

      const api = new MaxApi({ token });
      return startMaxPolling({
        api,
        account,
        config: ctx.cfg,
        abortSignal: ctx.abortSignal,
        botUserId,
        botUsername,
        log: ctx.log,
        statusSink: (patch) => {
          const current = ctx.getStatus();
          ctx.setStatus({ ...current, ...patch });
        },
      });
    },

    logoutAccount: async ({ accountId, cfg }) => {
      const nextCfg = { ...cfg } as OpenClawConfig;
      const channels = { ...(nextCfg.channels as Record<string, unknown>) };
      const maxSection = channels.max ? { ...(channels.max as Record<string, unknown>) } : undefined;
      let cleared = false;

      if (maxSection) {
        if (accountId === DEFAULT_ACCOUNT_ID && maxSection.botToken) {
          delete maxSection.botToken;
          cleared = true;
        }

        const accounts = maxSection.accounts as Record<string, unknown> | undefined;
        if (accounts && accountId in accounts) {
          delete (accounts as Record<string, unknown>)[accountId];
          cleared = true;
        }

        channels.max = maxSection;
        nextCfg.channels = channels;

        if (cleared) {
          await getMaxRuntime().config.writeConfigFile(nextCfg);
        }
      }

      return { cleared, loggedOut: cleared };
    },
  },

  // Inline keyboard support via actions
  actions: {
    supportsButtons: () => true,
  },
};
