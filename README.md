# PLAYER / MAKER — 游戏与设计的个人博客

React + Vite 构建的个人游戏设计博客，优先桌面宽屏布局，采用墨绿与青柠配色。包含文章分类、独立文章页、设计卡片库、每日推荐与最近新增，并用 GSAP 和 ScrollTrigger 呈现首次入场动效。

## 本地运行

需要 Node.js 22.12 或更新版本。

```sh
npm install
npm run dev
```

生产构建与本地预览：

```sh
npm run build
npm run preview
```

## 项目结构

- `src/main.jsx`：页面装配、分类状态及文章哈希路由。
- `src/components.jsx`：导航、首页、文章分类与归档、联系页脚。
- `src/motion.js`：GSAP opening、ScrollTrigger 动效、响应式和减少动态效果支持。
- `src/reading.jsx`：独立文章页。
- `src/data.js`：文章分类元数据；已发布文章位于 `content/posts/`。
- `src/DesignCards.jsx`：卡片筛选、连续浏览、居中详情、每日推荐与新增列表。
- `src/Stack.jsx`：推荐卡片的拖动堆叠交互（基于用户提供的 React Bits Stack）。
- `src/cardDiscovery.js`：北京时间日期、每日固定推荐及最近三天筛选。
- `src/styles.css`：全站样式与响应式布局。
- `public/media/`：首页背景、文章配图与纹理资源。

文章用 `#article/methods-1` 形式的地址，支持直接打开及刷新。首页提供分类筛选和文章卡片，归档页列出全部文章。动效尊重系统减少动态效果设置；手机端不运行持续视差。

## 设计卡片

- `#cards`：完整卡片库，支持分类和标签筛选、滑动条及居中详情。
- `#cards/today`：每日三张固定推荐，支持拖动与按钮换卡。
- `#cards/recent`：今天及前两个自然日新增的卡片。
- `node scripts/sync-cards.mjs [libraryDir]`：同步本地设计卡片库。新 slug 自动记录北京时间 `addedAt`，原有日期保留；无日期的历史卡片不计入新增。

目前六张旧卡的 `addedAt` 被设置为 2026-10-15 至 2026-10-17，用于经用户确认的新增列表预览。这些是展示日期，不代表原始创作时间；超过三天后自动退出新增列表。

首页烟雾使用仓库内的静态纹理缓慢漂移，离屏与页面隐藏时暂停。卡片几何背景由固定种子生成静态 SVG；减少动态效果设置受到支持。

运行 `npm test` 验证数据解析、分页、路由、卡片筛选、固定推荐和日期边界。
