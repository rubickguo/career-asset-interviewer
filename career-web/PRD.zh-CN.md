# Career Asset OS / 职业资产系统 PRD

## 1. 产品判断

这个产品不应该被定义成“AI 简历优化器”。更准确的定位是：

> 通过深访理解用户的职业方向、优势证据、偏好约束和目标叙事，沉淀职业资产库，再基于资产生成简历、JD 策略、面试故事和个人网站。

核心差异不是“写得更快”，而是“先理解人，再生成可信职业表达”。这避免和普通简历润色、ATS 打分、模板生成工具正面竞争。

需要坚持的判断：

- 不卖单次“改简历”，卖职业确定感、个人资料库和可复用职业表达资产。
- 不能靠一个大聊天框跑完，需要 Product Orchestrator 控制状态、动作、额度、缓存和版本。
- 职业画像、项目证据、关键词、JD 匹配、网站 brief 都必须是可编辑资产卡，而不是长 Markdown 报告。
- v0.1 不做复杂 ATS、自动海投、招聘平台聚合、全行业覆盖和复杂建站。
- 第一版继续聚焦互联网产品、运营、程序员、AI、游戏和管理相邻岗位。

## 2. 核心原则

所有流程、prompt、页面和交付物都遵守这些规则：

- 先获得足够理解，再给对应置信度的建议。
- 客观、知性、不吹捧、不制造虚假匹配分。
- 没有证据的能力只能作为假设，不能写成事实。
- 默认优先判断是否延续当前职业轨道，再判断是否转向。
- 用户“不想做某事”需要区分：真实厌恶、环境问题、硬约束、能力缺口、身份阻碍、预设困难。
- 简历不是一页纸崇拜。可读性、版式完整、PDF 不断行、不大片空白，比强行压缩更重要。
- 网站必须读取用户画像、职业身份、项目证据、审美偏好和公开边界；C 端产品、B 端产品、技术建设者、运营增长、管理者的网站结构应不同。

理解程度和输出边界：

| 阶段 | 理解程度 | 可以输出 | 不能输出 |
|---|---|---|---|
| 首次诊断 | 只基于简历和少量入口回答 | 初步问题、可能叙事、证据缺口、下一轮追问 | 最终职业定位、最终简历、高置信度转岗建议 |
| 深访中 | 基于简历 + 用户回答 | 暂定方向、假设、待验证点、项目追问 | 过度确定的判断、无证据强 claim |
| 深访完成 | 基于职业资产库 | 职业画像、简历策略、主简历、JD 策略、网站 brief | 编造指标、夸大 title、绕过公开边界 |

## 3. 目标用户

MVP 只服务三类用户：

1. 2-8 年经验的互联网从业者：产品经理、运营/增长、程序员、AI/游戏/内容社区相关岗位。
2. 想转岗但证据不清的人：例如游戏转 AI、运营转产品、工程师转技术型产品、产品转 B 端/平台/管理相邻岗位。
3. 想建立个人网站或作品集的人：有项目和思考，但不知道哪些能公开、怎么展示、如何和简历复用。

## 4. 产品形态

第一版采用本地 Web 工作台：

- 网页负责上传、输入、展示、状态、预览和导出。
- 后端负责文件解析、资产读写、步骤状态、模型调用、缓存、HTML/PDF 渲染。
- Skill 作为方法论和 agent worker 的知识内核，不直接暴露给普通用户。

外放时升级为：

```text
Frontend
  -> API Server
  -> Product Orchestrator
  -> AI Action Service
  -> Model Provider
  -> Asset Store / Cache / Usage Ledger
```

## 5. Product Orchestrator 状态机

Product Orchestrator 是产品总控层，不负责写内容，负责判断用户当前阶段、允许动作、禁止动作、扣费、缓存、版本和下一步。

