# Direction Question Tree

Use this file to run a structured career direction interview for internet-industry roles. The first version focuses on product managers, operations/growth roles, programmers/technical builders, and management-adjacent roles. AI and gaming are treated as domain overlays.

This is a question tree, not a question bank. Ask one small set of questions at a time, interpret the answer, then choose the next branch.

## Operating Rules

- Prefer the user's current career continuity before assuming a career change.
- If a resume exists, use it from the beginning to generate narrative candidates and evidence hypotheses.
- Ask no more than 3-5 questions in one turn.
- Use brief reassurance when the user seems rushed or anxious.
- After each round, provide a short mirror summary.
- Separate confirmed facts from hypotheses.
- Update the relevant `career-assets/` fields as the interview progresses.
- If the user provides a concrete JD before direction interviewing is complete, do not stop this flow. Use the JD only to ask why the user wants the role and whether it matches their target direction. Route to `$jd-fit-strategist` after direction and keywords are understood.

## Reassurance Pattern

Use sparingly, especially at the start or when the user is impatient:

```text
我知道你可能现在很着急想直接改简历。但求职本身会影响未来几年方向，先花几十分钟把方向和关键词定准，后面简历和面试都会更省力。
```

## Mirror Summary Pattern

After a meaningful answer or round:

```text
我先复述一下我的理解：你不是单纯想换职业，而是想在 [当前方向] 上获得 [更好的机会/更高层级/更清晰表达]。目前真正需要验证的是 [不确定点]。
```

Keep it short. The mirror summary should help the user understand themselves, not flatter them.

## Tree Overview

```text
R0 Input And Resume Status
-> R1 Current-Career Continuity Check
-> R2 Motivation Type
-> R3 Resume-Based Narrative Candidates
-> R4 Avoidance And Constraints
-> R5 Strength Evidence
-> R6 Preference And Energy
-> R7 Internet Function Branch
-> R8 AI / Game Domain Overlay
-> R9 Direction Ranking
-> R10 Keyword Confirmation
-> Handoff To Resume Optimization
```

## R0 Input And Resume Status

Goal: identify whether the user has a resume and whether this skill is the right entry point.

Ask:

- 你现在有现成简历吗？如果有，我会先用它生成职业主叙事候选，不会直接改。
- 你现在是想继续当前职业方向求更好的机会，还是已经明确想换方向？
- 你有没有具体 JD？如果有，我会先问清楚你为什么想投它；JD 分析是附加流程，不能替代对你的了解。

Good signals:

- User has a resume or enough work history to infer narratives.
- User is open to first clarifying direction and keywords.
- User is unsure whether to continue or switch.

Risk signals:

- User only wants final wording and rejects direction discussion.
- User has a concrete JD but has not completed direction clarification.
- User asks for website implementation.

Next:

- Concrete JD but incomplete direction assets -> stay in R1/R2 and ask whether the user truly wants this role.
- Existing positioning and only wants wording -> `$resume-story-builder`.
- Website -> `$personal-site-builder`.
- Resume exists or direction unclear -> R1.

Update:

- `profile.md`: Current Goal, Open Questions.

## R1 Current-Career Continuity Check

Goal: avoid assuming career change. First evaluate whether the user should continue the current track, upgrade within it, or change track.

Ask:

- 你现在的主职业身份是什么？产品经理、运营/增长、程序员/技术、还是管理相关？
- 如果不换职业，只是在当前职业上换公司、换业务、换层级，你觉得问题能解决多少？
- 你现在想离开的到底是职业本身，还是当前公司/团队/行业/业务/上级/薪资/成长空间？
- 你是否有明确想转向的新职业？如果有，为什么？

Good signals:

- User separates current job dissatisfaction from career-track dissatisfaction.
- User can say whether the problem is role, company, industry, level, or narrative.

Risk signals:

- Treats "换职业" as the default solution without evidence.
- Confuses company/team problems with professional identity problems.
- Wants a new track mainly because it is hot.

