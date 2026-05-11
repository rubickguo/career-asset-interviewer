function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function list(items) {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!values.length) return "";
  return `<ul>${values.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function normalizeSectionName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "项目经历";
  if (/技能/.test(raw) && !/经历|项目/.test(raw)) return "核心能力";
  if (/教育/.test(raw)) return "教育经历";
  if (/作品|开源|portfolio/i.test(raw)) return "个人作品";
  if (/个人|简介|summary/i.test(raw)) return "个人简介";
  if (/项目/.test(raw)) return "项目经历";
  if (/工作|经历/.test(raw)) return "工作经历";
  return raw.replace(/\s*\/\s*/g, " / ");
}

function cleanBulletText(value) {
  return String(value || "")
    .replace(/^[-•]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isKeywordLikeText(value) {
  const text = cleanBulletText(value);
  if (!text) return true;
  if (/[\/｜|]/.test(text)) return true;
  if (text.length <= 12) return true;
  if (!/[，。；;,.]|从|到|推动|负责|主导|参与|设计|搭建|优化|提升|降低|覆盖|增长|减少|实现|沉淀|验证|支持|负责|面向|基于/.test(text)) return true;
  return false;
}

function summaryItemsFromPublicResume(publicResume) {
  return (Array.isArray(publicResume?.summary) ? publicResume.summary : [])
    .map(cleanBulletText)
    .filter((item) => item && !isKeywordLikeText(item))
    .slice(0, 3);
}

function splitSkillTags(value) {
  return String(value || "")
    .split(/[、/，,｜|]/)
    .map(cleanBulletText)
    .filter(Boolean);
}

function renderTagGrid(items) {
  const tags = [...new Set(items.flatMap(splitSkillTags))]
    .filter((item) => item.length <= 18)
    .slice(0, 12);
  if (!tags.length) return "";
  return `<div class="tag-grid">${tags.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>`;
}

function isWorkSectionStart(line) {
  return /^(工作经历|职业经历|工作经验|实习经历|Experience|Employment)/i.test(String(line || "").trim());
}

function isNextMajorSection(line) {
  return /^(项目经历|重点项目|项目经验|教育经历|教育背景|个人作品|作品集|核心能力|专业技能|技能|自我评价|Projects|Education|Skills)/i.test(String(line || "").trim());
}

function looksLikeWorkTitle(line) {
  const text = cleanBulletText(line);
  if (!text || text.length > 88) return false;
  if (/邮箱|手机|微信|GitHub|http|个人简介|求职/i.test(text)) return false;
  return /20\d{2}|19\d{2}|至今|现在|公司|科技|网络|互动|工作室|平台|集团|产品经理|运营|工程师|负责人|实习/i.test(text);
}

function extractOriginalWorkEntries(resumeText) {
  const lines = String(resumeText || "").split("\n").map((line) => line.trim()).filter(Boolean);
  const start = lines.findIndex(isWorkSectionStart);
  const sectionLines = [];
  if (start >= 0) {
    for (const line of lines.slice(start + 1)) {
      if (isNextMajorSection(line)) break;
      sectionLines.push(line);
    }
  } else {
    sectionLines.push(...lines.filter((line) => !isNextMajorSection(line)));
  }
  const entries = [];
  let current = null;
  for (const line of sectionLines) {
    if (looksLikeWorkTitle(line)) {
      if (current) entries.push(current);
      current = { title: cleanBulletText(line), bullets: [] };
      continue;
    }
    if (current && /^[-•*·]|负责|参与|主导|推动|搭建|设计|优化|完成|支持/.test(line)) {
      current.bullets.push(cleanBulletText(line).slice(0, 120));
    }
  }
  if (current) entries.push(current);
  return entries
    .filter((item) => item.title)
    .map((item) => ({ ...item, bullets: item.bullets.slice(0, 2) }))
    .slice(0, 8);
}

function mergeWorkEntries(generatedEntries, originalEntries) {
  const result = Array.isArray(generatedEntries) ? [...generatedEntries] : [];
  const normalizedTitles = new Set(result.map((item) => cleanBulletText(item?.title).replace(/\s+/g, "").toLowerCase()));
  for (const entry of originalEntries) {
    const key = cleanBulletText(entry?.title).replace(/\s+/g, "").toLowerCase();
    if (!key) continue;
    const covered = Array.from(normalizedTitles).some((existing) => existing.includes(key) || key.includes(existing));
    if (covered) continue;
    result.push(entry);
    normalizedTitles.add(key);
  }
  return result;
}

function parseCandidateName(resumeMeta, resumeText) {
  if (resumeMeta?.candidateName) return resumeMeta.candidateName;
  const lines = String(resumeText || "").split("\n").map((line) => line.trim()).filter(Boolean);
  const first = lines.find((line) =>
    line.length <= 24 &&
    !/@|电话|手机|邮箱|微信|GitHub|http|个人简介|求职|工作经历|项目经历|教育经历|技能|Experience|Projects|Education/i.test(line)
  );
  return first || "候选人";
}

function extractContacts(resumeText) {
  const text = String(resumeText || "");
  const contacts = [];
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = text.match(/(?:\+?86[-\s]?)?1[3-9]\d{9}/)?.[0];
  const github = text.match(/(?:https?:\/\/)?github\.com\/[A-Za-z0-9_-]+/i)?.[0];
  const site = text.match(/(?:https?:\/\/|www\.)[A-Za-z0-9-]+\.(?:com|cn|ltd|io|dev)(?:\/[^\s，。｜|]*)?/i)?.[0];
  if (site && !/github\.com/i.test(site)) contacts.push(["作品集", site.replace(/^https?:\/\//i, "")]);
  if (phone) contacts.push(["手机", phone]);
  if (email) contacts.push(["邮箱", email]);
  if (github) contacts.push(["GitHub", github.replace(/^https?:\/\//i, "")]);
  return contacts.slice(0, 4);
}

function bulletTitle(text) {
  const match = String(text || "").match(/^(.{2,24}?)[：:]\s*(.+)$/);
  if (!match) return ["", text];
  return [match[1], match[2]];
}

function normalizePublicResume(publicResume) {
  if (!publicResume || typeof publicResume !== "object") return null;
  const hasContent = Boolean(
    publicResume.headline ||
      publicResume.header?.name ||
      (Array.isArray(publicResume.summary) && publicResume.summary.length) ||
      (Array.isArray(publicResume.experiences) && publicResume.experiences.length) ||
      (Array.isArray(publicResume.projects) && publicResume.projects.length)
  );
  return hasContent ? publicResume : null;
}

function publicResumeToBullets(publicResume) {
  const bullets = [];
  for (const text of summaryItemsFromPublicResume(publicResume)) {
    bullets.push({ section: "个人简介", text });
  }
  for (const item of Array.isArray(publicResume.experiences) ? publicResume.experiences : []) {
    const prefix = [item.title, item.period].filter(Boolean).join(" ｜ ");
    for (const bullet of Array.isArray(item.bullets) ? item.bullets : []) {
      bullets.push({ section: "工作经历", text: prefix ? `${prefix}：${bullet}` : bullet });
    }
  }
  for (const item of Array.isArray(publicResume.projects) ? publicResume.projects : []) {
    for (const bullet of Array.isArray(item.bullets) ? item.bullets : []) {
      bullets.push({ section: "项目经历", text: item.title ? `${item.title}：${bullet}` : bullet });
    }
  }
  for (const text of Array.isArray(publicResume.skills) ? publicResume.skills : []) {
    bullets.push({ section: "核心能力", text });
  }
  for (const item of Array.isArray(publicResume.works) ? publicResume.works : []) {
    const text = typeof item === "string" ? item : [item.title, item.description].filter(Boolean).join("：");
    bullets.push({ section: "个人作品", text });
  }
  for (const text of Array.isArray(publicResume.education) ? publicResume.education : []) {
    bullets.push({ section: "教育经历", text });
  }
  return bullets.filter((item) => cleanBulletText(item.text));
}

function normalizeContacts(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return ["", item];
      return [item.label || item.type || "", item.value || item.text || item.url || ""];
    })
    .filter(([, text]) => text)
    .slice(0, 4);
}

function sectionItems(grouped, names) {
  const wanted = new Set(names);
  return Object.entries(grouped)
    .filter(([section]) => wanted.has(section))
    .flatMap(([, items]) => items);
}

function renderSectionTitle(title) {
  return `<h2 class="section-title">${escapeHtml(title)}</h2>`;
}

function renderBulletList(items) {
  if (!items.length) return "";
  return `<ul>${items.map((item) => {
    const [title, body] = bulletTitle(item.text || item);
    return `<li>${title ? `<strong>${escapeHtml(title)}：</strong>` : ""}${escapeHtml(body || item.text || item)}</li>`;
  }).join("")}</ul>`;
}

function renderEntries(entries) {
  const values = Array.isArray(entries) ? entries.filter(Boolean) : [];
  if (!values.length) return "";
  return values.map((entry) => {
    const title = [entry.title, entry.period].filter(Boolean).join(" ｜ ");
    const bullets = Array.isArray(entry.bullets) ? entry.bullets.map(cleanBulletText).filter(Boolean).slice(0, 4) : [];
    if (!title && !bullets.length) return "";
    return `<article class="entry">
      ${title ? `<div class="entry-head"><strong>${escapeHtml(title)}</strong></div>` : ""}
      ${renderBulletList(bullets)}
    </article>`;
  }).filter(Boolean).join("");
}

export function buildResumeHtml({ resumeStrategy, careerDirection, projectMining, resumeMeta, resumeText }) {
  const publicResume = normalizePublicResume(resumeStrategy?.publicResume);
  const bullets = publicResume ? publicResumeToBullets(publicResume) : (Array.isArray(resumeStrategy?.bullets) ? resumeStrategy.bullets : []);
  const grouped = bullets.reduce((acc, item) => {
    const section = normalizeSectionName(item.section);
    acc[section] ||= [];
    const text = cleanBulletText(item.text);
    if (text) acc[section].push({ ...item, text });
    return acc;
  }, {});
  const keywordOrder = Array.isArray(resumeStrategy?.keywordOrder) ? resumeStrategy.keywordOrder : [];
  const projectCards = Array.isArray(projectMining?.projectCards) ? projectMining.projectCards : [];
  const fallbackProjectBullets = projectCards
    .map((item) => cleanBulletText(item.resumePotential || item.evidence?.[0] || ""))
    .filter(Boolean)
    .slice(0, 5);

  const candidateName = publicResume?.header?.name || parseCandidateName(resumeMeta, resumeText);
  const contacts = normalizeContacts(publicResume?.header?.contacts);
  const fallbackContacts = contacts.length ? contacts : extractContacts(resumeText);
  const summary = publicResume?.headline || resumeStrategy?.positioning || careerDirection?.recommendedTrack || careerDirection?.headline || "职业定位待确认";
  const intro = publicResume ? "" : (resumeStrategy?.professionalSummary || resumeStrategy?.summary || "");
  const introItems = sectionItems(grouped, ["个人简介"]).filter((item) => !isKeywordLikeText(item.text));
  const workItems = sectionItems(grouped, ["工作经历"]);
  const projectItems = sectionItems(grouped, ["项目经历"]);
  const originalWorkItems = extractOriginalWorkEntries(resumeText);
  const generatedWorkItems = publicResume && Array.isArray(publicResume.experiences) ? publicResume.experiences : [];
  const structuredWorkItems = mergeWorkEntries(generatedWorkItems, originalWorkItems);
  const structuredProjectItems = publicResume && Array.isArray(publicResume.projects) ? publicResume.projects : [];
  const abilityItems = sectionItems(grouped, ["核心能力"]);
  const abilityTagItems = abilityItems.map((item) => item.text).filter(isKeywordLikeText);
  const abilityBulletItems = abilityItems.filter((item) => !isKeywordLikeText(item.text));
  const educationItems = sectionItems(grouped, ["教育经历"]);
  const portfolioItems = sectionItems(grouped, ["代表作品", "个人作品"]);
  const remainingItems = Object.entries(grouped)
    .filter(([section]) => !["个人简介", "工作经历", "项目经历", "核心能力", "教育经历", "代表作品", "个人作品"].includes(section))
    .flatMap(([, items]) => items);
  const fallbackProjectItems = projectItems.length
    ? renderBulletList(projectItems)
    : (fallbackProjectBullets.length ? renderBulletList(fallbackProjectBullets) : "");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Resume Preview</title>
  <style>
    :root {
      --ink: #172033;
      --muted: #596579;
      --subtle: #7b8798;
      --line: #dbe4eb;
      --soft: #f6f9fb;
      --accent: #0a8f83;
    }
    @page { size: A4; margin: 13mm 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background: #eef3f6;
      font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", Arial, sans-serif;
      font-size: 14.2px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      line-height: 1.66;
    }
    a { color: inherit; text-decoration: none; }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 12px auto;
      padding: 14mm 15mm;
      background: #fff;
      box-shadow: 0 18px 60px rgba(28, 45, 65, 0.12);
    }
    header { display: grid; gap: 14px; padding-bottom: 16px; border-bottom: 2px solid var(--ink); }
    .header-top { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 24px; align-items: center; }
    h1 { margin: 0; font-size: 34px; line-height: 1; letter-spacing: 0; white-space: nowrap; }
    .contacts { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px 18px; color: var(--muted); font-size: 13.5px; line-height: 1.35; text-align: right; }
    .contacts span { white-space: nowrap; }
    .contacts strong { color: var(--ink); font-weight: 800; }
    .headline { margin: 0; padding: 11px 13px; border: 1px solid var(--line); border-radius: 8px; background: var(--soft); color: var(--muted); font-size: 14px; line-height: 1.68; }
    section { margin-top: 22px; break-inside: avoid; }
    .section-title { display: flex; align-items: center; gap: 9px; margin: 0 0 12px; color: var(--ink); font-size: 17.5px; font-weight: 800; line-height: 1.2; }
    .section-title::before { display: block; width: 5px; height: 18px; border-radius: 999px; background: var(--accent); content: ""; }
    .job { position: relative; padding: 0 0 7px 18px; border-left: 1px solid var(--line); }
    .job::before { position: absolute; top: 5px; left: -4px; width: 8px; height: 8px; border: 1.5px solid var(--accent); border-radius: 50%; background: #fff; content: ""; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 0 0 8px; padding-left: 2px; }
    li::marker { color: var(--accent); }
    li strong { color: var(--ink); font-weight: 800; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
    .chip { padding: 3px 7px; border-radius: 999px; background: #e8f6f3; color: #0f766e; font-size: 12px; font-weight: 800; }
    .tag-grid { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 2px; }
    .tag-grid span { display: inline-flex; align-items: center; min-height: 28px; padding: 3px 9px; border: 1px solid var(--line); border-radius: 7px; color: #244a5a; background: #f7fafb; font-size: 13px; font-weight: 800; }
    .work-list { display: grid; gap: 10px; padding-left: 0; list-style: none; }
    .work-list li { margin: 0; padding: 9px 11px; border: 1px solid var(--line); border-radius: 8px; background: linear-gradient(180deg, #fff, var(--soft)); }
    .entry { margin: 0 0 14px; break-inside: avoid; }
    .entry:last-child { margin-bottom: 0; }
    .entry-head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 7px; color: var(--ink); font-size: 14.5px; line-height: 1.35; }
    .entry-head strong { font-weight: 900; }
    .education { padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--soft); }
    .note { color: var(--subtle); font-size: 12px; margin: 0; }
    @media print {
      body { background: #fff; }
      .page { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
      .job { break-inside: auto; }
      .section-title { break-after: avoid; }
    }
  </style>
</head>
<body>
  <main class="page">
    <header>
      <div class="header-top">
        <h1>${escapeHtml(candidateName)}</h1>
        <div class="contacts">${fallbackContacts.map(([label, value]) => `<span>${label ? `<strong>${escapeHtml(label)}</strong> ` : ""}${escapeHtml(value)}</span>`).join("")}</div>
      </div>
      <p class="headline">${escapeHtml(summary)}</p>
    </header>
    ${keywordOrder.length ? `<section><div class="chips">${keywordOrder.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("")}</div></section>` : ""}
    ${(intro || introItems.length) ? `<section>${renderSectionTitle("个人简介")}${intro ? `<p>${escapeHtml(intro)}</p>` : ""}${renderBulletList(introItems)}</section>` : ""}
    ${(abilityTagItems.length || abilityBulletItems.length) ? `<section>${renderSectionTitle("核心能力")}${renderTagGrid(abilityTagItems)}${renderBulletList(abilityBulletItems)}</section>` : ""}
    ${(structuredWorkItems.length || workItems.length) ? `<section>${renderSectionTitle("工作经历")}<div class="job">${structuredWorkItems.length ? renderEntries(structuredWorkItems) : renderBulletList(workItems)}</div></section>` : ""}
    ${(structuredProjectItems.length || projectItems.length || fallbackProjectBullets.length) ? `<section>${renderSectionTitle("重点项目")}<div class="job">${structuredProjectItems.length ? renderEntries(structuredProjectItems) : fallbackProjectItems}</div></section>` : ""}
    ${remainingItems.length ? `<section>${renderSectionTitle("其他经历")}${renderBulletList(remainingItems)}</section>` : ""}
    ${portfolioItems.length ? `<section>${renderSectionTitle("个人作品")}${renderBulletList(portfolioItems).replace("<ul>", "<ul class=\"work-list\">")}</section>` : ""}
    ${educationItems.length ? `<section>${renderSectionTitle("教育经历")}<div class="education">${educationItems.map((item) => escapeHtml(item.text)).join("<br>")}</div></section>` : ""}
    ${!Object.keys(grouped).length && !fallbackProjectBullets.length ? `<section>${renderSectionTitle("简历内容")}<p class="note">还没有可用于预览的简历 bullet。请先生成或补充简历策略。</p></section>` : ""}
  </main>
</body>
</html>`;
}

