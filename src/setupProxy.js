const { createProxyMiddleware } = require("http-proxy-middleware");

let wsUpgradeInitialized = false;

module.exports = function (app) {
  const wsRoutes = [];

  function ensureWsUpgrade(server) {
    if (!wsUpgradeInitialized) {
      wsUpgradeInitialized = true;
      server.on("upgrade", (upgradeReq, socket, head) => {
        for (const route of wsRoutes) {
          if (upgradeReq.url.startsWith(route.path)) {
            route.proxy.upgrade(upgradeReq, socket, head);
            break;
          }
        }
      });
    }
  }

  const chatProxy = createProxyMiddleware({
    target: "http://localhost:8084",
    changeOrigin: true,
  });

  wsRoutes.push({ path: "/api/chat", proxy: chatProxy });

  app.use("/api/chat", (req, res, next) => {
    const server = req.socket?.server;
    if (server) ensureWsUpgrade(server);
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
  app.use(
    "/api/notifications",
    createProxyMiddleware({
      target: "http://localhost:8082",
      changeOrigin: true,
    }),
  );

  app.use(
    "/api/workspace",
    createProxyMiddleware({
      target: "http://localhost:8087",
      changeOrigin: true,
    }),
  );

  const roomsProxy = createProxyMiddleware({
    target: "http://localhost:8086",
    changeOrigin: true,
  });

  wsRoutes.push({ path: "/ws/rooms", proxy: roomsProxy });

  app.use("/api/rooms", (req, res, next) => {
    return roomsProxy(req, res, next);
  });

  app.use("/ws/rooms", (req, res, next) => {
    const server = req.socket?.server;
    if (server) ensureWsUpgrade(server);
    return roomsProxy(req, res, next);
  });
};
