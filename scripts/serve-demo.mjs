// Serves the project folder on http://localhost:5173 so the browser demo can load the built
// compiler (dist/) as modules. Uses only Node's own http module; nothing is installed.
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env["PORT"] ?? 5173);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".map": "application/json" };

createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  // Send the front page to /demo/, so the page's relative links (./demo.js, ../dist/) resolve.
  if (path === "/" || path === "/demo") {
    response.writeHead(302, { Location: "/demo/" }).end();
    return;
  }
  const file = resolve(join(root, normalize(path.endsWith("/") ? `${path}index.html` : path)));
  // Never serve anything outside the project folder.
  if (file !== root && !file.startsWith(root + sep)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    if (!statSync(file).isFile()) throw new Error("not a file");
  } catch {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`URITP demo: http://localhost:${port}/`);
});
