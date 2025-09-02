module.exports = {
    apps: [
      {
        name: "source-build-backend",
        script: "src/server.ts",
        interpreter: "ts-node",   // or "tsx"
        env: {
          NODE_ENV: "development",
        },
        env_production: {
          NODE_ENV: "production",
        },
      },
    ],
  };
  