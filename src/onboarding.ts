/**
 * MAX channel onboarding adapter — wizard for `openclaw channel add max`
 */

import type { OpenClawConfig, DmPolicy } from "openclaw/plugin-sdk";
import {
  addWildcardAllowFrom,
  formatDocsLink,
  promptAccountId,
  type ChannelOnboardingAdapter,
  type ChannelOnboardingDmPolicy,
  type WizardPrompter,
  DEFAULT_ACCOUNT_ID,
  normalizeAccountId,
  migrateBaseNameToDefaultAccount,
} from "openclaw/plugin-sdk";
import {
  listMaxAccountIds,
  resolveDefaultMaxAccountId,
  resolveMaxAccount,
} from "./accounts.js";
import { MaxApi } from "./api.js";

const channel = "max" as const;

const ENV_MAX_BOT_TOKEN = "MAX_BOT_TOKEN";

function setMaxDmPolicy(cfg: OpenClawConfig, policy: DmPolicy) {
  const allowFrom =
    policy === "open"
      ? addWildcardAllowFrom(cfg.channels?.["max"]?.allowFrom)
      : undefined;
  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      max: {
        ...cfg.channels?.["max"],
        dmPolicy: policy,
        ...(allowFrom ? { allowFrom } : {}),
      },
    },
  };
}

function parseAllowFromInput(raw: string): string[] {
  return raw
    .split(/[\n,;]+/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function promptAllowFrom(params: {
  cfg: OpenClawConfig;
  prompter: WizardPrompter;
}): Promise<OpenClawConfig> {
  const current = params.cfg.channels?.["max"]?.allowFrom ?? [];
  const entry = await params.prompter.text({
    message: "MAX allowFrom (user ID)",
    placeholder: "12345678, 87654321",
    initialValue: current[0] ? String(current[0]) : undefined,
    validate: (value) => (String(value ?? "").trim() ? undefined : "Required"),
  });
  const parts = parseAllowFromInput(String(entry));
  const unique = [...new Set(parts)];
  return {
    ...params.cfg,
    channels: {
      ...params.cfg.channels,
      max: {
        ...params.cfg.channels?.["max"],
        enabled: true,
        dmPolicy: "allowlist",
        allowFrom: unique,
      },
    },
  };
}

const dmPolicy: ChannelOnboardingDmPolicy = {
  label: "MAX",
  channel,
  policyKey: "channels.max.dmPolicy",
  allowFromKey: "channels.max.allowFrom",
  getCurrent: (cfg) => cfg.channels?.["max"]?.dmPolicy ?? "pairing",
  setPolicy: (cfg, policy) => setMaxDmPolicy(cfg, policy),
  promptAllowFrom,
};

function applyAccountConfig(params: {
  cfg: OpenClawConfig;
  accountId: string;
  patch: Record<string, unknown>;
}): OpenClawConfig {
  const { cfg, accountId, patch } = params;
  if (accountId === DEFAULT_ACCOUNT_ID) {
    return {
      ...cfg,
      channels: {
        ...cfg.channels,
        max: {
          ...cfg.channels?.["max"],
          enabled: true,
          ...patch,
        },
      },
    };
  }
  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      max: {
        ...cfg.channels?.["max"],
        enabled: true,
        accounts: {
          ...cfg.channels?.["max"]?.accounts,
          [accountId]: {
            ...cfg.channels?.["max"]?.accounts?.[accountId],
            enabled: true,
            ...patch,
          },
        },
      },
    },
  };
}

async function promptCredentials(params: {
  cfg: OpenClawConfig;
  prompter: WizardPrompter;
  accountId: string;
}): Promise<OpenClawConfig> {
  const { cfg, prompter, accountId } = params;
  const envReady =
    accountId === DEFAULT_ACCOUNT_ID && Boolean(process.env[ENV_MAX_BOT_TOKEN]);
  
  if (envReady) {
    const useEnv = await prompter.confirm({
      message: "Use MAX_BOT_TOKEN env var?",
      initialValue: true,
    });
    if (useEnv) {
      return applyAccountConfig({ cfg, accountId, patch: {} });
    }
  }

  const method = await prompter.select({
    message: "MAX bot token method",
    options: [
      { value: "inline", label: "Paste bot token" },
      { value: "file", label: "Token file path" },
    ],
    initialValue: "inline",
  });

  if (method === "file") {
    const path = await prompter.text({
      message: "Token file path",
      placeholder: "/path/to/max-token.txt",
      validate: (value) => (String(value ?? "").trim() ? undefined : "Required"),
    });
    return applyAccountConfig({
      cfg,
      accountId,
      patch: { tokenFile: String(path).trim() },
    });
  }

  const token = await prompter.text({
    message: "MAX bot token",
    placeholder: "your-max-bot-token-here",
    validate: (value) => (String(value ?? "").trim() ? undefined : "Required"),
  });
  
  // Verify token by calling GET /me
  const tokenValue = String(token).trim();
  try {
    const api = new MaxApi({ token: tokenValue, timeoutMs: 5000 });
    const me = await api.getMe();
    await prompter.note(
      `✓ Token verified! Bot: ${me.first_name}${me.username ? ` (@${me.username})` : ""} (ID: ${me.user_id})`,
      "Success"
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const retry = await prompter.confirm({
      message: `Token verification failed: ${errorMsg}\n\nContinue anyway?`,
      initialValue: false,
    });
    if (!retry) {
      throw new Error("Token verification failed");
    }
  }

  return applyAccountConfig({
    cfg,
    accountId,
    patch: { botToken: tokenValue },
  });
}

async function noteMaxSetup(prompter: WizardPrompter) {
  await prompter.note(
    [
      "MAX messenger bot requires a bot token from https://platform-api.max.ru",
      "Create your bot via MAX Business or MAX API portal.",
      "The bot can receive messages via polling (default) or webhook.",
      `Docs: ${formatDocsLink("/channels/max", "channels/max")}`,
    ].join("\n"),
    "MAX setup",
  );
}

export const maxOnboardingAdapter: ChannelOnboardingAdapter = {
  channel,
  dmPolicy,
  getStatus: async ({ cfg }) => {
    const configured = listMaxAccountIds(cfg).some(
      (accountId) => resolveMaxAccount({ cfg, accountId }).tokenSource !== "none",
    );
    return {
      channel,
      configured,
      statusLines: [`MAX: ${configured ? "configured" : "needs bot token"}`],
      selectionHint: configured ? "configured" : "needs auth",
    };
  },
  configure: async ({ cfg, prompter, accountOverrides, shouldPromptAccountIds }) => {
    const override = accountOverrides["max"]?.trim();
    const defaultAccountId = resolveDefaultMaxAccountId(cfg);
    let accountId = override ? normalizeAccountId(override) : defaultAccountId;
    
    if (shouldPromptAccountIds && !override) {
      accountId = await promptAccountId({
        cfg,
        prompter,
        label: "MAX",
        currentId: accountId,
        listAccountIds: listMaxAccountIds,
        defaultAccountId,
      });
    }

    let next = cfg;
    await noteMaxSetup(prompter);
    next = await promptCredentials({ cfg: next, prompter, accountId });

    const namedConfig = migrateBaseNameToDefaultAccount({
      cfg: next,
      channelKey: "max",
    });

    return { cfg: namedConfig, accountId };
  },
};
