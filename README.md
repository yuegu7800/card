# 角色图鉴 · NEON ARCHIVE

[打开网页](https://yuegu7800.github.io/card/)。目前只有 No.001 **NEON WRAITH** 示例卡；小说角色尚未导入。桌面网页支持直接拖动卡片连续看正反面、材质和景深调整。当前流程是在 Codex 生成卡片后发布，网页本身不调用 AI 服务。

## 添加小说角色卡

1. 向 Codex 提供角色的姓名、外貌、身份，以及可选的参考图、系列名、稀有度、编号和卡背信息。让 Codex 用 `RuiC-card-skill` 生成完整卡片，包括分层素材、`card.glb` 和 `web/card-config.json`。如果不想剧透，把秘密单独标注。
2. 检查生成的卡面和故事文字，再把完成的 `web` 目录导入此仓库：

   ```powershell
   node scripts/add-card.mjs --source C:\path\to\project\web --slug character-id --dry-run
   node scripts/add-card.mjs --source C:\path\to\project\web --slug character-id
   ```

3. 检查本地页面后，将新增的 `cards/<slug>/` 与更新的 `cards.json` 一起提交、推送到 `main`。GitHub Actions 会发布网页。不要只上传单张预览图；导入脚本会复制网页需要的分层素材与 3D 模型。

`cards.json` 是图鉴目录。每张新卡有独立网址 `/card/cards/<slug>/`；根页面保留第一张示例卡。导入脚本不会覆盖现有卡片，同名会报错。

## 卡背档案

在生成项目的 `web/card-config.json` 中可添加 `back`，例如：

```json
{
  "back": {
    "monogram": "LY",
    "eyebrow": "CHARACTER FILE / 002",
    "classification": "SSR · 角色身份",
    "summary": "不含剧透的简短人物简介",
    "fields": [
      { "label": "阵营", "value": "某阵营" },
      { "label": "人物秘密", "value": "隐藏内容", "spoiler": true }
    ]
  }
}
```

标记 `spoiler: true` 的字段默认遮盖，访客点击「显示剧透」才会看见。整个简介若需要遮盖，可设置 `summarySpoiler: true`。建议卡背字段不超过 3 个，文字保持简短，避免在卡面上挤压。

## 技术说明

网页使用 Three.js；当 WebGL 不可用时，尝试用 CSS 3D 显示分层卡。浏览器中的实时材质与 Blender 渲染目标接近，但不保证像素完全一致。
