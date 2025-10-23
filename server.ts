const port = Number(process.env["BUN_PORT"] ?? process.env["PORT"] ?? 8000);
const root = "./dist";

const server = Bun.serve({
  port,
  hostname: "localhost",
  async fetch(req) {
    const url = new URL(req.url);
    const path = decodeURIComponent(url.pathname);
    const filePath = `${root}${path === "/" ? "/index.html" : path}`;

    try {
      const file = Bun.file(filePath);
      await file.exists();

      const headers = new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept",
      });

      if (filePath.endsWith(".html")) headers.set("Content-Type", "text/html; charset=utf-8");
      else if (filePath.endsWith(".js")) headers.set("Content-Type", "application/javascript; charset=utf-8");
      else if (filePath.endsWith(".css")) headers.set("Content-Type", "text/css; charset=utf-8");

      return new Response(file, { headers });
    } catch {
      return new Response("404 Not Found", { status: 404 });
    }
  },
});

console.log(`Serving /dist on ${server.url}`);
