import {
  getWebhookInConfigBySelfId,
  getWebhookOutConfigByChannelId,
} from "./utils";
import SynologyBot from "./bot";
import { Dict } from "@satorijs/core";
import { SynologyChatSendMessageResponse, SynologySendPayload } from "./types";
export class Internal {
  constructor(private bot: SynologyBot) {}
  /**
   * 发送消息给群晖 Chat
   */
  async sendMessage(payload: Dict) {
    const { config, selfId } = this.bot;
    const { channelId, text, buttons } = payload;

    if (!channelId || !text) {
      this.bot.ctx.logger.error("发送消息失败，缺少 channelId 或 text 字段");
      throw new Error("Missing channelId or text in payload");
    }

    const logger = this.bot.ctx.logger;
    logger.info(`准备发送消息给 ${channelId}: ${text}`);

    const webhookInConfig = getWebhookInConfigBySelfId(config, selfId);
    if (webhookInConfig == undefined) {
      logger.error("bot的selfId错误:%s", selfId);
      throw new Error("error selfId");
    }
    // 解析 channelId，提取真实的 ID
    // 这里假设 channelId 格式为 synology-user-123 或 synology-channel-456
    let targetKey: "user_ids" | "channel_id";
    let targetValue: string;

    if (channelId.startsWith("synology-user-")) {
      targetKey = "user_ids";
      targetValue = channelId.replace("synology-user-", "");
    } else if (channelId.startsWith("synology-channel-")) {
      targetKey = "channel_id";
      targetValue = channelId.replace("synology-channel-", "");
    } else {
      throw new Error(`Invalid channelId format: ${channelId}`);
    }
    let token;
    if (webhookInConfig.type == 30) {
      token = webhookInConfig.token;
    } else {
      const webhookOutConfig = getWebhookOutConfigByChannelId(
        config,
        targetValue,
      );
      if (webhookOutConfig == undefined) {
        logger.error("error selfId");
        throw new Error("error selfId");
      }
      token = webhookOutConfig.token;
    }

    // 2. 构建群晖 API 需要的 payload 对象
    const payloadObj: SynologySendPayload = {
      text: text,
    };

    // 根据目标是用户还是频道，添加对应的字段
    if (targetKey === "user_ids") {
      // 发送给用户，需要数组
      payloadObj["user_ids"] = [targetValue];
    } else {
      // 发送给频道，直接字符串/数字
      payloadObj["channel_id"] = targetValue;
    }
    // 如果解析出了按钮，则组装 attachments 字段
    if (buttons?.length > 0) {
      payloadObj["attachments"] = [
        {
          callback_id: "callback_id_" + Date.now(), // 可选，回调 ID 用于识别交互事件
          text: "交互操作",
          actions: buttons,
        },
      ];
    }

    // 3. 构建最终的请求参数
    // 群晖 API 要求参数是 form-data 或 x-www-form-urlencoded，且包含一个名为 'payload' 的字段
    // 该字段的值是 JSON 字符串
    const formParams = new URLSearchParams();
    formParams.append("payload", JSON.stringify(payloadObj));

    const url = `${config.host}/webapi/entry.cgi`;
    const queryParams = new URLSearchParams();
    queryParams.append("api", "SYNO.Chat.External");

    if (webhookInConfig.type == 30) {
      //机器人回复
      queryParams.append("method", "chatbot");
    } else {
      //频道
      queryParams.append("method", "incoming");
    }

    queryParams.append("version", "2");
    queryParams.append("token", '"' + token + '"'); // 确保 token 在 URL 参数中

    const fullUrl = `${url}?${queryParams.toString()}`;
    logger.info(`payload: %o`, payloadObj);
    try {
      // 4. 发送 POST 请求
      const res = await this.bot.ctx.http.post<SynologyChatSendMessageResponse>(
        fullUrl,
        formParams,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );
      if ("error" in res) {
        const errorCode = res.error.code;
        logger.error(`消息发送失败,错误码: ${errorCode}`, res);
        if (errorCode === 100) {
          logger.error("请检查你的 Webhook Token 是否正确！");
        }
      } else {
        logger.info(`消息发送成功: %o`, res);
      }
      return [res];
    } catch (error) {
      if (error instanceof Error) {
        logger.error("发送消息失败 (捕获到 Error 实例):", error);
      } else if (
        typeof error === "object" &&
        error !== null &&
        "message" in error
      ) {
        // 处理某些 HTTP 库抛出的非 Error 实例的错误对象
        logger.error("发送消息失败 (捕获到错误对象):", (error as any).message);
      } else {
        logger.error("发送消息失败 (未知错误):", error);
      }
      throw error;
    }
  }
}
