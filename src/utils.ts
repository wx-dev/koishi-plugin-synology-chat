import { SynologyConfig } from "./config";
import { SynologyPayload } from "./types";
import SynologyBot from "./bot";
import { Context, h, Universal } from "@satorijs/core";
import { SynologyChatSendMessageResponse } from "./types";

/**
 * 根据selfId获取webhook传入配置
 */
export const getWebhookInConfigBySelfId = (
  config: SynologyConfig.Config,
  selfId: string,
) => {
  return config.WebhookInConfigList.find((item) => item.selfId === selfId);
};

/**
 * 根据payload获取webhook传入配置
 */
export const getWebhookInConfigByPayload = (
  config: SynologyConfig.Config,
  payload: SynologyPayload,
) => {
  return config.WebhookInConfigList.find(
    (item) => item.token === payload.token,
  );
};

/**
 * 根据token获取webhook传出配置
 */
export const getWebhookOutConfigByToken = (
  config: SynologyConfig.Config,
  token: string,
) => {
  return config.WebhookOutConfigList.find((item) => item.token === token);
};

/**
 * 根据channelId获取webhook传出配置
 */
export const getWebhookOutConfigByChannelId = (
  config: SynologyConfig.Config,
  channelId: string,
) => {
  return config.WebhookOutConfigList.find(
    (item) => item.channelId === channelId,
  );
};

/**
 * 创建会话
 */
export const createSession = (bot: SynologyBot, payload: SynologyPayload) => {
  const { user_id, username, text = "", post_id, channel_id } = payload;


  const content = text;

  const elements = h.parse(content);

  return bot.session({
    type: "message",
    platform: "synology",
    user: {
      id: String(user_id), // 建议统一转成字符串，防止大数精度丢失
      name: username, // Satori 标准字段是 name
      nickname: username,
      avatar: "",
      isBot: false,
    },
    channel: {
      id: channel_id
        ? `synology-channel-${channel_id}`
        : `synology-user-${user_id}`,
      type: channel_id
        ? Universal.Channel.Type.TEXT
        : Universal.Channel.Type.DIRECT,
    },
    guild: {
      id: channel_id
        ? `synology-guild-${channel_id}`
        : `synology-user-${user_id}`,
    },
    message: {
      id: String(post_id),
      content: content,
      elements,
    },
  });
};

/**
 * 解码消息
 * @param bot
 * @param message
 * @returns
 */
export async function decodeMessage(
  bot: SynologyBot,
  response: SynologyChatSendMessageResponse[],
  message: Universal.Message,
  payload: Universal.MessageLike = message,
) {
  // const res = response[0]
  // if (!res.success) {
  //   return
  // }
  // const segments: h[] = []
  // if(res.data==undefined){
  //   segments.push(h("text",{contenr:"success"}))
  //   message.elements=segments;
  //   message.content=segments.join("");
  //   message.timestamp=Date.now();
  //   return

  // }
  // for (const [key, value] of Object.entries(res.data.succ.user_id_post_map)) {
  //   console.log(`${key}: ${value}`);

  //   segments.push(h("text", { content: res.data.succ.user_id_post_map['4'] }))
  // }

  // console.log(segments)
  // return message;
}
