const { createProxyMiddleware } = require("http-proxy-middleware");

let wsProxySubscribed = false;

module.exports = function (app) {
  const chatProxy = createProxyMiddleware({
    target: "http://localhost:8084",
    changeOrigin: true,
  });

  app.use("/api/chat", (req, res, next) => {
    if (!wsProxySubscribed) {
      const server = req.socket?.server;
      if (server) {
        server.on("upgrade", (upgradeReq, socket, head) => {
          if (upgradeReq.url.startsWith("/api/chat")) {
            chatProxy.upgrade(upgradeReq, socket, head);
          }
        });
        wsProxySubscribed = true;
      }
    }
    return chatProxy(req, res, next);
  });

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
    "/api/tasks",
    createProxyMiddleware({
      target: "http://localhost:8085",
      changeOrigin: true,
    }),
  );
};
