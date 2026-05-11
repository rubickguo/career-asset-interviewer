# 职业资产工作台

这是 `career-asset-interviewer` 的本地网页原型。它承接的是“先完全了解用户，再生成职业表达资产”的产品形态，不是普通 AI 简历润色器。

```text
网页负责上传、输入、展示、预览和导出
后端负责解析、状态、模型调用、文件资产和 HTML/PDF 生成
skill 负责职业深访、项目证据、简历策略、JD 和个人网站的方法论
```

完整产品设计见 [PRD.zh-CN.md](./PRD.zh-CN.md)。

## 启动

```bash
cd career-web
npm install
npm run dev
```

默认地址：

- 前端页面：http://127.0.0.1:5173
- 本地 API：http://127.0.0.1:5174

## 目录

```text
career-web/
├── src/                  # React 前端
├── server/               # 本地 Express API
├── workspace/
│   ├── career-assets/    # 用户画像、方向、关键词、项目卡等长期资产
│   ├── agent-tasks/      # 网页生成、等待 Codex 处理的任务
│   ├── agent-results/    # Codex 写回的结果
│   ├── auth/             # 登录 session、短信验证码记录，本地保存，不提交 Git
│   ├── sessions/         # 按匿名 session 或登录用户隔离的工作区
│   ├── uploads/          # 简历输入等原始资料
│   └── exports/          # 后续简历 HTML/PDF、个人网站预览等导出物
└── package.json
```

`workspace/` 下的用户数据默认不提交到 Git，只保留 `.gitkeep`。

## 当前流程

1. 在网页里上传 PDF 或 DOCX 简历。
2. 本地 API 自动解析简历，并写入 `workspace/uploads/resume-extracted.txt` 和 `workspace/uploads/resume-source.md`。
3. 点击“开始第一轮深访”，调用 DeepSeek 生成职业方向判断和下一轮问题。
4. 用户在网页里回答问题，继续职业方向深访。
5. 方向清楚后，运行项目证据提炼和简历策略。
6. 简历先生成 HTML 预览，再导出 PDF，并生成版式检查报告。
7. JD 匹配和个人网站是可选流程，只有用户明确需要时才运行。

## 标准化解析

PDF/DOCX 解析是确定性预处理，不依赖 LLM：

- PDF：`pdf-parse`
- DOCX：`mammoth`

也可以命令行单独解析：

```bash
node scripts/parse-resume.mjs workspace/uploads/resume-original.pdf workspace/uploads/resume-extracted.txt
```

## 产品边界

- 主流程是：职业方向深访 -> 简历素材构建。
- JD 匹配和个人网站是可选附加流程。
- 当前版本已支持本地后端调用 DeepSeek，不需要每一步再让用户手动找 Codex 处理。
- 用户隐私数据都在 `workspace/`，默认不提交到 Git。
- 已有轻量 session 隔离：匿名用户按浏览器 session id 隔离；登录后按手机号 hash 派生的稳定用户目录隔离。
- 外放前仍需要补额度、缓存、限流、数据删除能力和正式安全审计。

## 登录与用户隔离

当前主路径是手机号验证码登录：

- 本地测试：没有配置阿里云短信时，`SMS_DEV_LOGIN_ENABLED=true` 会返回本地测试验证码，便于验证 cookie session 和用户隔离。
- 线上短信：推荐使用阿里云「短信认证服务」而不是普通短信服务。当前账号已开通的赠送签名为 `速通互联验证码`，模板 Code 为 `100001`，无需企业短信签名资质。
- 登录后：后端只用手机号 hash 建立用户工作区，不把明文手机号写进用户 workspace。

关键环境变量见 `.env.example`。正式外放建议：

```bash
AUTH_REQUIRE_LOGIN=true
AUTH_SESSION_SECRET=一段足够长的随机字符串
AUTH_COOKIE_SECURE=true
APP_ORIGIN=https://你的域名
PHONE_LOGIN_ENABLED=true
SMS_DEV_LOGIN_ENABLED=false
ALIYUN_SMS_PROVIDER=aliyun_verify
ALIYUN_ACCESS_KEY_ID=你的阿里云 AccessKey
ALIYUN_ACCESS_KEY_SECRET=你的阿里云 AccessKey Secret
ALIYUN_SMS_SIGN_NAME=速通互联验证码
ALIYUN_SMS_TEMPLATE_CODE=100001
ALIYUN_SMS_TEMPLATE_PARAM={"code":"##code##","min":"10"}
ALIYUN_SMS_ENDPOINT=https://dypnsapi.aliyuncs.com
```
