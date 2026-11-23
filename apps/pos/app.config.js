// app.json plus, for the web copy only, the folder it is served from (SKWYD_WEB_BASE=/pos-app); the APK build doesn't set it
module.exports = ({ config }) => ({ ...config, experiments: { ...(config.experiments || {}), ...(process.env.SKWYD_WEB_BASE ? { baseUrl: process.env.SKWYD_WEB_BASE } : {}) } });
