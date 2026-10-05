// Maps supabase-js's /rest/v1/* onto a bare local PostgREST so integration tests
// can run against a throwaway Postgres. Usage: node tests/support/rest-proxy.mjs [listenPort] [postgrestPort]
import http from "node:http";

const listen = Number(process.argv[2] ?? 3002);
const target = Number(process.argv[3] ?? 3001);

http
  .createServer((req, res) => {
    const path = (req.url ?? "/").replace(/^\/rest\/v1/, "") || "/";
    const up = http.request(
      { host: "127.0.0.1", port: target, path, method: req.method, headers: req.headers },
      (r) => {
        res.writeHead(r.statusCode ?? 500, r.headers);
        r.pipe(res);
      },
    );
    up.on("error", (e) => {
      res.writeHead(502);
      res.end(String(e));
    });
    req.pipe(up);
  })
  .listen(listen, () => console.log(`rest proxy :${listen} -> :${target}`));
