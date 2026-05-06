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

export function buildResumeHtml({ resumeStrategy, careerDirection, projectMining, resumeMeta, resumeText }) {
  const bullets = Array.isArray(resumeStrategy?.bullets) ? resumeStrategy.bullets : [];
  const grouped = bullets.reduce((acc, item) => {
    const section = item.section || "经历";
    acc[section] ||= [];
    acc[section].push(item);
    return acc;
  }, {});
  const keywordOrder = Array.isArray(resumeStrategy?.keywordOrder) ? resumeStrategy.keywordOrder : [];
  const projectOrder = Array.isArray(resumeStrategy?.projectOrder) ? resumeStrategy.projectOrder : [];

  const candidateName = resumeMeta?.candidateName || String(resumeText || "").split("\n").map((line) => line.trim()).find(Boolean) || "候选人";

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Resume Preview</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #1f2933;
      background: #f4f6f8;
      font-family: Inter, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      line-height: 1.55;
    }
    main {
      width: 210mm;
      min-height: 297mm;
      margin: 24px auto;
      padding: 18mm;
      background: #fff;
      box-shadow: 0 20px 60px rgba(31, 41, 51, 0.12);
    }
    header { border-bottom: 2px solid #1f2933; padding-bottom: 14px; margin-bottom: 18px; }
    h1 { margin: 0 0 6px; font-size: 28px; line-height: 1.2; letter-spacing: 0; }
    .positioning { margin: 0; color: #52606d; font-size: 14px; }
    section { break-inside: avoid; margin-top: 18px; }
    h2 { margin: 0 0 8px; font-size: 15px; line-height: 1.3; border-bottom: 1px solid #d9e2ec; padding-bottom: 5px; }
    h3 { margin: 12px 0 5px; font-size: 13px; }
    ul { margin: 6px 0 0; padding-left: 18px; }
    li { margin: 4px 0; font-size: 12px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { padding: 3px 7px; border-radius: 999px; background: #edf2f7; color: #334e68; font-size: 12px; }
    .note { color: #627d98; font-size: 12px; margin-top: 4px; }
    @media print {
      body { background: #fff; }
      main { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(candidateName)}</h1>
      <p class="positioning">${escapeHtml(resumeStrategy?.positioning || careerDirection?.recommendedTrack || "职业定位待确认")}</p>
    </header>
    <section>
      <h2>核心关键词</h2>
      <div class="chips">${keywordOrder.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("") || '<span class="chip">待确认</span>'}</div>
    </section>
    <section>
      <h2>项目排序</h2>
      ${list(projectOrder)}
    </section>
    ${Object.entries(grouped)
      .map(([section, items]) => `<section><h2>${escapeHtml(section)}</h2><ul>${items
        .map((item) => `<li>${escapeHtml(item.text || "")}${item.risk ? `<div class="note">风险：${escapeHtml(item.risk)}</div>` : ""}</li>`)
        .join("")}</ul></section>`)
      .join("")}
    <section>
      <h2>待确认问题</h2>
      ${list(resumeStrategy?.pendingQuestions)}
    </section>
    <section>
      <h2>版式注意</h2>
      ${list(resumeStrategy?.layoutNotes)}
    </section>
    <section>
      <h2>项目证据补强</h2>
      ${list((projectMining?.priorityProjects || []).map((item) => `${item.name || "项目"}：${item.why || ""}`))}
    </section>
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
  return findings;
}
