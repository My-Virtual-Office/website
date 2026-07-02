const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api/auth",
    createProxyMiddleware({
      target: "http://localhost:8091",
      changeOrigin: true,
    }),
  );
  app.use(
    "/api/users",
    createProxyMiddleware({
      target: "http://localhost:8091",
      changeOrigin: true,
    }),
  );
  app.use(
    "/api/chat",
    createProxyMiddleware("/api/chat", {
      target: "http://localhost:8084",
      changeOrigin: true,
      ws: true,
    }),
  );

  app.use(
    "/api/tasks",
    createProxyMiddleware({
      target: "http://localhost:8085",
      changeOrigin: true,
    }),
  );

};
