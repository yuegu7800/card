const list = document.querySelector("#catalogue-list");
const count = document.querySelector("#catalogue-count");
const current = new URL(window.location.href);

function makeCard(entry) {
  const link = document.createElement("a");
  link.className = "archive-card";
  link.href = new URL(entry.href, import.meta.url).href;
  link.setAttribute("aria-label", `查看 ${entry.title} 角色卡`);
  if (new URL(link.href).pathname === current.pathname) link.setAttribute("aria-current", "page");

  const image = document.createElement("img");
  image.src = new URL(entry.image, import.meta.url).href;
  image.alt = `${entry.title} 卡面预览`;
  image.loading = "lazy";
  image.decoding = "async";

  const body = document.createElement("span");
  body.className = "archive-card-body";
  const kicker = document.createElement("span");
  kicker.className = "archive-card-kicker";
  kicker.textContent = `${entry.edition || "—"} / ${entry.kind === "sample" ? "示例卡" : entry.rarity || "角色卡"}`;
  const title = document.createElement("strong");
  title.textContent = entry.title;
  const subtitle = document.createElement("span");
  subtitle.className = "archive-card-subtitle";
  subtitle.textContent = entry.subtitle || entry.collection || "角色档案";
  const description = document.createElement("span");
  description.className = "archive-card-description";
  description.textContent = entry.description || "点击查看完整的 3D 角色卡。";
  const action = document.createElement("span");
  action.className = "archive-card-action";
  action.textContent = "查看卡片 ↗";
  body.append(kicker, title, subtitle, description, action);
  link.append(image, body);
  return link;
}

try {
  const response = await fetch(new URL("./cards.json", import.meta.url));
  if (!response.ok) throw new Error(`图鉴未能加载 (${response.status})`);
  const catalogue = await response.json();
  const entries = Array.isArray(catalogue.cards) ? catalogue.cards : [];
  list.replaceChildren(...entries.map(makeCard));
  count.textContent = String(entries.length).padStart(2, "0");
  document.querySelector("#archive-next-index").textContent = String(entries.length + 1).padStart(3, "0");
  if (!entries.length) list.textContent = "图鉴暂时没有卡片。";
} catch (error) {
  list.textContent = "图鉴暂时无法加载，请稍后刷新页面。";
  console.warn("[card-catalogue]", error);
}
