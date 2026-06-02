import { Session, Context } from "koishi";

declare module "koishi" {
  interface Events {
    "synology/interaction"(seesion: Session<never, never, Context>): void;
  }
}

// 群晖 Chat Webhook 传递过来的原始 Payload 结构
export interface SynologyPayload {
  token?: string;
  user_id: string;
  username: string;
  text?: string;
  post_id: string;
  channel_id?: string;
  channel_name?: string;
  timestamp?: string;
  trigger_word?: string;

  // 预留：如果是交互事件（如按钮点击），可能会包含 actions 或 callback_id
  actions?: any[];
  callback_id?: string;
  user?: {
    user_id: string;
    username: string;
  };

  // 允许接收其他未知字段
  [key: string]: any;
}

// types.ts
export interface SynologySendPayload {
  text: string;
  user_ids?: number | string[]; // 可选属性
  channel_id?: number | string; // 可选属性
  [key: string]: any; // 允许其他任意属性
}

export interface SynologyAction {
  type: "button";
  name: string;
  value: string;
  text: string;
  style: "green" | "grey" | "red" | "orange" | "blue" | "teal";
}

/**
 * 1. 基础通用响应结构
 * 无论请求成功还是失败，最外层的包裹结构通常保持一致
 */
export interface SynologyChatBaseResponse {
  success: boolean; // 请求是否成功
}

/**
 * 2. 失败时的错误详情结构
 * 当 success 为 false 时，error 字段会包含具体的错误码和原因
 */
export interface SynologyChatError {
  code: number; // 错误代码，例如 100, 101, 102 等
  errors?: Record<string, string>; // 具体的错误原因，如 { "token": "Invalid token" }
}

/**
 * 3. 完整的失败响应类型
 */
export interface SynologyChatErrorResponse extends SynologyChatBaseResponse {
  success: false;
  error: SynologyChatError;
}

/**
 * 4. 发送消息成功的响应类型（示例）
 * 如果你调用的是发送消息接口，成功时通常会返回消息的唯一 ID
 */
export interface SynologyChatSendMessageSuccess extends SynologyChatBaseResponse {
  success: true;
  data?: {
    fail: string | null;
    succ: {
      user_id_post_map: Record<string, string>;
    };
  };
}

/**
 * 5. 综合响应联合类型（推荐使用）
 * 在封装 Axios 或 Fetch 请求时，可以直接将返回数据断言为该类型
 * 这样在代码中可以通过 if (res.success) 来自动收窄类型
 */
export type SynologyChatSendMessageResponse =
  | SynologyChatSendMessageSuccess
  | SynologyChatErrorResponse;
