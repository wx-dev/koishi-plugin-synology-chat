import { Dict, h, MessageEncoder,Context } from "@satorijs/core";
import SynologyBot from "./bot";
import { SynologyChatSendMessageResponse } from "./types";
import { decodeMessage } from "./utils";
export class SynologyMessageEncoder extends MessageEncoder<
  Context,
  SynologyBot
> {
  private payload: Dict = {};
  private logger = this.bot.ctx.logger("synologyMessageEncoder");
  async prepare() {
    this.payload = { channelId: this.channelId, text: "" };
  }
  // 将发送好的消息添加到 results 中
  async addResult(response: SynologyChatSendMessageResponse[]) {
    const session = this.bot.session();
    const message = await decodeMessage(
      this.bot,
      response,
      (session.event.message = {}),
      session.event,
    );
    session.event._data ??= {};
    session.event._data.message = response;
    session.app.emit(session, "send", session);
    this.results.push(session.event.message);
    return message;
  }

  async flush(): Promise<void> {
    let response: SynologyChatSendMessageResponse[] | null = null;
    if (this.payload.text) {
      response = await this.bot.internal.sendMessage(this.payload);
    }
    if (response != null) {
      await this.addResult(response);
    }
    this.payload.text = "";
  }
  // 遍历并翻译 Koishi 的标准消息元素
  async visit(element: h) {
    const { type, attrs, children } = element;
    if (type === "text") {
      //纯文本处理：群晖的 Markdown 需要对 * _ ~ ` [ ] ( ) 等特殊符号进行转义
      //防止用户输入的普通文本被误解析为格式代码
      this.payload.text += h.escape(attrs.content);
    } else if (type === "b" || type === "strong") {
      //粗体 <b> -> *内容*
      this.payload.text += "*";
      await this.render(children);
      this.payload.text += "*";
    } else if (type === "i" || type === "em") {
      //斜体 <i> -> _内容_
      this.payload.text += "_";
      await this.render(children);
      this.payload.text += "_";
    } else if (type === "s" || type === "del") {
      // 删除线 <del> -> ~内容~
      this.payload.text += "~";
      await this.render(children);
      this.payload.text += "~";
    } else if (type === "code") {
      //行内代码 <code> -> `内容`
      this.payload.text += "```";
      await this.render(children);
      this.payload.text += "```";
    }else if (type === "quote") {
      //引用 <quote> -> 提取纯文本，并在每一行前面加上 >
      // 先递归渲染出内部的纯文本内容
      const textBuffer = [];
      const tempEncoder = { text: "" };
      // 这里借用一个简单的技巧：临时渲染子元素到临时变量中
      // 实际开发中也可以直接提取 children 中的 text 元素
      for (const child of children) {
        if (child.type === "text") textBuffer.push(child.attrs.content);
      }
      const rawText = textBuffer.join("");
      // 为每一行添加 > 前缀
      const quotedText = rawText
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
      this.payload.text += quotedText;
    } else if (type === "a") {
      //超链接 <a> -> <链接地址|显示文本>
      const url = attrs.href;
      const text = children[0]?.attrs?.content || url; // 如果没有显示文本，则直接显示链接
      this.payload.text += `<${url}|${text}>`;
    } else if (type === "at") {
      // 9. 提醒 <at>
      if (attrs.type === "all") {
        this.payload.text += "@channel"; // 提醒频道所有人
      } else if (attrs.type === "here") {
        this.payload.text += "@here"; // 提醒在线的人
      } else if (attrs.id) {
        // 提醒特定用户（群晖通常直接显示为 @用户ID 或 @用户名）
        this.payload.text += `@u${attrs.id}`;
      }
    } else {
      // 10. 其他未明确支持的元素（如图片、表情等），尝试递归处理其子元素
      await this.render(children);
    }
  }
}
