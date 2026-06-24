import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  try {
    // Redirect to the static HTML file in public folder
    // The HTML can be printed to PDF by the user (Ctrl+P / Cmd+P)
    return c.redirect('/ebook-4-caminhos-eua.html');
  } catch (error) {
    console.error('Error serving ebook:', error);
    return c.text('Erro ao carregar o ebook', 500);
  }
});

export default app;