module.exports = {
  apps: [
    {
      name: "career-web",
      script: "server/index.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: "5174"
      }
    }
  ]
};
