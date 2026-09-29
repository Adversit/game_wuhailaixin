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
- 浏览器本机自动存档；每次有效行动保存，重开需要确认。
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

纯 HTML/CSS/ES modules，无构建依赖。用任意静态 HTTP 服务器托管 `dist/` 即可，勿直接用 file 协议打开模块。

- `dist/game.js`：场景内容、资源与状态转换。
- `dist/app.js`：界面渲染、导航、音频与本机存档。
- `dist/style.css`：桌面、平板、手机响应式布局。
- `dist/assets/`：三张原创 AI 插画，WebP 格式。

站点由 Sites 托管；默认仅用户本人可访问。存档仅在当前浏览器中，不进行云同步。清除浏览器站点数据会清除游戏进度。

## 调研与创作

借鉴玩法设计思路，不复用原作素材、角色与剧情：

- A Dark Room：机制逐渐展开，环境叙事。https://press.doublespeakgames.com/adr/index.html
- Roadwarden：插画与文字选项结合，选择改变回应。https://moralanxietystudio.com/presskit/roadwarden
- Spiritfarer：探索、船上生活与收集回忆。https://thunderlotusgames.com/press-kits/spiritfarer-press-kit/

## 验证

已用状态模拟遍历全部 512 种主线选择组合，检查正常资源模式可达结局、资源再生、重复点击不重复发奖、无限模式切换、全部设施升级和双结局重访。浏览器存档使用 JSON 序列化。

## 静态托管

将 `dist/` 作为网站根目录部署到支持静态文件的 HTTP 服务即可。当前代码使用以 `/` 开头的资源路径；部署到子目录（例如默认的 GitHub 项目 Pages 路径）时，需要先调整资源路径，或配置独立域名并以站点根目录提供服务。

`.openai/hosting.json` 保存现有 Sites 项目标识和静态目录设置，不包含密钥。复制项目自行部署时，可忽略该文件。

## 场景插画

以下为游戏内的原创场景素材，并非页面截图。

| 听风林 | 星眠台 |
| --- | --- |
| ![听风林](dist/assets/forest.webp) | ![星眠台](dist/assets/observatory.webp) |
