export type {
  EventHandler,
  EventName,
  EventPayload,
  EventPayloadArgs,
  EventPayloadMap,
  Unsubscribe
} from "./event-bus";
export { EventBus } from "./event-bus";

export interface PackageMetadata {
  readonly name: string;
  readonly layer: "core" | "engine" | "plugin" | "shared";
}

export const CORE_PACKAGE_METADATA: PackageMetadata = {
  name: "@gallery-engine/core",
  layer: "core"
};
