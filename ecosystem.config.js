module.exports = {
  apps: [{
    name: 'source-build-backend',
    script: './dist/server.js',
    instances: 1,  // Single instance - no cluster
    exec_mode: 'fork',  // Fork mode instead of cluster
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 5001
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    merge_logs: true,
    max_memory_restart: '1G',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git', 'dist'],
    node_args: '--max-old-space-size=1024'
  }]
};