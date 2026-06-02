import { SynologyConfig } from "./config";
import { SynologyPayload } from "./types";
import SynologyBot from "./bot";
import { h, Universal, Dict } from "koishi";
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
  const { user_id, username, text = "", post_id, channel_id, user } = payload;

  const hArray = convertSynologyChatToHArray(text);
  const content = hArray.join("");

  const elements = h.parse(content);

  return bot.session({
    type: "message",
    platform: "synology",
    user: {
      id: String(user?.user_id ?? user_id),
      name: user?.username || username,
      nickname: user?.username ?? username,
      avatar: "",
      isBot: false,
    },
    channel: {
      id: channel_id
        ? `synology-channel-${channel_id}`
        : `synology-user-${String(user?.user_id ?? user_id)}`,
      type: channel_id
        ? Universal.Channel.Type.TEXT
        : Universal.Channel.Type.DIRECT,
    },
    guild: {
      id: channel_id
        ? `synology-guild-${channel_id}`
        : `synology-user-${String(user?.user_id ?? user_id)}`,
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
  requestPayload: Dict,
) {
  const logger = bot.ctx.logger("synologyBotDecodeMessage");
  // 1. 安全地获取第一条响应数据
  const res = response?.[0];
  if (!res || !res.success) {
    logger.warn("Synology Chat API response failed or is empty:", res);
    return;
  }

  const segments: h[] = [];
  const responseData = res.data;

  // 2. 情况一：API 返回了成功，但没有具体的消息详情
  if (!responseData || !responseData.succ?.user_id_post_map) {
    // 使用当前时间戳或随机数生成一个本地唯一的 message_id
    message.id = String(Date.now());

    const contentText = "消息发送成功";
    segments.push(h.text(contentText));
    message.elements = segments;
    message.content = segments.join("");
    message.timestamp = Date.now();
    return message;
  }

  // 3. 情况二：API 返回了详细的发送结果（包含用户ID和帖子ID的映射）
  // 遍历真实的 user_id_post_map，而不是硬编码某个 ID
  const userIdPostMap = responseData.succ.user_id_post_map;
  for (const [userId, postId] of Object.entries(userIdPostMap)) {
    logger.info(`成功发送给用户 ${userId}，帖子ID: ${postId}`);
    // 这里根据你的业务需求拼接返回的内容，比如显示“发送成功，帖子ID: xxx”
    segments.push(h.text(`发送成功 (用户: ${userId}, 帖子: ${postId})\n`));
  }
  // 补全消息对象的标准字段
  message.id = String(Date.now()); // 同样使用本地时间戳作为 ID
  message.elements = segments;
  message.content = segments.join("");
  message.timestamp = Date.now();
  return message;
}
/**
 * 将群晖格式的文本转换为 h 数组
 * @param text
 * @returns
 */
function convertSynologyChatToHArray(text: string): ReturnType<typeof h>[] {
  const lines = text.split("\n");
  const result: ReturnType<typeof h>[] = [];

  // 优化后的正则：
  // 1. 移除了标准 Markdown 链接，只保留群晖特有的 <url|text>
  // 2. 限制粗体(*)和斜体(_)不能跨行，且必须包裹实际内容
  const tokenRegex =
    /```([\s\S]*?)```|`([^`]+)`|<((?:https?|ftp):\/\/[^>|]+)\|([^>]+)>|@u:(\d+)|(@channel)|(@here)|(\*)(?!\s)([^*\n]+?)\*(?!\*)|(_)(?!_)([^_\n]+?)_|(~)([^~\n]+?)~|(:\w+:)/g;

  for (let line of lines) {
    const trimmedLine = line.trim();

    // 优先处理整行的引用和列表逻辑
    if (trimmedLine.startsWith(">>>")) {
      result.push(h("quote", trimmedLine.substring(3).trim()));
      continue;
    }
    if (trimmedLine.startsWith(">")) {
      result.push(h("quote", trimmedLine.substring(1).trim()));
      continue;
    }
    // 匹配无序列表（以 * 开头，且后面跟着空格）
    if (/^\*\s+/.test(trimmedLine)) {
      const content = trimmedLine.replace(/^\*\s+/, "");
      result.push(h("p", `• ${content}`));
      continue;
    }

    const lineElements: (string | ReturnType<typeof h>)[] = [];
    let lastIndex = 0;
    let match;

    //在每次处理新行之前，强制将正则的 lastIndex 重置为 0
    tokenRegex.lastIndex = 0;

    while ((match = tokenRegex.exec(line)) !== null) {
      // 把匹配到的标记之前的普通文本先推入数组
      if (match.index > lastIndex) {
        lineElements.push(line.substring(lastIndex, match.index));
      }

      const [
        fullMatch,
        codeBlock, // ``` ... ```
        inlineCode, // ` ... `
        linkUrl, // url in <url|text>
        linkText, // text in <url|text>
        atUserId, // @u:123
        atChannel, // @channel
        atHere, // @here
        boldMark, // *
        boldText, // 粗体内容
        italicMark, // _
        italicText, // 斜体内容
        delMark, // ~
        delText, // 删除线内容
        emoji, // :smirk:
      ] = match;

      if (codeBlock) {
        lineElements.push(h("code", codeBlock.trim()));
      } else if (inlineCode) {
        lineElements.push(h("code", inlineCode));
      } else if (linkUrl && linkText) {
        // ✅ 专门处理群晖格式 <https://baidu.com|百度超链接>
        lineElements.push(h("a", { href: linkUrl }, linkText));
      } else if (atUserId) {
        lineElements.push(h("at", { id: atUserId }));
      } else if (atChannel) {
        lineElements.push(h("at", { type: "channel" }));
      } else if (atHere) {
        lineElements.push(h("at", { type: "here" }));
      } else if (boldMark) {
        lineElements.push(h("strong", boldText));
      } else if (italicMark) {
        lineElements.push(h("em", italicText));
      } else if (delMark) {
        lineElements.push(h("s", delText));
      } else if (emoji) {
        //:smirk: 转换为 Satori 的图片或表情元素
        const emojiName = emoji.replace(/:/g, "");
        lineElements.push(
          h("img", {
            src: `https://你的表情CDN地址/${emojiName}.png`, // 替换成你实际的表情包地址
            alt: emoji,
            style:
              "display: inline-block; width: 1.2em; vertical-align: middle;",
          }),
        );
      }

      lastIndex = match.index + fullMatch.length;
    }

    // 把这一行最后剩下的普通文本推入数组
    if (lastIndex < line.length) {
      lineElements.push(line.substring(lastIndex));
    }

    // 将这一行的所有元素包裹在一个 <p> 标签中
    if (lineElements.length > 0) {
      result.push(h("p", {}, ...lineElements));
    }
  }

  // 如果结果只有一个 p 标签，通常直接返回其子元素，避免多余的包裹
  return result.length === 1 && result[0].type === "p"
    ? result[0].children
    : result;
}
