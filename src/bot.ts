import { Bot, Context, Inject } from "@satorijs/core";
import { SynologyConfig } from "./config";
import SynologyAdapter from "./adapter";
import { Internal } from "./internal";
import { SynologyMessageEncoder } from "./message";

export default class SynologyBot extends Bot<Context, SynologyConfig.Config> {
  static MessageEncoder = SynologyMessageEncoder;
  static inject = ["server", "http"];

  constructor(ctx: Context, config: SynologyConfig.Config) {
    super(ctx, config, "synology");
    this.platform = "synology";
    this.selfId = "007";
    ctx.plugin(SynologyAdapter, this);
    this.internal = new Internal(this);
  }
}
