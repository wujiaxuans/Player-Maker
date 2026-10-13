# PLAYER / MAKER — 游戏与设计的个人博客

React + Vite 构建的响应式个人博客，采用灰蓝色视觉、文章分类与独立文章页，并用 GSAP 和 ScrollTrigger 呈现首页 opening、章节标题与文章卡片动效。

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
- `src/data.js`：分类与示例文章数据。
- `src/styles.css`：全站样式与响应式布局。
- `public/media/`：首页背景、文章配图与纹理资源。

文章用 `#article/methods-1` 形式的地址，支持直接打开及刷新。首页提供分类筛选和文章卡片，归档页列出全部文章。动效尊重系统减少动态效果设置；手机端不运行持续视差。

文章文字目前是示例内容。对外发布前，请替换成自己的文章、邮箱和微信信息，并确认所用图片素材的授权范围。
