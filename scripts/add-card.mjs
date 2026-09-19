#!/usr/bin/env node
// Add the finished web output of RuiC-card-skill to this static card archive.
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const argumentsList = process.argv.slice(2);
const option = (name) => {
  const index = argumentsList.indexOf(name);
  return index >= 0 ? argumentsList[index + 1] : undefined;
};
const sourceOption = option("--source");
const slug = option("--slug");
const dryRun = argumentsList.includes("--dry-run");
const siteRoot = path.resolve(option("--site") || path.join(scriptDir, ".."));

if (!sourceOption || !slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error("Usage: node scripts/add-card.mjs --source <project-or-web-dir> --slug <lowercase-id> [--dry-run]");
  process.exit(2);
}

const exists = async (file) => {
  try { return (await stat(file)).isFile(); } catch { return false; }
};
const sourceInput = path.resolve(sourceOption);
const webRoot = await exists(path.join(sourceInput, "web", "card-config.json"))
  ? path.join(sourceInput, "web") : sourceInput;
const configPath = path.join(webRoot, "card-config.json");
if (!await exists(configPath)) throw new Error(`找不到卡片配置：${configPath}`);

const config = JSON.parse(await readFile(configPath, "utf8"));
if (!config.title || typeof config.title !== "string") throw new Error("card-config.json 缺少 title");
if (!config.assets || typeof config.assets !== "object") throw new Error("card-config.json 缺少 assets");
for (const key of ["subject", "background", "text", "model"]) {
  if (!config.assets[key]) throw new Error(`card-config.json 缺少素材：${key}`);
}

const manifestPath = path.join(siteRoot, "cards.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (!Array.isArray(manifest.cards)) throw new Error("cards.json 缺少 cards 数组");
if (manifest.cards.some((entry) => entry.id === slug)) throw new Error(`图鉴中已有 ${slug}`);
const destination = path.join(siteRoot, "cards", slug);
try {
  await stat(destination);
  throw new Error(`目标目录已存在：${destination}`);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const assetPaths = new Set([...Object.values(config.assets), "./assets/preview.webp"]);
const files = [];
for (const assetPath of assetPaths) {
  if (typeof assetPath !== "string" || !/^\.\/assets\/[\w.-]+$/.test(assetPath)) {
    throw new Error(`素材路径必须是当前卡片 assets 下的文件：${assetPath}`);
  }
  const sourceFile = path.resolve(webRoot, assetPath);
  if (!await exists(sourceFile)) throw new Error(`找不到素材：${sourceFile}`);
  files.push({ sourceFile, relativePath: assetPath.slice(2) });
}

const settings = JSON.parse(await readFile(path.join(siteRoot, "site-settings.json"), "utf8"));
const publicBaseUrl = new URL(settings.publicBaseUrl);
if (!publicBaseUrl.pathname.endsWith("/")) throw new Error("publicBaseUrl 必须以 / 结尾");

if (!config.back) {
  const initials = config.title.split(/\s+/).map((part) => part[0]).join("").slice(0, 2) || config.title.slice(0, 2);
  config.back = {
    monogram: initials.toUpperCase(),
    eyebrow: "CHARACTER FILE",
    classification: config.subtitle || "角色卡",
    summary: config.description || "",
    fields: [
      { label: "系列", value: config.collection || "原创角色" },
      { label: "视觉线索", value: config.tagline || "—" },
      { label: "卡面工艺", value: config.technique || "—" }
    ]
  };
}

const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
let page = await readFile(path.join(siteRoot, "index.html"), "utf8");
const replaceRequired = (pattern, replacement, label) => {
  const updated = page.replace(pattern, replacement);
  if (updated === page) throw new Error(`卡片模板缺少 ${label}`);
  page = updated;
};
replaceRequired(/href="\.\/style\.css(\?[^\"]*)?"/, (_, suffix = "") => `href="../../style.css${suffix}"`, "style.css");
replaceRequired(/src="\.\/app\.bundle\.js(\?[^\"]*)?"/, (_, suffix = "") => `src="../../app.bundle.js${suffix}"`, "app.bundle.js");
replaceRequired(/src="\.\/catalogue\.js(\?[^\"]*)?"/, (_, suffix = "") => `src="../../catalogue.js${suffix}"`, "catalogue.js");
replaceRequired('href="./assets/favicon.svg"', 'href="../../assets/favicon.svg"', "favicon");
replaceRequired('class="wordmark" href="./"', 'class="wordmark" href="../../"', "图鉴首页链接");

page = page.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(config.title)} · 全息角色卡</title>`);
page = page.replace(/(<meta name="description" content=")[^"]*(" \/>)/,
  (_, start, end) => `${start}${escapeHtml(config.back.summary || config.description || config.title)}${end}`);
page = page.replace(/(<meta property="og:title" content=")[^"]*(" \/>)/,
  (_, start, end) => `${start}${escapeHtml(config.title)} · 全息角色卡${end}`);
page = page.replace(/(<meta property="og:description" content=")[^"]*(" \/>)/,
  (_, start, end) => `${start}${escapeHtml(config.back.summary || config.description || config.title)}${end}`);
page = page.replace(/(<meta property="og:image" content=")[^"]*(" \/>)/,
  (_, start, end) => `${start}${new URL(`cards/${slug}/assets/preview.webp`, publicBaseUrl)}${end}`);
page = page.replace(/(class="static-poster"\s+src=")[^"]*(")/,
  (_, start, end) => `${start}./assets/preview.webp${end}`);
page = page.replace(/(class="static-poster"[\s\S]*?alt=")[^"]*(")/,
  (_, start, end) => `${start}${escapeHtml(config.title)} 卡面预览${end}`);
page = page.replace(/(<h1 id="card-title">)[^<]*(<\/h1>)/,
  (_, start, end) => `${start}${escapeHtml(config.title)}${end}`);
page = page.replace(/(<span id="subtitle">)[^<]*(<\/span>)/,
  (_, start, end) => `${start}${escapeHtml(config.subtitle || "")}${end}`);
page = page.replace(/(<p id="description">)[^<]*(<\/p>)/,
  (_, start, end) => `${start}${escapeHtml(config.description || "")}${end}`);
page = page.replace(/<div id="catalogue-list" class="archive-list" aria-live="polite">[\s\S]*?<\/div>/,
  '<div id="catalogue-list" class="archive-list" aria-live="polite"><a href="../../">返回图鉴首页</a></div>');

const rarity = config.rarity || config.subtitle?.match(/\b(?:SSR|SR|R)\b/i)?.[0] || "角色卡";
manifest.cards.push({
  id: slug,
  kind: "character",
  title: config.title,
  subtitle: config.profile?.role || config.collection || "原创角色",
  edition: config.edition || "—",
  collection: config.collection || "",
  rarity,
  description: config.back.summary || config.description || "",
  image: `./cards/${slug}/assets/preview.webp`,
  href: `./cards/${slug}/`
});

if (dryRun) {
  console.log(`检查通过：${config.title}，${files.length} 个素材，将加入 ${manifest.cards.length} 张卡的图鉴。`);
  process.exit(0);
}

await mkdir(path.dirname(destination), { recursive: true });
await mkdir(destination, { recursive: false });
for (const file of files) {
  const output = path.join(destination, file.relativePath);
  await mkdir(path.dirname(output), { recursive: true });
  await copyFile(file.sourceFile, output);
}
await writeFile(path.join(destination, "card-config.json"), JSON.stringify(config, null, 2) + "\n");
await writeFile(path.join(destination, "index.html"), page);
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`已加入 ${config.title}：cards/${slug}/（图鉴共 ${manifest.cards.length} 张）`);
