# v0.5 运行与部署

## 本机

Node >=22；推荐Node24。使用根package-lock.json，`npm ci`后运行`npm run check`，再`npm start`。浏览器打开http://127.0.0.1:2567。网页、房间HTTP和WebSocket同源；反向代理必须允许WebSocket升级并转发原路径。

开发时`npm run dev`同时启动2567竞技服务与5173网页，网页连接同主机2567。开发模式只用于本机。若只修改网页，`npm run dev:web`；只启动后端，`npm run dev:server`。

## 同一局域网/多设备

先`npm run build`，然后让正式构建服务监听局域网地址：

```powershell
$env:HOST = '0.0.0.0'
$env:PORT = '2567'
npm start
```

其他设备打开此电脑局域网IP的2567端口，需要操作系统防火墙允许该端口。本地默认仍是127.0.0.1。不要把5173开发服务当部署入口。公网部署使用HTTPS/WSS与可升级WebSocket的反向代理，HOST设置同上。

## 容器

```sh
docker compose up --build
```

默认只映射本机127.0.0.1:2567；要供局域网设备访问，由操作者修改compose端口绑定。镜像保留tsx运行依赖；这是可复现原型镜像，尚未按生产环境精简或做负载验收。本机未安装Docker时，只能验证等效Node构建与启动，不能声称容器已运行。

## 端点

- `GET /health`：进程健康状态。
- `GET /api/catalog`：实际实现的规则、机体参数和缺失能力。
- `GET /api/integrations`：来源登记及运行时接入状态。
- `POST /api/lab/check`：JSON `{ "payloadKg": 0.1 }`，真实受限MuJoCo机械臂验证；输入0.1–5kg，可选targetAngle±0.8rad。拒绝额外字段、XML、远程URL与插件。请求体16KiB、HTTP串行、Worker硬截止。
- `GET /api/matches/:id`：本进程内保存的对局结果；重启清空。
- Colyseus房间`training`（1人）、`arena`（2人）：标准SDK进行`joinOrCreate`/`joinById`，动作消息`input`，服务器`snapshot`与`result`。

默认原型没有身份认证、持久数据库、房间防滥用配额、分布式锁和付费模型调用。当前跨设备目标是现代桌面/手机/平板浏览器；未测机型不宣称正式支持，主机游戏机/封闭终端不在已验证范围。

## 验证

`npm run check`执行类型检查、真实引擎/联机行为测试和网页构建。`npx astryx doctor --built apps/web/dist`核查UI构建。测试本地端口为随机空闲端口，不要求2567服务预先启动。真实引擎测试不使用物理替身；MuJoCo首次加载含WASM冷启动。

来自模型的材质/纹理仍是非受信输入，本版GLB导入采用严格静态子集和资源预算，文件留在浏览器内。没有资产上传或模型供应商凭证配置；`.env`和实际密钥禁止提交。