| 状态 | 用户看到什么 | 允许的动作 | 禁止的动作 | 下一步 |
|---|---|---|---|---|
| anonymous | Landing、案例、价格 | 浏览、看示例 | 调用模型、生成资产 | 登录/上传 |
| resume_uploaded | 上传成功，等待解析 | 解析简历 | 生成最终简历、JD 定制、网站 | resume_parsed |
| resume_parsed | 简历结构化结果 | 生成首次诊断 | 深度画像、最终简历、网站 | diagnosis_ready |
| diagnosis_ready | 首次诊断卡 | 进入深访、购买套餐、轻量 JD 判断 | 最终简历、网站发布 | interview_started |
| interview_started | 深访页、资产面板 | 继续访谈、保存资产 | JD 定制简历、网站生成 | direction_confirmed |
| direction_confirmed | 方向排序、关键词表 | 生成职业画像、深挖项目 | 直接网站生成 | portrait_ready |
| portrait_ready | 职业画像报告 | 深挖项目、生成简历策略 | 未确认项目证据就写高级 claim | project_evidence_ready |
| project_evidence_ready | 项目证据卡 | 编辑项目卡、生成简历策略 | 无证据强行生成高级 claim | resume_strategy_ready |
| resume_strategy_ready | 简历策略 | 生成 HTML 简历 | 无限重新生成 | resume_ready |
| resume_ready | HTML/PDF 简历 | 局部修改、导出 PDF、JD 分析 | 免费完整重生成 | optional_jd_or_site |
| jd_analyzed | JD fit/gap | 生成 JD 定制简历 | 无限 JD 分析 | jd_resume_ready |
| site_brief_ready | 网站 brief | 生成网站 | 未确认公开边界就发布 | site_ready |
| site_ready | 网站预览/发布设置 | 发布、撤回、改权限 | 绕过隐私检查公开 | done |

状态机必须落到后端校验。前端禁用按钮只是体验层，不能作为安全边界。

## 6. 用户旅程

主流程：

```text
Landing
-> 上传简历 / 填写经历
-> 简历确定性解析
-> 首次职业表达诊断
-> 职业方向深访
-> 职业画像报告
-> 项目证据深挖和编辑
-> 职业资产库
-> 简历策略
-> HTML 预览
-> PDF 导出与排版检查
```

可选流程：

- JD 匹配：用户提供 JD 后才运行。先做轻量判断，必要时进入深度 JD 策略。
- 个人网站：用户明确需要公开展示层后才运行，先做公开边界和审美偏好确认。

## 7. AI Action 契约

Action 状态说明：

| 状态写法 | 含义 |
|---|---|
| script ready | repo 中已有确定性脚本或服务能力 |
| method ready, product UI pending | skill/prompt 方法已存在，但产品状态、UI、资产写入、额度控制未完整实现 |
| refactor needed | 需要从现有 action 拆分或重构 |
| not implemented | 未实现 |

| Action | 作用 | 阶段 | 成本等级 | 缓存 | v0.1 状态 |
|---|---|---|---|---|---|
| resume_parse | PDF/DOCX 解析 | 上传后 | 低，脚本 | 文件 hash | script ready |
| career_diagnosis | 首次职业表达诊断 | 解析后 | 中 | 简历 hash + 入口回答 hash | refactor needed |
| career_direction_interview | 职业方向深访 | 主流程 | 中 | 资产快照 + 最近回答 | method ready, product UI pending |
| project_evidence_mining | 单项目证据深挖 | 主流程 | 中 | 项目 hash + 资产快照 | method ready, product UI pending |
| resume_strategy_generate | 简历策略 | 主流程 | 中 | 资产快照 + 目标版本 | method ready, product UI pending |
| resume_render | HTML/PDF 生成与检查 | 主流程 | 低，脚本 | 策略 hash | script ready |
| jd_light_check | JD 轻量判断 | 可选入口 | 中 | JD hash + 简历 hash | not implemented |
| jd_fit_analysis | JD 深度策略 | 可选 | 中 | JD hash + 资产快照 | method ready, product UI pending |
| personal_site_brief | 网站 brief | 可选 | 中 | 资产快照 + 审美偏好 | method ready, product UI pending |
| personal_site_generate | 网站生成 | 可选 | 高 | brief hash | method ready, product UI pending |
| local_revision | 局部修改 | 交付后 | 低/中 | 片段 hash | not implemented |

### 7.1 Action Contract 模板

每个 Action 必须定义：

```yaml
action: career_diagnosis
stage: after_resume_parse
preconditions:
  - user_logged_in: true
  - resume_parse.status: success
  - free_diagnosis_used: false OR paid_plan: true
inputs:
  - parsed_resume_json
  - user_onboarding_answer_optional
  - existing_asset_summary_optional
output_schema:
  - biggest_resume_problem
  - possible_narratives
  - keyword_evidence_table
  - risks
  - next_questions
cost:
  credit_cost: 0 for first free diagnosis / 3 after limit
  max_input_chars: 20000
  max_output_tokens: 1800
cache_key:
  - resume_hash
  - onboarding_answer_hash
  - prompt_version
failure:
  - parsing_insufficient -> ask user to paste text
  - model_timeout -> retry once
  - schema_invalid -> repair once
writes:
  - action_runs
  - llm_results.career_diagnosis
  - career_assets.initial_diagnosis
```

### 7.2 预算上限

