# 博客后台设置指南

后台地址：`https://你的域名/admin`。每天的视频笔记会进入仓库的 `drafts/` 文件夹（不会出现在博客上），你在后台预览、选分类，点「发布」后文章移到 `content/posts/<分类>/<链接名>.md`，Cloudflare Pages 自动重新构建上线。

需要你做三件事：建 GitHub 令牌、配 Cloudflare 环境变量、开 Cloudflare Access 登录保护。**Access 没配好之前，后台接口会一律返回 401（故意的，防止被别人调用）。**

## 一、创建 GitHub 令牌（只给这个仓库）

1. 打开 GitHub → 右上角头像 → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token。
2. 名称随意，例如 `player-maker-admin`；过期时间按你习惯（到期后要回来换新的）。
3. Repository access 选 **Only select repositories**，只勾 `wujiaxuans/Player-Maker`。
4. Permissions → Repository permissions → **Contents** 设为 **Read and write**（Metadata 只读会自动带上），其它不要开。
5. 生成后复制令牌（只显示一次）。

## 二、开启 Cloudflare Access（Zero Trust）

1. Cloudflare 控制台 → **Zero Trust**（第一次进入会让你建一个团队名，记下 `<团队名>.cloudflareaccess.com`，这就是下面的 `ACCESS_TEAM_DOMAIN`）。
2. Settings → Authentication 里确认登录方式有 **One-time PIN**（邮箱一次性验证码）。
3. Access → Applications → 添加应用，类型选 **Self-hosted**。
4. 应用域名/路径填两条（同一个应用里）：
   - `你的域名/admin`
   - `你的域名/api`
   如果你同时用 `xxx.pages.dev` 访问，也把 `xxx.pages.dev/admin`、`xxx.pages.dev/api` 加进去。
5. 策略（Policy）：动作 **Allow**，规则 **Emails** = 你的邮箱（只填你自己）。
6. 保存后，在应用详情里找到 **Application Audience (AUD) Tag**，复制，它是下面的 `ACCESS_AUD`。

界面名称 Cloudflare 偶尔会调整，如果找不到某一项，按上面的意思找最接近的即可。

## 三、在 Cloudflare Pages 设置环境变量

Workers & Pages → 你的博客项目 → Settings → **Variables and Secrets**（或 Environment variables），在 **Production** 环境添加：

| 变量名 | 值 | 类型 |
| --- | --- | --- |
| `GITHUB_TOKEN` | 第一步的令牌 | Secret（加密） |
| `GITHUB_REPO` | `wujiaxuans/Player-Maker` | 普通 |
| `GITHUB_BRANCH` | `main` | 普通 |
| `ADMIN_EMAIL` | 你的邮箱（和 Access 里填的一致） | 普通 |
| `ACCESS_TEAM_DOMAIN` | `<团队名>.cloudflareaccess.com` | 普通 |
| `ACCESS_AUD` | 第二步的 AUD Tag | 普通 |

保存后重新部署一次（Deployments 里对最新一次点 Retry/重新部署），变量才生效。

## 四、使用

1. 打开 `/admin`，输入邮箱收验证码登录。
2. 「草稿箱」：点卡片进入审核；选分类、填链接名（小写字母/数字/-）、标题、摘要、标签、封面路径。
3. 点「发布」：一次提交里新建文章并删除草稿。文章会立刻出现在后台「已发布」列表（读的是仓库，不用等构建）；读者那边要等 Cloudflare 重新构建后才在博客看到，地址是 `#article/<分类>-<链接名>`。
4. 「已发布」：列出 `content/posts/` 下已发布的 Markdown。可改标题/摘要/标签/分类/正文，或点「退回草稿箱」移回 `drafts/`（保留原 BV/YT 草稿名）。
5. 点「删除草稿」：直接删掉这篇草稿。

每篇发布的文章开头会自动加来源说明（原视频链接 + UP主）。草稿缺少链接或UP主时不允许发布。后台「已发布」只包含从草稿发布的文章，不含写在 `src/data.js` 里的旧示例文。

## 五、给定时任务用的脚本

```bash
node scripts/push-draft.mjs "/workspace/bilibili-transcripts/xxx.md"   # 通过已登录的 gh 推到 drafts/
node scripts/push-draft.mjs --dry-run "xxx.md"                           # 只预览不推送
```

脚本只写 `drafts/` 目录。文件名固定为短 ASCII：`BV….md` 或 `YT-….md`（从笔记里的视频 id 推导），中文标题留在正文里。封面放在 `public/media/covers/<id>.png`。

## 可选

- 草稿提交也会触发一次 Pages 构建。嫌浪费的话，可在 Pages 的构建设置里配置「构建监视路径」排除 `drafts/*`（如果你的界面里有这个选项）。
- 本地测试：`npm test`（用模拟数据测试 Markdown 转换、JWT 校验和发布逻辑）。
