// Cloudflare Pages — Node.js Worker wrapper
// Wraps Express app for Pages Node.js runtime

export default {
  async fetch(request, env, ctx) {
    // Import and handle the request via Cloudflare Pages Node runtime
    const { createPagesFunctionHandler } = await import(
      "@cloudflare/workers-hono"
    );
    const { Hono } = await import("hono");
    const { cors } = await import("hono/cors");

    const app = new Hono();

    // CORS
    app.use(
      "*",
      cors({
        origin: ["https://liff.line.me"],
        allowMethods: ["POST", "GET", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
      })
    );

    // Proxy all requests to Express server on port 3000
    const controller = new RequestController(request);
    return controller.fetch(`http://127.0.0.1:3000${new URL(request.url).pathname}`);
  },
};