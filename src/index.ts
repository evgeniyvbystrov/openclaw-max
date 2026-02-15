/**
 * openclaw-max — MAX messenger channel plugin for OpenClaw.
 *
 * Entry point: registers the MAX channel with the OpenClaw plugin system.
 */

import type { ChannelPlugin, OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { maxPlugin } from "./channel.js";
import { setMaxRuntime } from "./runtime.js";

const plugin = {
  id: "max",
  name: "MAX Messenger",
  description: "MAX messenger channel plugin for OpenClaw",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    setMaxRuntime(api.runtime);
    api.registerChannel({ plugin: maxPlugin as ChannelPlugin });
  },
};

export default plugin;
