# 雾海来信：D1 云存档改造与验证

本次以 `Adversit/game_wuhailaixin` 的 `32930bf3d9cf6101f45ab86b2b3737806aa6b466` 为基线；参考 [月下问仙录云存档提交](https://github.com/Adversit/game_yuexiawenxainlu/commit/f5f176fcf535152ea83c2ae47032cc0d05a1c73d)。本说明描述源码能力；线上启用仍需发布 Worker 并应用迁移。

## 先核对结构差异

| 部分 | 月下问仙录参考提交 | 雾海来信原版 | 本次实现 |
| --- | --- | --- | --- |
| 前端 | Vinext/Next 页面 + `public/game.js` | `dist/` 内 HTML、CSS、ES modules | 保留现有结构和插画，接入独立同步模块 |
| 游戏状态 | 修仙角色、境界、年份等 | 岛屿、信件、资源、设施、结局等 | 对雾海状态独立校验，不复用修仙字段 |
| 后端 | `app/api/save/route.ts` | 无 | 原生 Worker 的 `/api/session`、`/api/save` |
| 身份 | Sites 认证头，服务端 helpers | 无 | Worker 读取调度层身份；每次写入核对页面原账号 |
| 数据表 | 按 `user_id` 保存 JSON + revision | 浏览器旧键 `mistbound-letters-v1` | 同样按账号保存，另加 `write_id` 用于重复请求去重 |
| 缓存 | 全局存档键、全局 revision 标记 | 单个本机存档 | 按账号保存存档、同步基线和未确认请求；访客独立 |
| 并发 | 原子 INSERT/UPDATE + 409 | 无 | 保留原子 CAS；双窗口、离线分叉需显式选择 |
| 发布 | Worker + 逻辑 D1 绑定 + Drizzle | `static.directory=dist` | 保留 project_id，移除 static，生成 Worker、资产和迁移 |

`dist/game.js` 没有修改。网络与数据库逻辑留在独立模块，行动仍由原有 `act()` 完成。

## 数据与认证约定

`game_saves` 字段：

| 字段 | 用途 |
| --- | --- |
| `user_id` TEXT PRIMARY KEY | Sites 的当前登录用户 ID；一账号一份主存档 |
| `payload` TEXT NOT NULL | 校验过的 version=1 游戏 JSON |
| `revision` INTEGER NOT NULL DEFAULT 1 | 每次成功写入加一，首次创建为 1 |
| `write_id` TEXT NOT NULL | 最后一次成功写入的请求 ID；重试原快照不会重复加 revision |
| `updated_at` TEXT NOT NULL | 服务端 ISO 时间，仅展示，不用于决定哪份进度更新 |

生产身份只来自 Sites 调度层的 `oai-authenticated-user-id` 和 `oai-authenticated-user-email`。客户端不能通过 body/query 选择数据库中的用户；`accountId` 只用于核对当前页面是否仍属于同一登录账号。旧窗口携带账号 A 的缓存、浏览器会话已变成 B 时，写入返回 `account_changed`，不会写入 B。

这是依赖 Sites 可信认证头的实现。不要把同一个 Worker 暴露到允许客户端伪造这些头的独立入口；生成的配置关闭 `workers_dev`。外部自建托管必须先建立等效的可信认证边界。本地测试身份头只用于本机开发。

## API

所有响应使用 `Cache-Control: private, no-store`，API 不返回公共跨域授权头。

| 接口 | 成功结果 | 常见失败 |
| --- | --- | --- |
| `GET /api/session` | `{user: {id, displayName}}`，访客为 `{user: null}`；不依赖 D1 | 405 |
| `GET /api/save` | `{userId, save, revision, writeId, updatedAt}`；无存档为 `save:null, revision:0` | 401 未登录、503 存储不可用 |
| `PUT /api/save` | 同上；成功返回保存后的完整快照和 revision | 400 格式错误、403 跨来源、413 请求过大、415 非 JSON、409 冲突、503 存储失败 |

PUT 请求示例：

```json
{
  "accountId": "当前会话返回的用户 ID",
  "expectedRevision": 0,
  "writeId": "每个新快照一个 UUID，重试时保持不变",
  "save": {"version": 1, "...": "完整合法游戏状态"}
}
```

上例为结构示意，不可作为实际合法存档提交。客户端使用完整的游戏状态。

首次创建使用 `INSERT ... ON CONFLICT DO NOTHING RETURNING`；更新使用 `UPDATE ... WHERE user_id=? AND revision=? RETURNING`。两者均为单条原子语句，无先读后无条件覆盖。若同账号同时创建或更新，只有一个请求成功，其余收到 409 和最新云端快照。

数据大小按 UTF-8 字节限制为 256000，流式读取时同样限制，无 Content-Length 也不能绕过。校验覆盖岛屿 ID、剧情位置上界、信件/纪念物/结局 ID、设施等级、资源、安全整数、日志最多 100 条和结果结构。服务端只保存白名单字段。读操作从 `first-primary` D1 session 开始，避免读到比已确认基线更旧的副本。

## 缓存、迁移和失败降级

1. 打开页面先查会话，再读取当前账号的缓存。账号确认完成前暂缓游戏行动；请求 8 秒超时后恢复本机玩法。不会用“上次登录的账号”推测当前身份。
2. 缓存键为 `mistbound-letters-cloud-v1:user:<编码后的用户ID>`；访客使用独立 `guest` 键。缓存保存完整状态、已同步快照、revision 和未确认的 PUT 快照/writeId。
3. 每次行动立即缓存，650 毫秒防抖后上传；同一窗口只允许一个 PUT 在途。上传中继续行动会在确认后再上传新快照。
4. 没有云存档的新账号不会在打开页面时无条件写入默认状态。存在旧键时，玩家在设置中预览并确认迁移。原始旧键不删除；确认后标记所属账号，其他账号不会自动导入。访客旧副本同时清空，避免退出后继续展示已经归入账号的旧旅途。
5. 云端读取失败时不上传来源不明的快照。网络恢复、页面重新可见、设置中重连会重新核对身份和云端 revision。
6. PUT 网络失败或 5xx 时，保留精确的未确认快照和 writeId；延迟从 1 秒递增，最多 30 秒。请求已提交但响应丢失时，重试同一请求只确认一次；重开页面也能从 GET 中恢复确认。
7. 本机离线状态基于相同云端 revision 时继续上传；云端已有另一份更新时暂停同步，不按客户端时间决定覆盖、不自动合并。玩家可保留本机或读取云端；选择前保存另一份本机备份。备份失败时拒绝直接丢弃本机进度，可先导出 JSON。
8. 多窗口共享缓存时，覆盖另一窗口未同步的本机快照前先另存备份；各窗口的 revision 仍各自维护，存储事件触发重连。备份使用独立 `:backup:<UUID>` 键，保留 JSON、revision 和原因。不会把另一窗口的 revision 标记套在当前内存状态上。
9. 关闭页面或切到后台尽力刷新；小于 60000 字节的请求使用 keepalive。浏览器关闭不能保证请求完成，未确认快照仍保留在本机，下次打开继续恢复。
10. 本机存储被禁用或容量不足时，设置和状态提示明确显示缓存不可用，并提供导出。若云端仍可用可继续上传；两边均失败时，当前页面内的进度保留到关闭页面为止。

备份不会自动删除，避免破坏玩家未处理的进度；数量过多时需要玩家管理站点数据。JSON 导出作为副本，本次没有新增任意 JSON 导入入口。

## 本地验证

```bash
npm ci
npm test
npm run db:migrate:local
npm run dev
```

本地默认地址为 Wrangler 输出的地址，通常为 `http://127.0.0.1:8787`。直接浏览本地页面是访客；本地开发可用 curl 附带测试身份头验证 GET：

```bash
curl -i http://127.0.0.1:8787/api/save \
  -H 'oai-authenticated-user-id:local-test-a' \
  -H 'oai-authenticated-user-email:a@example.test'
```

打包验证（不发布）：

```bash
npm run build
npx wrangler deploy --dry-run --config dist/server/wrangler.json --outdir .sites-runtime/worker-check
```

自动测试会用真实 SQLite 执行迁移和未修改的生产 SQL，而非用假实现模拟版本检查。覆盖首次创建并发、旧 revision 更新、请求去重、账号切换、迁移、断网恢复、冲突选择、缓存失败、读取超时、延迟返回和上传期间继续行动。剧情兼容验证普通/无限模式各 512 条主线分支。

## Sites 发布与线上验收

1. 将审查后的本次提交合并到 GitHub 的 main。若 Sites 项目的源仓库与这个 GitHub 仓库分离，需要将同一套变更同步到现有 Sites 项目的正式 checkout，不能只更新 GitHub 就假定站点生效。
2. 保留 `.openai/hosting.json` 中原 `project_id=appgprj_6abb831c7f8481919449310bf3ec825a`，保持原访问范围；其中声明 `d1:"DB"`、`r2:null`，不保留 static。
3. 运行 `npm ci`、`npm test`、`npm run build`。新建表的迁移已提交；后续 schema 改动用 `npm run db:generate` 追加新迁移，已应用的 SQL 和 metadata 不得重写。
4. 用 Sites 正常保存版本/部署流程提交源码及构建包；Sites 负责真实 D1 资源、绑定和逐项应用迁移。构建内的零 UUID 和 `mistbound-letters-local` 名称仅为本地 Wrangler 配置，不是线上数据库 ID；不要手工把它当作远端数据库部署。
5. 确认部署成功，D1 中存在 `game_saves`；实际加载 `/api/session` 能得到当前会话身份，API 由 Worker 执行而非静态 404。
6. 完成下列验收后，才能认定在线云存档已启用。

| 用例 | 操作 | 通过标准 |
| --- | --- | --- |
| 新账号 | 登录 A，作一次探索，等状态显示已同步，刷新 | 进度保持，表中 A 为 revision=1 |
| 跨设备 | 同账号另一浏览器打开 | 自动读取同一云端进度 |
| 账号隔离 | 退出 A、登录 B，再切回 A | B 不出现 A 的进度，A 仍可恢复 |
| 旧存档 | 保留旧浏览器数据，登录后点迁移 | 先预览确认；云端保存完成；原始旧 JSON 保留 |
| 两窗口 | 同一账号开两页，分别推进并保存 | 一页收到冲突；双方状态仍可预览；不静默覆盖 |
| 冲突再竞争 | 冲突出现后第三页继续保存，再选择保留本机 | 再次检查 revision，必要时再次冲突 |
| 断网 | 已加载账号后断网行动，刷新前后恢复网络 | 本机进度保留；同 revision 继续，分叉需选择 |
| 丢失响应 | 服务端 PUT 成功，客户端未收到结果后重连 | 不重复增加 revision，更新后的动作继续上传 |
| 未登录 API | 直接 GET/PUT save | 401，无匿名数据库写入 |
| 存储故障 | D1 暂时不可用或浏览器禁用存储 | 明确提示、保留可用副本、可以重试或导出 |
| 原有玩法 | 推进剧情、设施升级、无限模式开关、重温结局 | 逻辑和余额行为与原版一致，存档可重载 |

发布不自动放宽站点权限，不扫描或批量迁移其他用户数据，也不修改已有线上存档。这里只有新建 schema 迁移，没有 runtime CREATE/ALTER 或无条件 DELETE。

## 参考

- [月下问仙录参考提交](https://github.com/Adversit/game_yuexiawenxainlu/commit/f5f176fcf535152ea83c2ae47032cc0d05a1c73d)
- [Cloudflare D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
- [D1 sessions / first-primary](https://developers.cloudflare.com/d1/worker-api/d1-database/#withsession)
- [Workers static assets routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)

## 本次验证记录（2026-10-05）

- `npm test`：16/16 通过；普通与无限模式各遍历 512 条剧情选择路径。
- `node --check dist/app.js`、`node --check dist/cloud-save.js`：通过。
- `npm run build`：通过，入口具有可调用的 `default.fetch`。
- `npm run db:generate`：已生成并核对 SQL、snapshot、journal；再次运行确认无 schema 差异。
- `npm run db:migrate:local`：真实本地 D1 迁移成功；本地数据使用根目录 `.wrangler/state`，重新构建不会删除它。
- `wrangler deploy --dry-run`：通过，识别 DB 和 ASSETS，未发布到线上。
- DOM 冒烟验证：执行实际前端模块，检查启动、剧情点击、存档状态、设置、无限物资开关和账号切换，均通过。使用的是 DOM 模拟环境，不是完整浏览器。
- 本次容器启动常规 Wrangler 预览时报 `uv_interface_addresses` 错误；另行尝试原生 workerd 请求也未能完成初始化，浏览器下载被环境阻断。因此未完成真实浏览器登录、原生 Worker API 端到端和线上跨设备验收；上表中对应步骤仍需部署后执行。
