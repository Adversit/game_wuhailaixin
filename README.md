# 雾海来信 · Mistbound Letters

**[在线试玩](https://mistbound-letters.dingikang.chatgpt.site)** · 原创文字休闲冒险

> 当前试玩站点保留原有访问权限，可能需要作者授权。你也可以下载代码，在本地直接运行。

![灯塔港原创场景插画](dist/assets/harbor.webp)

一个以中文文字、原创插画与轻量资源经营为主的单人休闲游戏。驾驶晚安号，游历灯塔港、听风林、沉钟湾、星眠台与无名灯塔；在故事中作出选择，收集信件与纪念物，修复最后的灯。

## 游戏内容

- 5 个地点，9 个主线事件，18 个叙事选项，2 个可重复体验的结局。
- 4 封可重读的来信，6 种纪念物，6 种循环沿岸奇遇。
- 3 类船舱设施，每类 3 级；免费休息，材料可再生，无时间失败条件。
- 无限物资测试模式：免除资源和精力消耗，不跳过剧情，不污染原有资源余额。
- Sites D1 账号云存档；每次有效行动先缓存到本机，再同步到当前 ChatGPT 账号。支持旧存档迁移、离线续存和并发冲突选择；重开需要确认并先留备份。
- 可开关的合成海浪环境声和选择提示音；尊重减少动态效果偏好。

## 快速开始

需要 Python 3，无需安装第三方依赖：

```bash
git clone https://github.com/Adversit/game_wuhailaixin.git
cd game_wuhailaixin
python3 -m http.server 8000 --directory dist
```

Windows 如无 `python3` 命令，可改用 `py -m http.server 8000 --directory dist`。

打开 http://localhost:8000 。不要直接双击 `index.html`，浏览器会限制通过文件协议加载 ES modules。

## 怎么玩

1. 在「继续旅途」阅读场景并选择回应。
2. 完成当前地点的故事后，在「雾海航图」选择下一站。
3. 「沿岸探索」获得贝币、浮木、星屑和纪念物；精力不足时可以免费休息。
4. 在「晚安号」升级船舱、渔网和航灯；在「我的邮袋」重读来信。
5. 结局后仍可继续探索，也可以重温最后的选择，收集另一种结局。

**无限物资测试**：电脑端左下角「无限物资」，手机端右上角「设置」。开启后免除物资和精力消耗，不跳过剧情；关闭后继续使用原有库存。

## 运行与实现

游戏仍使用 HTML/CSS/ES modules，`dist/game.js` 的纯状态转换逻辑保持不变。静态 HTTP 服务器可以继续运行游戏和访客本机存档；账号云存档需要 Sites Worker + D1，不能仅靠静态托管启用。

- `dist/game.js`：场景内容、资源与状态转换。
- `dist/app.js`：界面渲染、导航、音频与云存档设置入口。
- `dist/cloud-save.js`：账号隔离的本机缓存、旧存档迁移、同步队列与冲突选择。
- `dist/save-format.js`：浏览器与 API 共用的存档格式校验。
- `server/`、`db/game-save.js`：Worker、身份读取和 D1 读写 API。
- `db/schema.ts`、`drizzle/`：存档表和数据库迁移。
- `dist/style.css`：桌面、平板、手机响应式布局。
- `dist/assets/`：三张原创 AI 插画，WebP 格式。

站点由 Sites 托管；保持原有访问权限。部署本次 Worker 改造并应用 D1 迁移后，同一 ChatGPT 账号可以跨设备继续，不同账号的存档相互隔离。清除浏览器数据会删除尚未同步的进度和本机备份；已成功同步的存档可从云端恢复。GitHub 源码更新本身不会自动更新在线站点。

旧版本的 `mistbound-letters-v1` 存档保留原始数据。登录后，在「设置 → 迁移此设备旧存档」预览并确认迁移；不会自动把没有账号信息的旧进度归入某个账号，也不会无提示覆盖云端进度。

### 云存档开发与验证

需要 Node.js 22.13 或更新版本：

```bash
npm ci
npm test
npm run db:migrate:local
npm run dev
```

本地 Worker 默认没有真实 ChatGPT 会话；可用测试身份请求验证 API。线上身份必须来自 Sites 调度层，不能接受浏览器自行指定的用户 ID。

完整接口约定、结构对比、断网与冲突策略、Sites 部署步骤和验收用例见 [云存档改造说明](docs/CLOUD_SAVE.md)。

## 调研与创作

借鉴玩法设计思路，不复用原作素材、角色与剧情：

- A Dark Room：机制逐渐展开，环境叙事。https://press.doublespeakgames.com/adr/index.html
- Roadwarden：插画与文字选项结合，选择改变回应。https://moralanxietystudio.com/presskit/roadwarden
- Spiritfarer：探索、船上生活与收集回忆。https://thunderlotusgames.com/press-kits/spiritfarer-press-kit/

## 验证

`npm test` 使用实际 SQLite 执行生成的迁移和生产 SQL，验证账号隔离、原子 revision 检查、保存响应丢失后重试、旧存档迁移、离线续存、并发冲突、缓存不可用和延迟请求。另遍历全部 512 种主线选择组合，在普通和无限资源两种模式下校验每一步均可完整存档。

## 静态托管

将 `dist/` 作为网站根目录部署到支持静态文件的 HTTP 服务即可。当前代码使用以 `/` 开头的资源路径；部署到子目录（例如默认的 GitHub 项目 Pages 路径）时，需要先调整资源路径，或配置独立域名并以站点根目录提供服务。

`.openai/hosting.json` 保留现有 Sites 项目标识并声明逻辑 `DB` 绑定，不包含密钥。`npm run build` 输出 `dist/server/index.js`、`dist/client/` 和 `dist/.openai/drizzle/`；不能再用仅静态部署的方式启用数据库存档。复制到其他托管环境时，需要另外提供可信认证边界和 D1 绑定。

## 场景插画

以下为游戏内的原创场景素材，并非页面截图。

| 听风林 | 星眠台 |
| --- | --- |
| ![听风林](dist/assets/forest.webp) | ![星眠台](dist/assets/observatory.webp) |


## 2026-10-09 玩法扩展

新增三份岛屿委托：漂流苗圃、旧钟修缮、远方星图。交付需完成当地故事、抵达相应岛屿并支付物资；每项只能结算一次，兼容旧存档与云同步。
