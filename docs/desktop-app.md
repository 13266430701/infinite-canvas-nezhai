# Windows 桌面版

桌面版由 Electron 打包为 Windows x64 安装版和 Portable 版。Electron 只负责加载本地前端文件；模型请求仍由渲染页面直接发送到用户配置的 API 地址，不提供本地 API 代理。

## 构建

先在 `web` 目录安装前端依赖，再在 `desktop` 目录安装桌面依赖：

```powershell
cd web
bun install
cd ../desktop
npm install
npm run dist
```

产物位于仓库根目录的 `release/`，包含安装版和 Portable `.exe`。

开发启动：

```powershell
npm start
```

桌面静态页面固定监听 `127.0.0.1:32100`。端口被占用时程序会提示并退出，不会随机换端口，因为浏览器的 localStorage 和 IndexedDB 按来源隔离，换端口会让已有数据看起来消失。

## New API CORS

本地桌面版直接访问 New API，不需要代理。New API/Nginx 需要允许以下来源访问 `/v1` 请求：

```text
http://127.0.0.1:32100
http://localhost:32100
```

同时允许 `Authorization`、`Content-Type` 请求头、`OPTIONS` 预检、图片/视频 multipart 上传，以及生成结果的读取或下载。

桌面版默认 Base URL 为 `https://nezhai.vip`，API Key 由用户在配置页填写，不随安装包发布。

## 本地数据

画布、配置、图片、视频和生成记录存储在 Electron 的持久用户数据目录中。卸载安装版不会主动删除这些数据；Portable 版和安装版使用同一应用标识，因此可以继续读取同一份用户数据。
