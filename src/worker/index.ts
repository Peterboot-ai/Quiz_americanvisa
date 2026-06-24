import { Hono } from "hono";
import { cors } from "hono/cors";
import leadsRouter from "./routes/leads";
import adminRouter from "./routes/admin";
import downloadEbookRouter from "./routes/download-ebook";
import authRouter from "./routes/auth";
import testEmailRouter from "./routes/test-email";
import { handleScheduled } from "./scheduled";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.route("/api", authRouter);
app.route("/api/leads", leadsRouter);
app.route("/api/admin/leads", adminRouter);
app.route("/ebook", downloadEbookRouter);
app.route("/api/test-email", testEmailRouter);

export default {
  fetch: app.fetch,
  // Scheduled handler for automated reports
  // Runs daily at 8am Brazil time (11:00 UTC)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduled(env, new Date(event.scheduledTime)));
  }
};
