const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api/auth",
    createProxyMiddleware({
      target: "http://localhost:8081",
      changeOrigin: true,
    }),
  );
  app.use(
    "/api/users",
    createProxyMiddleware({
      target: "http://localhost:8081",
      changeOrigin: true,
    }),
  );
  app.use(
    "/api/chat",
    createProxyMiddleware({
      target: "http://localhost:8084",
      changeOrigin: true,
      ws: true,
    }),
  );
};
