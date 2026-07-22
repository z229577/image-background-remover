# Image Background Remover MVP 需求文档

## 1. 项目概述

### 1.1 项目名称

Image Background Remover

### 1.2 产品定位

一个无需注册、无需安装、快速在线移除图片背景的工具。用户上传图片后，系统通过 Remove.bg API 自动处理，并返回透明背景 PNG。

### 1.3 MVP 目标

- 验证用户对在线图片背景移除工具的需求。
- 让用户在最少操作下完成“上传—处理—下载”。
- 通过 SEO 页面获取 `image background remover` 及相关长尾关键词流量。
- 不保存用户图片，降低隐私和存储成本。

### 1.4 非目标

MVP 暂不包含用户账户、图片历史记录、在线编辑器、批量处理、支付系统和开放 API 产品化。

## 2. 用户与使用场景

### 2.1 目标用户

- 电商卖家：制作商品白底图或透明商品图。
- 普通用户：制作头像、证件照或社交媒体图片。
- 设计师和营销人员：快速获得透明 Logo、素材和贴图。
- 开发者及内容团队：临时处理图片，不希望注册账号。

### 2.2 核心使用场景

用户打开网站，上传 JPG/PNG/WEBP 图片，等待处理完成，预览透明背景效果，并下载 PNG 文件。

## 3. 产品范围

### 3.1 MVP 必须实现

- 首页工具区。
- 单张图片上传。
- 拖拽上传、点击选择文件、移动端选择文件。
- 图片格式和大小校验。
- 调用 Remove.bg API 移除背景。
- 处理状态展示。
- 原图与结果图预览。
- 透明 PNG 下载。
- 处理失败后的错误提示和重试。
- 隐私说明和基础 SEO 内容。
- Cloudflare 部署。

### 3.2 后续版本

- 背景颜色替换。
- 自定义背景图片。
- 批量处理。
- 高清导出和会员套餐。
- 用户账户和历史记录。
- Remove.bg API 代理服务。

## 4. 页面与信息架构

### 4.1 首页 `/`

首页承担工具使用、SEO 和转化功能。

主要模块：

1. 顶部导航：Logo、How it works、FAQ。
2. Hero 区：标题、副标题、上传组件。
3. 结果区：原图/处理结果预览、下载按钮。
4. 使用步骤：Upload、Remove、Download。
5. 应用场景：Product photo、Profile picture、Logo、Social media。
6. 隐私与安全说明。
7. FAQ。
8. Footer：隐私政策、服务条款、联系邮箱。

### 4.2 SEO 长尾页面

MVP 可先创建以下静态页面：

- `/remove-background-from-photo`
- `/remove-background-from-product-photo`
- `/remove-background-from-logo`
- `/remove-background-from-profile-picture`

每个页面都应包含相关说明，并链接回首页工具。

## 5. 核心功能需求

### 5.1 图片上传

用户可以通过以下方式上传图片：

- 点击上传区域选择文件。
- 将图片拖拽到上传区域。
- 在支持的设备上使用系统文件选择器。

支持格式：JPG、JPEG、PNG、WEBP。

默认限制：单张图片不超过 10 MB。具体上限应根据 Cloudflare Worker 和 Remove.bg API 的实际限制配置，并在前端明确提示。

验收标准：

- 不支持的格式不能进入处理流程。
- 超出大小限制时显示明确错误。
- 上传成功后展示文件名、缩略图和删除/重新选择入口。

### 5.2 背景移除

前端将图片以 `multipart/form-data` 发送到自己的 Worker 接口：

```text
POST /api/remove-background
```

Worker 负责：

1. 校验请求方法、文件类型和文件大小。
2. 从 Cloudflare Secret 读取 Remove.bg API Key。
3. 将图片直接转发给 Remove.bg。
4. 接收处理后的 PNG。
5. 将 PNG 直接返回给浏览器。
6. 不写入 R2、KV、数据库或本地磁盘。

验收标准：

- API Key 不出现在浏览器请求、HTML、JavaScript 或日志中。
- 成功时返回透明 PNG。
- 失败时返回统一 JSON 错误结构。
- 请求结束后不保留用户图片。

### 5.3 处理状态

至少支持以下状态：

- `idle`：等待上传。
- `validating`：校验图片。
- `processing`：正在移除背景。
- `success`：处理完成。
- `error`：处理失败。

处理期间应禁用重复提交，并显示加载动画或进度文案，例如：`Removing background…`。

### 5.4 结果预览

处理成功后展示：

- 原图。
- 透明背景结果图。
- 棋盘格透明背景。
- 重新上传按钮。
- 下载 PNG 按钮。

MVP 可使用左右对比布局；移动端改为上下布局。

### 5.5 下载

用户点击下载后，浏览器使用返回结果创建 Blob，并下载为：

```text
background-removed.png
```

不要求服务端保存下载文件。

## 6. 错误处理