| Action | 最大输入 | 最大输出 | 最大运行次数 | 超出后处理 |
|---|---|---|---|---|
| career_diagnosis | 20k chars | 1800 tokens | 1 free | 截断 + 要求补充 |
| career_direction_interview | asset summary + last round | 1200 tokens | 每轮一次 | 不允许并发 |
| project_evidence_mining | 单项目文本 | 1600 tokens | 每项目一次主生成 | 后续走局部修改 |
| resume_strategy_generate | asset snapshot | 1800 tokens | 每目标一次 | 复用策略 |
| resume_content_generate | strategy + selected assets | 2500 tokens | 每版本一次 | 完整重生成扣费 |
| jd_light_check | JD + parsed resume summary | 1200 tokens | 每 JD 一次 | hash 缓存 |
| jd_fit_analysis | JD + asset summary | 1800 tokens | 每 JD 一次 | hash 缓存 |
| personal_site_generate | brief + selected assets | 4000 tokens | 每 brief 一次 | 高阶扣费 |

系统级保护：

- 单用户每日最高 credits 消耗。
- 免费用户总成本封顶。
- 单 IP 每日新账号数限制。
- 同一设备免费诊断次数限制。
- 高成本 job 进入队列。
- job timeout、job cancel、失败重试次数上限。
- 异常用户熔断。
- schema repair 最多一次，仍失败则返回错误状态，不继续扣费。

## 8. 页面、输出与验收标准

### 8.1 Landing / 上传页

页面目标：让用户理解这是“先理解你，再生成职业表达资产”的产品，并低门槛上传简历。

用户能做：

- 上传 PDF/DOCX。
- 看示例。
- 登录或开始免费诊断。

系统必须展示：

- 产品主张。
- 隐私提示。
- 支持格式。
- 免费诊断入口。

空状态：

- 没有简历时只展示上传入口，不展示内部流程和资产进度。

错误状态：

- 文件格式错误。
- 文件过大。
- 解析失败，允许粘贴文本。

验收标准：

- 移动端 390px 无横向滚动。
- 首屏不出现 B 端 dashboard 式流程总览。
- 上传前不要求填写目标岗位和长补充说明。

### 8.2 首次诊断页

页面目标：在付费或深访前，让用户看到系统理解了简历线索，但不做最终判断。

系统必须展示：

- 当前简历最大问题。
- 2-3 个可能职业主叙事。
- 每个主叙事的证据强度。
- 关键词证据表。
- 至少 3 个下一轮追问。
- 明确说明哪些结论只是初步假设。
- CTA：继续深访 / 查看示例 / 购买标准版。

失败状态：

- 简历解析失败时，允许用户粘贴文本。
- 简历内容太少时，提示补充经历。
- 没有明显职业线索时，不强行生成方向。
- 模型输出失败时，可重试一次，不重复扣费。

### 8.3 职业深访页

页面目标：把 question tree 产品化，逐步建立用户画像和方向排序。

系统必须展示：

- 每轮 3-5 个问题。
- 用户回答输入框。
- 实时资产面板。
- 我对你的理解。
- 已确认事实。
- 仍不确定的点。
- 下一轮为什么问这些。

扣费规则：

- 免费诊断后的深访按套餐或 credits 扣费。
- 同一轮回答未变时，不重复调用模型。

### 8.4 职业画像报告页

页面目标：让用户确认产品对自己的理解是否成立。

系统必须展示：

- 职业定位一句话。
- 方向排序。
- 核心优势及证据。
- 不建议主打的方向。
- 简历主叙事策略。
- 置信度和不确定性。

禁止：

- 数字匹配分。
- 过度确定的转岗建议。
- 无证据的“你很适合”。

### 8.5 项目证据页

项目是产品护城河，v0.1 必须支持编辑。

P0 简化版项目编辑器字段：

- 项目名称。
- 我的角色。
- 项目背景。
- 关键行动。
- 结果指标。
- 过程指标。
- 质量指标。
- 证明的能力。
- 是否可公开。
- 隐私风险。
- 简历优先级。
- 作品集优先级。

系统必须支持：

- AI 初步生成项目卡。
- 用户编辑和确认。
- 标记公开边界。
- 将项目卡用于简历、JD、网站。

如果没有结果指标，优先追求过程指标；如果过程指标也不足，就调整简历顺序，让有数据的项目排前。

还要允许挖掘工作相关生活经历，例如游戏公司岗位可追问游戏经历、赛事经历、社区经历、开源经历、创作经历。

### 8.6 简历生成页

简历生成必须分三步：

1. 生成简历策略。
2. 生成简历内容和 bullet。
3. 生成 HTML 预览、PDF，并做排版检查。

