# AI Math Renderer

**AI Math Renderer** 是一个面向 AI 对话网站的浏览器扩展，用于识别网页回答中未被网站正常排版的 LaTeX 数学表达式，并在原页面中使用本地 KaTeX 补充渲染。

当前版本：`0.2.0` · Manifest V3 · Edge / Chrome

## 功能

- **补充渲染 LaTeX**：识别 `$...$`、`$$...$$`、`\\(...\\)`、`\\[...\\]` 等常见定界形式。
- **处理多行公式**：将 `aligned`、`cases`、`matrix`、`equation` 等常见数学环境作为完整公式块识别，避免按行拆散。
- **适配动态回答**：通过 DOM 观察器检查页面中新出现或更新的回答内容。
- **处理内联节点拆分**：先收集候选内容块中的文本，再依据字符位置定位原始文本节点，可处理公式内容被拆到多个内联 DOM 节点的情况。
- **保守识别裸公式**：对独立且基本由数学表达式构成的段落尝试识别未加定界符的 LaTeX，不对普通文字逐行强行补定界符。
- **局部失败隔离**：单个公式遇到 KaTeX 不支持的命令或语法错误时保留原文，不影响同一内容块中的其他公式。
- **按站点控制**：可在扩展弹窗中针对当前网站启用或停用，并手动重新扫描当前页面。

## 支持的网站

当前配置的目标站点包括：

| 网站 | 域名 |
| --- | --- |
| DeepSeek | `deepseek.com` |
| 通义 / 千问 | `tongyi.com`、`qianwen.com` |
| 豆包 | `doubao.com` |
| Kimi | `kimi.com`、`moonshot.cn` |
| 腾讯元宝 | `yuanbao.tencent.com` |
| 智谱清言 / GLM | `chatglm.cn`、`z.ai` |
| Qwen | `qwen.ai` |
| 文心一言 | `yiyan.baidu.com`、`chat.baidu.com` |
| 讯飞星火 | `xinghuo.xfyun.cn` |

> 站点支持由扩展中的域名匹配规则决定。各网站的页面结构可能变化，实际兼容性需要结合对应网站的真实页面持续验证；列入支持列表不代表所有页面和所有公式都能成功识别。

## 安装

本项目当前提供源码目录形式的开发者安装方式。

1. 下载或克隆本仓库，并保留完整项目目录，尤其不要删除 `vendor/katex`。
2. 在 Edge 地址栏打开 `edge://extensions/`，或在 Chrome 中打开 `chrome://extensions/`。
3. 开启“开发人员模式”。
4. 点击“加载解压缩的扩展”，选择本项目根目录（即包含 `manifest.json` 的目录）。
5. 刷新已经打开的 AI 对话网页。

## 使用

1. 在浏览器工具栏中打开 AI Math Renderer。
2. 根据需要启用或停用当前网站的公式补充渲染。
3. 点击“立即重新扫描”，检查当前已经加载的回答。
4. 后续动态生成的回答会由页面观察器自动检查。

## 当前限制

- 目前按候选内容块收集文本，**不会跨多个独立段落或块级 DOM 元素拼接公式**。
- 裸 LaTeX 识别采用保守策略，不能保证识别所有没有定界符的数学表达式。
- 如果网站输出的 LaTeX 本身存在缺失的反斜杠、括号、花括号、命令或其他结构损坏，扩展无法可靠推断原始公式并自动修复。
- KaTeX 不支持的命令或不合法语法不会被强行改写；渲染失败时保留原始文本。
- 已由 KaTeX / MathJax 正常渲染的内容，以及代码块、输入框、SVG 等区域会被跳过。
- 不同网站的 DOM 结构和 Markdown 输出方式不同，兼容性需要逐站测试。

## 隐私与权限

- 数学解析和渲染在本地浏览器中完成，使用随扩展提供的 KaTeX 资源。
- 扩展不调用远程渲染 API，也不会主动上传聊天内容。
- Manifest V3 中声明了 `storage` 权限，以及实现站点适配所需的目标网站权限。

## 开发与测试

需要安装 Node.js。进入项目根目录后执行：

```bash
npm install
npm test
```

当前测试脚本为 `tests/parser-smoke.test.js`，主要覆盖解析器的常见定界符、多行数学环境、跨内联文本节点的公式片段及部分裸公式识别行为。解析器测试通过不等于已经完成所有目标网站的端到端兼容性验证。

## 项目结构

```text
AI-Math-Renderer/
├── manifest.json
├── parser.js
├── content.js
├── content.css
├── popup.html
├── popup.js
├── popup.css
├── vendor/
│   └── katex/          # 本地 KaTeX 运行时及样式
└── tests/
    └── parser-smoke.test.js
```

## License

本项目扩展代码采用 [MIT License](LICENSE)。KaTeX 及其相关文件遵循其自身许可证，详见 `vendor/katex/LICENSE`。
