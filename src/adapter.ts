import { Adapter, h, Context } from "@satorijs/core";
import {} from "@cordisjs/plugin-server";
import SynologyBot from "./bot";
import { SynologyPayload } from "./types";
import { getWebhookInConfigByPayload, createSession } from "./utils";

export default class SynologyAdapter extends Adapter<Context, SynologyBot> {
  static inject = ["server"];

  async connect(bot: SynologyBot) {
    const logger = bot.ctx.logger("synologyAdapter");

    // 注册 HTTP POST 路由
    bot.ctx.server.post("/synology-webhook", async (koa) => {
      const { body } = koa.request;
      let payload: SynologyPayload = body;
      // 【兼容性处理】处理群晖可能的双重编码
      if (typeof body === "string") {
        payload = this.safeParse(body);
      } else if (body?.payload) {
        const inner =
          typeof body.payload === "string"
            ? this.safeParse(body.payload)
            : body.payload;
        payload = { ...body, ...inner };
      }
      logger.info("Received payload: %o", payload);

      const webhookInConfig = getWebhookInConfigByPayload(bot.config, payload);
      if (!webhookInConfig) {
        logger.error("Config not found");
        koa.status = 403;
        return;
      }
      bot.selfId = webhookInConfig.selfId;

      // 【核心】处理消息分发
      try {
        //1. 判断是交互事件 (Interactive) 还是普通消息
        if (payload.actions && Array.isArray(payload.actions)) {
          logger.info("Received interactive callback: %s", payload.callback_id);
          this.ctx.emit("synology/interaction",payload);
          koa.status = 200;
          return;
        }

        // 2. 提取基础字段
        const { user_id, username, text = "", post_id, channel_id } = payload;

        logger.info("Message from %s (%s): %s", username, user_id, text);

        const bot = this.bots[0];
        if (!bot) {
          logger.warn("Bot not found");
          return;
        }

        const session = createSession(bot, payload);
        if (!session) return;
        session.setInternal("synologybot", payload);
        bot.dispatch(session);
        // logger.info("Session dispatched:%o ", session);
        koa.status = 200;
        //可以直接响应回去
        // koa.body = {
        //   token: payload.token,
        //   channel_id: payload.channel_id,
        //   channel_name: payload.channel_name,
        //   text: "收到",
        // };
      } catch (err) {
        logger.error(err);
        koa.status = 500;
      }
    });
  }

  // 安全解析 JSON
  private safeParse(source: string): SynologyPayload {
    return JSON.parse(source);
  }
}
