
  

  module.exports = {
    apps: [
        {
            name: "source-build-backend",
            script: "npm",
            automation: false,
            args: "run prod",
            env: {
                NODE_ENV: "development"
            },
            env_production: {
                NODE_ENV: "production"
            }
        }
    ]
}