export function buildPersonalSiteHtml({ personalSite, careerDirection, resumeStrategy }) {
  const sections = Array.isArray(personalSite?.informationArchitecture) ? personalSite.informationArchitecture : [];
  const copyBlocks = Array.isArray(personalSite?.copyBlocks) ? personalSite.copyBlocks : [];

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Personal Site Preview</title>
  <style>
    :root { color: #172026; background: #f7f8fb; font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    header { min-height: 72vh; display: grid; align-content: center; padding: 8vw; background: #172026; color: #fff; }
    h1 { max-width: 920px; margin: 0; font-size: clamp(42px, 8vw, 96px); line-height: 0.98; letter-spacing: 0; }
    .sub { max-width: 760px; margin-top: 24px; color: #c7d2da; font-size: 20px; line-height: 1.7; }
    main { padding: 56px 8vw; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    article { background: #fff; border: 1px solid #e3e8ef; border-radius: 8px; padding: 20px; }
    h2 { margin: 0 0 22px; font-size: 30px; }
    h3 { margin: 0 0 10px; }
    p, li { color: #52606d; line-height: 1.65; }
    .principles { margin-top: 38px; }
    @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(personalSite?.headline || resumeStrategy?.positioning || careerDirection?.recommendedTrack || "Personal Site")}</h1>
    <p class="sub">${escapeHtml(personalSite?.siteType || "职业身份待确认")} · ${escapeHtml((personalSite?.stylePrinciples || []).slice(0, 2).join(" / "))}</p>
  </header>
  <main>
    <h2>内容结构</h2>
    <div class="grid">
      ${sections.map((item) => `<article><h3>${escapeHtml(item.section)}</h3><p>${escapeHtml(item.purpose)}</p><p>${escapeHtml(item.content)}</p></article>`).join("")}
    </div>
    <section class="principles">
      <h2>候选文案</h2>
      <div class="grid">
        ${copyBlocks.map((item) => `<article><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.copy)}</p></article>`).join("")}
      </div>
    </section>
  </main>
</body>
</html>`;
}

export function inspectResumeHtml(html) {
  const findings = [];
  if (!/@page/.test(html)) findings.push("Missing @page print CSS.");
  if (!/print-color-adjust|webkit-print-color-adjust/i.test(html)) findings.push("Missing print color adjustment.");
  if (/font-size\s*:\s*(?:[0-9](?:\.\d+)?px|1[01](?:\.\d+)?px)\b/i.test(html)) findings.push("Possible unreadable small font size.");
  if (/height\s*:\s*100vh/i.test(html)) findings.push("100vh can cause PDF page break problems.");
  const forbidden = ["pendingQuestions", "layoutNotes", "项目排序", "待确认问题", "版式注意", "项目证据补强", "内部策略", "riskFlags"];
  for (const term of forbidden) {
    if (html.includes(term)) findings.push(`Blocking internal resume field leaked: ${term}`);
  }
  return findings;
}