Next:

- Current track likely viable -> R2 with "upgrade current track" as default hypothesis.
- Track dissatisfaction is clear -> R2 with "possible transition" hypothesis.
- Unclear -> ask for recent trigger, then R2.

Update:

- `profile.md`: Current Goal, Wants, Constraints.
- `directions.md`: continuity/change hypothesis.

## R2 Motivation Type

Goal: classify the move as pull, push, strategy, or fog.

Ask:

- 你是被某个方向吸引，还是主要想离开当前状态？
- 如果薪资、title、外界评价都一样，你还会选这个方向吗？
- 最近让你产生这个想法的具体事件是什么？

Good signals:

- Pull: specific problem type, product/user/domain, work mode, or craft attracts the user.
- Strategy: market logic is explicit and compatible with user evidence.
- Continuity: user wants a better version of the current career rather than a reset.

Risk signals:

- Push only: escaping manager, company, burnout, or boredom.
- Fog: vague hot track, prestige, peer comparison, generic "AI".

Next:

- Pull/strategy/continuity -> R3.
- Push -> R4 before finalizing R3.
- Fog -> R3 but mark as weak hypothesis.

Update:

- `profile.md`: Wants, Constraints, Open Questions.

## R3 Resume-Based Narrative Candidates

Goal: use the resume early to actively propose professional narratives.

If resume is available, generate 3-5 narrative candidates from evidence. If no resume is available, ask for work history first.

Ask:

- 基于你的简历，我看到这些可能主叙事：A / B / C。哪个是你想成为的人？
- 哪个只是你做过，但不想再被它定义？
- 哪个你感兴趣，但目前证据还不足？
- 如果我们默认你先不换职业，哪个叙事最能帮你在当前职业上升级？

Good signals:

- User can choose a primary narrative and reject secondary narratives.
- User can separate "I have done this" from "I want the market to remember me this way".

Risk signals:

- User wants to keep all narratives equally.
- User chooses a narrative with weak evidence and high transition cost.
- User rejects the strongest current-career narrative without clear reason.

Next:

- Clear preferred narrative -> R4.
- Too many narratives -> classify primary / secondary / minimize.
- Evidence weak -> R5 and R7 checks.

Update:

- `directions.md`: initial direction hypotheses.
- `keywords.md`: candidate keywords.

## R4 Avoidance And Constraints

Goal: distinguish true dislike, bad context, hard constraint, skill gap, identity block, and assumed difficulty.

Ask:

- 你明确不想继续做什么？
- 这个不想做，是因为做过后确认不喜欢，还是因为觉得门槛高/做不好/不适合你？
- 如果这个门槛可以通过路径设计解决，你还排斥它吗？

Good signals:

- User can identify true dislikes and hard constraints.
- User recognizes some barriers as solvable.

Risk signals:

- "我不适合 X" without evidence.
- Avoids a potentially strong current-career direction because of fear, age, credential, coding, management, networking, public expression, or AI anxiety.

Next:

- Hard constraints -> keep in ranking penalty.
- Assumed difficulty -> route to small experiments.
- True dislike -> deprioritize direction.
- Skill gap -> R5/R7 to check evidence and transition cost.

Update:

- `profile.md`: Does Not Want, Constraints.
- `directions.md`: risks and deprioritized directions.

## R5 Strength Evidence

Goal: infer strengths from repeated evidence instead of self-labels.

Ask:

- 过去别人最常因为哪些事来找你？
- 哪些事你做起来比别人更顺、更快，甚至觉得“不算什么”？
- 哪些项目如果没有你，结果会明显变差？
- 你被认可、升职、续任、托付关键任务，通常是因为什么？
- 有没有和目标工作相关的生活经历或长期投入？例如游戏岗位里的职业战队经历、高分段游戏经验、社区组织、创作经历、开源项目、个人工具等。

Good signals:

- Repeated evidence across roles.
- External validation from managers, peers, users, clients, metrics.
- User can name concrete projects.

Risk signals:

