# Cloudflare Pages + GitHub 配置

## 1. 本地填写 Cloudflare 参数

复制配置模板：

```powershell
Copy-Item .env.cloudflare.example .env.cloudflare
notepad .env.cloudflare
```

将占位符替换为你自己的内容：

```env
CLOUDFLARE_API_TOKEN=你的Cloudflare_API_Token
CLOUDFLARE_ACCOUNT_ID=你的Cloudflare_Account_ID
```

`.env.cloudflare` 已被 Git 忽略，不会提交到 GitHub。不要把真实 Token 写入 `wrangler.toml`、源代码或聊天内容。

当前 `wrangler.toml` 中的 `YOUR_CLOUDFLARE_ACCOUNT_ID` 只是占位符。部署前可以直接替换为 Account ID，也可以优先通过环境变量提供 Account ID。

## 2. 配置 Remove.bg Secret

在项目目录执行：

```powershell
npx wrangler secret put REMOVE_BG_API_KEY
```

命令提示输入时粘贴 Remove.bg API Key。Secret 不会进入 Git 仓库。

## 3. Cloudflare Pages 原生 GitHub 集成

原生集成需要在 Cloudflare Dashboard 中完成一次 GitHub 授权：

1. 登录 Cloudflare Dashboard。
2. 进入 **Workers & Pages**。
3. 点击 **Create application** → **Pages** → **Connect to Git**。
4. 选择 **GitHub**，授权 Cloudflare GitHub App。
5. 选择仓库 `z229577/image-background-remover`。
6. 生产分支选择 `master`。
7. 构建命令填写：

   ```text
   npm run build
   ```

8. 按照 Cloudflare 当前界面选择 Next.js 的框架预设，并保存部署。
9. 在 Pages 项目的 **Settings → Environment variables** 中添加：

   ```text
   REMOVE_BG_API_KEY = 你的 Remove.bg API Key
   ```

   生产环境和 Preview 环境需要分别配置时，要分别添加。

连接完成后，Cloudflare Pages 会监听 GitHub 仓库的推送，并自动创建部署和预览部署。Cloudflare 官方文档说明，Pages 项目可以连接 GitHub 仓库，并在分支推送后自动部署。

## 4. 本地验证 Wrangler 认证

PowerShell 中可以临时加载配置：

```powershell
$env:CLOUDFLARE_API_TOKEN = "你的Cloudflare_API_Token"
$env:CLOUDFLARE_ACCOUNT_ID = "你的Cloudflare_Account_ID"
npx wrangler whoami
```

如果只想使用 Cloudflare 的浏览器授权，也可以执行：

```powershell
npx wrangler login
```

## 5. 安全要求

- 不提交 `.env.cloudflare`、`.env.local` 或任何真实 Token。
- Cloudflare API Token 建议只授予部署所需的最小权限。
- 如果 Token 曾经公开过，应立即在 Cloudflare 控制台撤销并重新生成。
- Cloudflare Account ID 不是秘密，但也不需要写入前端代码。
