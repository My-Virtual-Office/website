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
    createProxyMiddleware({
      target: "http://localhost:8084",
      changeOrigin: true,
      ws: true, // Required for WebSockets to upgrade correctly
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