- Only adjectives: "沟通强", "学习快", "负责".
- Strength has no project proof.
- Strength is strong but user dislikes using it.
- Relevant life experience exists but is not connected to target role evidence.

Next:

- Strong proof -> R6.
- Weak proof -> ask for one project example.
- Strength-dislike conflict -> R6 to check sustainability.

Update:

- `profile.md`: Strengths.
- `keywords.md`: evidence status.

## R6 Preference And Energy

Goal: identify sustainable work modes, not just capability.

Ask:

- 哪些工作你做完会更有能量？
- 哪些工作即使结果不错，你也不想长期做？
- 你更喜欢解决哪类问题：用户、增长、商业化、系统、内容、技术、组织？
- 你更适合独立深度工作、高协作推进、对外沟通、管理带人，还是从 0 到 1 探索？

Good signals:

- User distinguishes ability from preference.
- User identifies sustainable work mode.

Risk signals:

- Likes something with no evidence.
- Good at something but strongly drains energy.
- Chooses direction mainly for status or money.

Next:

- Direction preference and strength aligned -> R7.
- Preference high/evidence low -> exploration direction.
- Evidence high/preference low -> supporting skill, not primary narrative.

Update:

- `profile.md`: Preferences.
- `directions.md`: direction type.

## R7 Internet Function Branch

Goal: apply function-specific reasoning for first-version target roles.

Choose one primary branch. Use management as an auxiliary branch when the target role includes lead/manager/senior ownership.

### Product Manager

Ask:

- 你更强的是需求判断、业务建模、增长转化、系统设计、项目推进，还是用户研究？
- 你做过哪些关键产品判断，而不只是执行需求？
- 你负责过哪些指标、范围或业务结果？
- 你更像业务产品、平台产品、增长产品、AI 产品，还是内容/社区/生态产品？

Good signals: problem framing, tradeoffs, scope ownership, launched result, user/business metrics.
Risk signals: only feature delivery, no judgment, no metric/result.

### Operations / Growth

Ask:

- 你负责过什么增长、转化、留存、供给、内容、社区或活动目标？
- 你如何发现问题、设计策略、验证效果？
- 有哪些数据、机制、流程或 SOP 沉淀？
- 你更像内容运营、用户运营、增长运营、社区运营、创作者生态，还是商业化运营？

Good signals: metric ownership, user/channel insight, repeatable playbook, content/community/ecosystem proof.
Risk signals: only execution, no strategy or measurement.

### Programmer / Technical Builder

Ask:

- 你做过什么真实可用的系统、工具、自动化或工程项目？
- 这个技术方案解决了什么业务问题？
- 有哪些用户、使用频次、稳定性、可维护性或效率结果？
- 你更想走工程岗位，还是用技术能力强化产品/运营/创业方向？

Good signals: shipped system/tool, real usage, maintainability, technical judgment, business impact.
Risk signals: demos only, no usage, no maintenance story, technical work disconnected from target role.

### Management-Auxiliary

Use this branch only when the user targets senior/lead/manager roles or has management evidence.

Ask:

- 你管理的是人、项目、资源、目标，还是跨团队影响？
- 你是否有招聘、绩效、培养、目标拆解或组织机制经验？
- 你想做管理是因为喜欢放大团队，还是因为觉得 IC 天花板到了？

Good signals: people/process leverage, accountability, delegation, hiring/performance evidence.
Risk signals: title-driven, no people ownership, dislikes conflict, only project coordination.

Next:

- Function evidence clear -> R8.
- Function evidence weak -> exploration or gap plan.
- Management mismatch -> keep as supporting keyword, not main direction.

Update:

- `directions.md`: evidence, gaps, risks.
- `keywords.md`: supporting projects and missing proof.

## R8 AI / Game Domain Overlay

Goal: handle AI and gaming as domain/context overlays, not standalone labels without evidence.

### AI Overlay

Ask:

