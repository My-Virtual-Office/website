// DEV-ONLY proxy (used by `npm start`, never by the production build).
// Routes every /api call — REST and WebSocket — through the API gateway,
// matching how the containerized nginx serves the app in production.
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  // Pass the path context as the FIRST arg so http-proxy-middleware scopes its
  // WebSocket `upgrade` handler to /api only. Mounting with app.use("/api", ...)
  // leaves the proxy's WS filter at "/" and it hijacks the dev-server HMR socket
  // (/ws) -> "Invalid frame header". Scoping to /api leaves /ws for webpack.
  app.use(
    createProxyMiddleware("/api", {
      target: "http://localhost:8080",
      changeOrigin: true,
      ws: true,
    }),
  );
};
