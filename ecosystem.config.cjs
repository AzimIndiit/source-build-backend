module.exports = {
  apps: [
    {
      name: "source-build-backend",
      script: "./dist/server.js",
      instances: "max",
      exec_mode: "cluster",
      automation: false,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        PORT: 8081
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 8081
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_file: "./logs/pm2-combined.log",
      time: true,
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s"
    }
  ]
}