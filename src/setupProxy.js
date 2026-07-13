// DEV-ONLY proxy (used by `npm start`, never by the production build).
// Routes every /api call — REST and WebSocket — through the API gateway,
// matching how the containerized nginx serves the app in production.
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:8080",
      changeOrigin: true,
      ws: true,
    }),
  );
};
