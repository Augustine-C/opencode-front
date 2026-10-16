import type { PluginConfiguration } from "./configuration"

/** Stable compatibility contract shared by the host loader and independently built plugins. */
export const PLUGIN_FORMAT_VERSION = 1 as const;
export const PLUGIN_API_VERSION = 1 as const;
export const PLUGIN_RUNTIME_VERSION = "solid-v1" as const;
export const PLUGIN_RUNTIME_SYMBOL =
  "opencode-front.plugin-runtime.v1" as const;

export const PLUGIN_CAPABILITIES = [
  "session.read",
  "connection.read",
  "events.subscribe",
  "storage.read",
  "storage.write",
  "commands.register",
  "panels.register",
  "slots.register",
  "assets.read",
] as const;

export type PluginCapability = (typeof PLUGIN_CAPABILITIES)[number];
export type IndependentPluginManifest = {
  formatVersion: typeof PLUGIN_FORMAT_VERSION;
  id: string;
  name: string;
  version: string;
  apiVersion: typeof PLUGIN_API_VERSION;
  runtimeVersion: typeof PLUGIN_RUNTIME_VERSION;
  entry: "main.js";
  styles?: string[];
  assets?: string[];
  capabilities: PluginCapability[];
  description?: string;
  author?: string;
  homepage?: string;
  license?: string;
  storageVersion?: number;
  configuration?: PluginConfiguration;
};

export type IndependentPluginModule = {
  setup: import("./index").Definition["setup"];
};
