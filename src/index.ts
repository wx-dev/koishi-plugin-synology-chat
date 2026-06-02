import { Schema, Context, h } from "@satorijs/core";
import {} from "@koishijs/plugin-server";
import {} from "koishi-plugin-event-server";
import { SynologyConfig } from "./config";
import SynologyBot from "./bot";
import { SynologyPayload } from "./types";

export const name = "synology-chat";
export const inject = ["server", "http"];
// 2. 定义配置 Schema
export const Config: Schema<SynologyConfig.Config> = Schema.object({
  WebhookOutConfigList: Schema.array(
    Schema.object({
      name: Schema.string().description("名称"),
      channelId: Schema.string().description("频道ID"),
      channelName: Schema.string().description("频道名称"),
      token: Schema.string().description("Webhook 令牌"),
      type: Schema.union([
        Schema.const(20).description("频道内专用"),
        Schema.const(30).description("机器人"),
      ])
        .role("select") // 也可以换成下拉菜单（选项多时推荐）
        .description("类型 10频道通用 20频道内专用 30机器人")
        .required(),
      description: Schema.string().description("描述"),
    }),
  )
    .description("Webhook发送配置")
    .default([]),
  WebhookInConfigList: Schema.array(
    Schema.object({
      selfId: Schema.string().description("机器人ID"),
      name: Schema.string().description("名称"),
      token: Schema.string().description("Webhook 令牌"),
      type: Schema.union([
        Schema.const(10).description("频道通用"),
        Schema.const(20).description("频道内专用"),
        Schema.const(30).description("机器人"),
      ])
        .role("select")
        .description("类型 10频道通用 20频道内专用 30机器人")
        .required(),
      description: Schema.string().description("描述"),
    }),
  )
    .description("Webhook接收配置")
    .default([]),
  host: Schema.string().description(
    "群晖 Chat 地址 (如 http://192.168.1.100:5000)",
  ),
  path: Schema.string()
    .description("Webhook 路径")
    .default("/synology-webhook"),
});

// 显式导出 apply 函数
export function apply(ctx: Context, config: SynologyConfig.Config) {
  console.log("Synology Chat Plugin Loaded");
  ctx.plugin(SynologyBot, config);
  console.log("Synology Chat Plugin Loaded End");
  // 监听群晖 Chat 的交互回调事件
  ctx.on("synology/interaction", (session) => {
    console.log("收到交互回调:", session);
    session.send(`测试${h("at", {
      id: "4",
      name: "smile",
    })}`);
  });
  ctx.on("message", (session) => {
    if (session.content === "天王盖地虎") {
      session.send(
        h("a", {href: "https://nas.6543212.xyz:5001"}, "NAS")
      );
    }
  });
}
