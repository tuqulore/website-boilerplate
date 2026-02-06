import handler from "serve-handler";
import http from "node:http";

const server = http.createServer((request, response) => {
  return handler(request, response, {
    public: "dist",
    etag: true,
  });
});

const port = process.env.PORT ?? 8080;
const baseUrl = process.env.BASE_URL ?? "http://localhost";

server.listen(port, () => {
  console.log(`Running at ${baseUrl}:${port}`);
});