- 你做 AI 相关工作时，是产品定义、工作流设计、Prompt/Agent、评估、落地推广，还是个人提效？
- 有没有真实使用者、采用率、节省成本、质量提升或流程变化？
- 这段 AI 经验证明的是 AI 产品能力，还是技术工具化能力，还是学习速度？

Good signals: workflow redesign, evaluation, adoption, measurable efficiency/quality impact.
Risk signals: only "用过 AI", no user/adoption/result.

### Game Overlay

Ask:

- 你的游戏经验更偏玩家社区、UGC/创作者生态、商业化、平台治理、内容运营，还是官网/工具？
- 你自己的游戏经历是什么？是否有职业/半职业、天梯高分段、战队创建、社区组织、赛事、内容创作或玩家研究经历？
- 你理解的核心用户、内容供给、生态规则或商业模式是什么？
- 这些经验能否迁移到非游戏互联网业务？

Good signals: player/user insight, UGC/ecosystem mechanism, monetization, governance, content/community proof, credible personal game literacy.
Risk signals: only industry exposure, no transferable mechanism.

Next:

- Overlay strengthens primary function -> include as differentiator.
- Overlay is interesting but weak -> mark as experiment.
- Overlay distracts from target -> minimize.

Update:

- `keywords.md`: differentiator / experiment / minimize.
- `directions.md`: market opportunity and transferability.

## R9 Direction Ranking

Goal: rank directions with explicit reasoning.

Use qualitative scoring:

```markdown
| Direction | Preference | Evidence | Market | Transition Cost | Constraint Risk | Type |
|---|---|---|---|---|---|---|
```

Direction types:

- High-certainty: current-track or adjacent direction with strong evidence and acceptable preference.
- Growth: current-track upgrade or adjacent move with partial evidence and solvable gaps.
- Exploration: high interest but weak evidence; requires small experiment.
- Deprioritized: low preference, hard constraints, or weak evidence/high cost.

Ask:

- 这个排序里，哪个你直觉上抗拒？抗拒来自不喜欢，还是害怕成本？
- 如果只保留一个主方向和一个备选方向，你会选哪两个？

Update:

- `directions.md`: final ranking and rationale.

## R10 Keyword Confirmation

Goal: convert direction into market-facing positioning keywords.

Ask:

- 未来 6 个月，如果只能让市场记住你 3 个关键词，它们应该是什么？
- 哪些关键词虽然你做过，但会稀释主线，应该弱化？
- 哪些关键词你想要，但目前证据不足，需要后续补强？

Output:

```markdown
| Keyword | Role | Evidence Strength | Supporting Projects | Missing Proof | Decision |
|---|---|---|---|---|---|
```

Role values:

- Primary: market-facing main signal.
- Supporting: proof that strengthens the primary signal.
- Differentiator: makes the user distinct, such as AI or gaming domain depth.
- Minimize: true but not useful for current positioning.
- Experiment: desirable but under-evidenced.

Update:

- `keywords.md`: target keywords and evidence status.
- `profile.md`: positioning summary.

## Handoff To Resume Optimization

Resume optimization should happen after direction and keywords are confirmed.

Use this routing:

- No JD: `$career-direction-interviewer` -> `$resume-story-builder`.
- With JD after direction is understood: `$career-direction-interviewer` -> `$jd-fit-strategist` -> `$resume-story-builder`.

This skill may produce a resume optimization brief, but it should not write the final resume.

Brief format:

```markdown
# Resume Optimization Brief

## Target Direction

## Primary Keywords

## Supporting Keywords

## Projects To Emphasize

## Projects To Minimize

## Evidence Gaps

## Handoff Questions For Resume Story Builder
```

## Completion Criteria

This skill is complete when it can produce:

- A concise career positioning summary.
- 2-4 ranked directions with reasoning.
- 3-5 confirmed or candidate positioning keywords.
- A list of evidence gaps.
- A resume optimization brief.
- Handoff recommendation to `$jd-fit-strategist`, `$resume-story-builder`, or `$personal-site-builder`.