系统必须展示：

- 目标版本：主简历、JD 定制、转岗版、一页版、中高阶版。
- 可选资产：主叙事、关键词、项目、技能、生活经历。
- HTML 预览。
- PDF 导出。
- 版式检查报告。

检查重点：

- 不出现大片空白。
- 不出现单字一行。
- 不出现标题和正文分页分离。
- 不因强行一页纸导致字体不可读。
- PDF 导出后必须再次确认。

### 8.7 JD 匹配页

JD 是可选附加流程，但入口要兼容用户一上来带 JD 的情况。

两档 JD 流程：

| 类型 | 输入 | 输出 | 边界 |
|---|---|---|---|
| 轻量 JD 判断 | JD + 当前简历 | JD 要求、表面匹配点、明显缺口、是否值得继续深挖 | 不生成定制简历 |
| 深度 JD 策略 | JD + 职业画像 + 项目证据 + 关键词表 | fit/gap matrix、投递建议、简历调整 brief、面试风险 | 需要资产库 |

输出必须使用客观文字判断：

- 值得重点投递。
- 可以尝试。
- 不建议优先。
- 先补证据再投。

### 8.8 个人网站页

网站不是“简历模板转网页”，而是证据展示层。

生成前必须确认：

- 目标受众：招聘方、投资人、客户、合作方、同行、自己沉淀。
- 身份类型：C 端产品、B 端产品、技术建设者、运营增长、管理者、创作者/顾问。
- 公开边界：可公开、需脱敏、不可公开、仅展示概念。
- 审美偏好：喜欢的网站链接/截图、风格关键词、不喜欢什么。

发布状态：

- 未发布。
- 仅本地预览。
- 私密链接。
- 密码访问。
- 公开访问。

公开前检查：

- 公司名是否隐藏。
- 指标是否脱敏。
- 是否隐藏具体时间。
- 是否隐藏内部工具。
- 是否只展示问题和方法，不展示敏感结果。
- 是否展示邮箱、微信、LinkedIn/GitHub。
- 是否需要防爬虫。

导出方式：

- 静态 HTML。
- zip。
- GitHub Pages。
- Vercel。
- 自己服务器部署。

网站实现要复用 frontend-design 的设计检查：移动端适配、文本不溢出、视觉风格匹配职业身份、项目内容可读。

## 9. 额度、缓存与防滥用

对用户展示 Career Credits，不展示 raw token。

建议套餐：

| 套餐 | 权益 |
|---|---|
| 免费体验 | 1 次简历轻诊断 + 1 张职业表达诊断卡 |
| 标准版 | 1 次深度职业画像 + 1 份主简历 + 3 个项目深挖 |
| 求职版 | 标准版 + 5 个 JD 定制版本 + 面试故事库 |
| 个人品牌版 | 求职版 + 个人网站 + 作品集案例包装 |
| 月度订阅 | 每月 N 次 JD 分析 / 简历版本 / 面试准备 |

硬限制：

- 匿名用户不能调用大模型，只能看 landing 和示例。
- 登录免费用户每天最多 1 次轻诊断，总共 1 次完整免费诊断。
- 未付费用户不能生成最终简历、JD 定制简历和个人网站。
- 单 IP 限制新账号创建频率。
- 同一用户同一时间只能跑 1 个高成本 job。
- “重新生成”不能无限点击，优先提供局部修改按钮。

缓存规则：

- 文件 hash：同一份简历重复上传不重新解析。
- JD hash：同一 JD 不重复调用模型。
- 资产快照 hash：同一 action + 同一输入 + 同一 schema 直接返回历史。
- 模块级缓存：只改一个项目时，只重跑项目证据，不重跑职业画像。
- Prompt 前缀缓存：固定规则、schema、few-shot 放前面，用户变量放后面。

## 10. 数据结构

v0.1 本地文件仍可保留 Markdown，但前端应该按结构化 JSON 渲染。

外放版本需要迁移到数据库：

- users
- resumes
- career_assets
- asset_versions
- ai_actions
- action_runs
- usage_ledger
- input_hashes
- artifact_versions
- public_site_settings
- orders
- credits_ledger

每个 action run 至少记录：

- user_id
- action_type
- input_hash
- asset_snapshot_id
- prompt_version
- output_schema_version
- model
- token usage
- credit cost
- cache hit
- artifact version
- status
- failure_reason

## 11. 登录、用户隔离与公开 demo 边界

如果 v0.1 只是本地自用 demo，登录和用户隔离可以后置。

只要允许真实用户上传简历，以下能力就是 P0：

