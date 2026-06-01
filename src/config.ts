export namespace SynologyConfig {
  /**
   * 配置
   * @param WebhookOutConfigList Webhook 输出配置列表
   * @param WebhookInConfigList Webhook 输入配置列表
   * @param host Synology 地址
   * @param path Synology 路径
   */
  export interface Config {
    WebhookOutConfigList:WebhookOutConfig[] ;
    WebhookInConfigList: WebhookInConfig[];
    host: string;
    path: string;
  }

  /**
   * Webhook 发送配置
   * @param name 名称
   * @param channelId 频道ID
   * @param channelName 频道名称
   * @param token Webhook 令牌
   * @param type 类型 20频道内专用 30机器人
   * @param description 描述
   */
   export interface WebhookOutConfig {
    name: string;
    channelId: string;
    channelName?:string;
    token: string;
    type:20|30;
    description?:string;
  }
    /**
   * Webhook 接收配置
   * @param selfId 机器人ID
   * @param name 名称
   * @param token Webhook 令牌
   * @param type 类型 10频道通用 20频道内专用 30机器人
   * @param description 描述
   */
   export interface WebhookInConfig {
    selfId:string;
    name: string;
    token: string;
    type:10|20|30;
    description?:string;
  }


}

