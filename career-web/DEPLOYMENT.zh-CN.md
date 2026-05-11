# 部署说明

这是本地网页闭环的轻量部署方式。模型计算走 DeepSeek API，服务器只负责上传、解析、文件存储、页面展示和 HTML/PDF 导出。

## 服务器要求

- Node.js 20+
- 1 核 2GB 内存更稳
- 10GB 磁盘即可跑第一版
- 如需服务端 PDF 导出，服务器需要安装 Chrome/Chromium，并配置 `CHROME_PATH`

## 环境变量

在服务器的 `career-web/.env.local` 写入：

```bash
DEEPSEEK_API_KEY=你的 key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro
PORT=5174
HOST=0.0.0.0
```

不要把 `.env.local` 提交到 GitHub。

## 启动

```bash
npm install
npm run build
npm start
```

如果部署到域名子路径，例如 `https://www.lovexb.ltd/test/`，构建时需要指定：

```bash
APP_BASE=/test/ npm run build
```

## PM2 启动

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

## Nginx 反向代理示例

```nginx
server {
  listen 80;
  server_name your-domain.com;

  client_max_body_size 30m;

  location / {
    proxy_pass http://127.0.0.1:5174;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Nginx 子路径反向代理示例

如果现有 `www.lovexb.ltd` 已经有作品集首页，不要新增同名 `server` 块，应该在现有 `server_name www.lovexb.ltd;` 的配置中追加：

```nginx
location = /test {
  return 301 /test/;
}

location /test/ {
  client_max_body_size 30m;
  proxy_pass http://127.0.0.1:5174/;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 登录和隔离配置

当前后端已经支持 cookie session、手机号验证码登录和按用户隔离的 workspace。临时内测可以先用本地测试验证码；外放时建议启用强制登录，并关闭本地测试验证码。

```bash
APP_ORIGIN=https://你的域名
AUTH_REQUIRE_LOGIN=true
AUTH_SESSION_SECRET=一段足够长的随机字符串
AUTH_COOKIE_SECURE=true
PHONE_LOGIN_ENABLED=true
SMS_DEV_LOGIN_ENABLED=false
ALIYUN_SMS_PROVIDER=aliyun_verify
ALIYUN_ACCESS_KEY_ID=你的阿里云 AccessKey
ALIYUN_ACCESS_KEY_SECRET=你的阿里云 AccessKey Secret
ALIYUN_SMS_SIGN_NAME=速通互联验证码
ALIYUN_SMS_TEMPLATE_CODE=100001
ALIYUN_SMS_TEMPLATE_PARAM={"code":"##code##","min":"10"}
ALIYUN_SMS_REGION_ID=cn-hangzhou
ALIYUN_SMS_ENDPOINT=https://dypnsapi.aliyuncs.com
```

如果部署在子路径，例如 `/test/`，仍建议让 API 由同一个域名反代到后端。短信认证会让阿里云动态生成并核验验证码；不要把验证码改成本地生成，否则后端无法通过 `CheckSmsVerifyCode` 完成云端校验。

## 重要隐私提醒

`workspace/` 会保存用户上传的简历、解析文本、职业画像、LLM 结果、导出的简历和个人网站。正式外放前需要补：

- 数据删除能力
- 上传文件大小和类型限制
- 服务器备份/清理策略