- 登录。
- 用户隔离。
- workspace 按 user_id 分区。
- 文件权限隔离。
- action_runs 绑定 user_id。
- credits 绑定 user_id。
- artifacts 绑定 user_id。
- 用户删除数据能力。

原因：

- 简历是高度隐私数据。
- 文件型 workspace 容易串用户。
- 额度控制需要 user_id。
- artifact version 需要绑定用户。
- 支付也需要用户身份。
- 防滥用也需要账户维度。

支付可以后置，用户隔离不能在公开 demo 中后置。

## 12. 支付与测试路径

v0.1 支付不直接接正式支付，先做内部额度闭环。

推荐顺序：

1. Mock 支付：本地创建订单，手动置为 paid，验证 credits 入账、action 扣费、退款/失败状态。
2. 支付沙箱：支付宝/微信支付沙箱 + 公网回调地址，验证 notify 回调、签名、订单状态。
3. 正式小额支付：只开放给自己或白名单用户，验证真实链路。

最小数据表：

- orders：订单、套餐、金额、状态、provider_trade_no。
- credits_ledger：入账、扣费、退款、过期。
- usage_ledger：action 调用、缓存命中、token、credits。

## 13. 阿里云部署方案

旧作品集部署记录显示：之前使用阿里云轻量服务器、SSH key、Nginx，并把静态 `dist` 上传到 `/var/www/rubick-portfolio`。

当前 `career-web` 不能按旧静态站方式直接部署，因为它需要：

- Express API。
- DeepSeek key。
- 本地文件型 workspace。
- PDF/DOCX 解析。
- Chrome/Chromium PDF 导出。

推荐部署：

```text
Nginx 80/443
  -> 127.0.0.1:5174
  -> PM2 管理 Node Express
  -> /var/www/career-web/current
  -> /var/lib/career-web/workspace
```

服务器建议：

- 1C/1GB 可跑本地 demo，但 PDF 导出可能吃紧。
- 1C/2GB 更稳。
- 安装 Node.js 20+、PM2、Nginx、Chrome/Chromium。
- `.env.local` 和 `workspace/` 不进 Git。

公开部署前必须完成：

- 登录和用户隔离。
- 数据删除能力。
- 文件大小限制。
- 上传文件扫描和类型校验。
- DeepSeek key 只放服务器环境变量。
- Nginx HTTPS。

## 14. v0.1 核心指标

激活指标：

| 指标 | 目标 |
|---|---|
| 上传简历完成率 | > 60% |
| 首次诊断生成率 | > 80% |
| 首次诊断后继续深访率 | > 30% |
| 用户“被理解感”评分 | > 4/5 |

质量指标：

| 指标 | 目标 |
|---|---|
| 职业画像被用户确认率 | > 70% |
| 项目证据卡修改率 | > 50% |
| 简历 bullet 用户采纳率 | > 60% |
| 简历导出成功率 | > 95% |

成本指标：

| 指标 | 目标 |
|---|---|
| 免费用户平均模型成本 | 低于获客预算 |
| 单次首次诊断平均成本 | 固定上限内 |
| 缓存命中率 | 持续提升 |
| 完整重生成次数 | 受控 |

商业指标：

| 指标 | 目标 |
|---|---|
| 免费诊断到付费转化率 | MVP 先观察 |
| 标准版购买率 | MVP 先观察 |
| JD 加购率 | MVP 先观察 |
| 网站模块购买率 | MVP 先观察 |

## 15. v0.1 待办

### P0：本地闭环

- 将 `career_direction` 拆成首次轻诊断和深访两步。
- 增加 Product Orchestrator 状态机。
- 增加 Action Contract 和预算上限。
- 前端结果展示改为结构化卡片，不再显示大段 JSON/Markdown。
- 增加项目卡编辑器。
- 加文件/JD hash 缓存。
- 加 artifact version，至少支持简历和网站历史版本。
- 部署脚本改为 PM2 + Nginx 方案。

### P0：公开 demo 必须补

- 登录。
- 用户隔离。
- workspace 按 user_id 分区。
- action_runs 绑定 user_id。
- credits 绑定 user_id。
- 数据删除能力。
- 基础限流。

### P1

- 增加 Usage Ledger 和 Career Credits。
- 增加 mock 支付。
- 增加局部修改按钮：更保守、更结果导向、缩短、强化某个项目、弱化风险表述。
- 增加个人网站公开边界确认。
- 增加匿名测试样例，覆盖产品、运营、技术、AI、游戏、管理相邻岗位。

### P2

- 正式支付和套餐。
- 多模板简历。
- 英文简历。
- 多页面网站。
- 多租户后台。