错误提示应使用用户能理解的语言，不直接暴露 Remove.bg 的内部错误。

| 场景 | 前端提示 |
|---|---|
| 格式不支持 | Please upload a JPG, PNG, or WEBP image. |
| 文件过大 | Image must be smaller than 10 MB. |
| API 额度不足 | The service is temporarily unavailable. Please try again later. |
| 图片无法处理 | We couldn't remove the background from this image. Try another image. |
| 网络失败 | Network error. Please check your connection and retry. |
| 请求过于频繁 | Too many requests. Please wait a moment and try again. |

所有错误都应提供重新上传或重试入口。

## 7. 隐私与安全要求

- 用户图片只在请求处理期间存在于内存中。
- 不使用持久化图片存储。
- 不记录图片二进制内容。
- API Key 使用 Cloudflare Workers Secret 管理。
- 后端限制请求方法、文件类型和文件大小。
- 配置基础 Rate Limit，防止 API 被滥用。
- 生产环境启用 HTTPS。
- 隐私政策明确说明图片不会被网站长期保存。

## 8. 技术方案

### 8.1 技术栈

- 前端：Next.js 或 Vite + React。
- 样式：Tailwind CSS。
- 后端：Cloudflare Workers。
- 部署：Cloudflare Pages 托管前端，Worker 提供 API；也可以使用 Pages Functions 统一部署。
- 第三方服务：Remove.bg API。
- 存储：无。

### 8.2 环境变量

```text
REMOVE_BG_API_KEY
ALLOWED_ORIGIN
MAX_FILE_SIZE
```

### 8.3 API 响应

成功：

```text
HTTP 200
Content-Type: image/png
```

失败：

```json
{
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "We couldn't remove the background from this image."
  }
}
```

## 9. SEO 需求

首页建议：

- Title：`Image Background Remover – Remove Background from Images Free`
- H1：`Image Background Remover`
- Description：说明免费、在线、快速、透明 PNG 和无需注册。

内容要求：

- 首页只设置一个 H1。
- 上传工具在首屏可见。
- 页面包含真实前后效果示例。
- 提供 FAQ 结构化内容。
- 长尾页面不能只是替换关键词，应有独立的使用场景内容。
- 图片使用描述性 alt 文本。
- 提供 sitemap.xml、robots.txt 和 canonical。
- 页面具备良好的移动端 Core Web Vitals 表现。

## 10. 数据分析

MVP 只收集不包含图片内容的匿名事件：

- `page_view`
- `upload_started`
- `upload_rejected`
- `processing_started`
- `processing_success`
- `processing_failed`
- `download_clicked`
- `retry_clicked`

核心指标：

- 上传转化率：上传用户数 / 首页访问用户数。
- 处理成功率：成功处理数 / 开始处理数。
- 下载率：下载数 / 成功处理数。
- 平均处理耗时。
- API 单次处理成本。

不采集原图、结果图或可识别图片内容。

## 11. 非功能需求

- 首屏在常见移动网络下尽快可交互。
- 常规图片处理成功率目标不低于 95%。
- 失败请求可重试，不造成页面卡死。
- 处理按钮、下载按钮具备键盘可访问性。
- 支持主流桌面和移动浏览器。
- 前端不暴露 Remove.bg API Key。

## 12. MVP 验收标准

- 用户无需注册即可上传图片。
- JPG、PNG、WEBP 图片能正常处理。
- 成功结果为透明 PNG。
- 结果可以直接下载。
- 上传、处理中、成功、失败状态清晰可见。
- 不支持的文件会被拦截并提示原因。
- API Key 未暴露在客户端。
- 图片不写入任何持久化存储。
- 网站可部署到 Cloudflare。
- 首页和至少 4 个长尾 SEO 页面可被搜索引擎抓取。
- 桌面端和移动端主要流程均可完成。

## 13. 开发排期建议

### 第 1 阶段：基础工具

- 搭建前端页面。
- 完成上传组件和预览。
- 完成 Worker API。
- 接入 Remove.bg。

### 第 2 阶段：体验与安全

- 增加状态、错误和重试。
- 增加文件校验、CORS 和 Rate Limit。
- 完成移动端适配。
- 完成隐私说明。

### 第 3 阶段：SEO 与发布

- 完成首页 SEO。
- 创建 4 个长尾页面。
- 增加 sitemap 和 robots.txt。
- 配置 Cloudflare 域名和生产 Secret。
- 进行真实图片测试和上线验收。

## 14. MVP 上线后的判断标准

上线后重点观察前两周数据：

- 是否有人上传图片并完成下载。
- 哪些图片类型失败率较高。
- Remove.bg API 成本是否可接受。
- 用户是否需要背景替换或批量处理。
- 哪些长尾页面带来实际上传行为。

只有当“处理成功率、下载率和单次成本”达到可接受水平后，再投入批量处理、账号和付费功能。
