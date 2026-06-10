import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import nodemailer from "nodemailer";

dotenv.config();

const PORT = Number(process.env.PORT) || 3001;
const SITE_URL = (process.env.SITE_URL || "http://localhost:5173").replace(/\/$/, "");
const EMAIL_USER = process.env.EMAIL_USER?.trim();
const EMAIL_PASS = process.env.EMAIL_PASS?.replace(/\s/g, "");

const app = express();

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
  }),
);
app.use(express.json({ limit: "1mb" }));

const transporter =
  EMAIL_USER && EMAIL_PASS
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASS,
        },
      })
    : null;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildTaskListHtml = (tasks) =>
  tasks
    .map(
      (task) => `
        <li style="margin-bottom:10px;">
          <strong>${escapeHtml(task.agenda || "Untitled task")}</strong><br />
          <span style="color:#64748b;font-size:14px;">Deadline: ${escapeHtml(task.deadline || "—")}</span>
        </li>`,
    )
    .join("");

const buildFollowUpEmailHtml = ({ recipientName, senderLabel, tasks, siteUrl }) => {
  const taskUrl = `${siteUrl}/user-task`;
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : "Hi,";
  const senderLine = senderLabel
    ? `<strong>${escapeHtml(senderLabel)}</strong> is requesting an update on your overdue task${tasks.length === 1 ? "" : "s"}.`
    : `Your administrator is requesting an update on your overdue task${tasks.length === 1 ? "" : "s"}.`;

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 12px;">
                <p style="margin:0 0 12px;font-size:16px;">${greeting}</p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${senderLine}</p>
                <ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:1.5;">
                  ${buildTaskListHtml(tasks)}
                </ul>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#475569;">
                  Please sign in and update the status or complete the task as soon as possible.
                </p>
                <a href="${escapeHtml(taskUrl)}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:12px;">
                  Open PSTO Calendar
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
                  If the button does not work, copy and paste this link into your browser:<br />
                  <a href="${escapeHtml(taskUrl)}" style="color:#7c3aed;">${escapeHtml(taskUrl)}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    emailConfigured: Boolean(transporter),
    siteUrl: SITE_URL,
  });
});

app.post("/api/follow-up-email", async (req, res) => {
  if (!transporter) {
    return res.status(503).json({
      error: "Email is not configured. Set EMAIL_USER and EMAIL_PASS in backend/.env.",
    });
  }

  const senderLabel =
    typeof req.body?.senderLabel === "string" ? req.body.senderLabel.trim() : "";
  const recipients = Array.isArray(req.body?.recipients) ? req.body.recipients : [];

  const normalizedRecipients = recipients
    .map((recipient) => {
      const email =
        typeof recipient?.email === "string" ? recipient.email.trim() : "";
      const name =
        typeof recipient?.name === "string" ? recipient.name.trim() : "";
      const tasks = Array.isArray(recipient?.tasks) ? recipient.tasks : [];

      const normalizedTasks = tasks
        .map((task) => ({
          agenda:
            typeof task?.agenda === "string" ? task.agenda.trim() : "Untitled task",
          deadline: typeof task?.deadline === "string" ? task.deadline.trim() : "—",
        }))
        .filter((task) => task.agenda);

      return { email, name, tasks: normalizedTasks };
    })
    .filter((recipient) => recipient.email && recipient.tasks.length > 0);

  if (normalizedRecipients.length === 0) {
    return res.status(400).json({
      error: "No valid recipients with email addresses were provided.",
    });
  }

  const results = [];

  for (const recipient of normalizedRecipients) {
    const subject =
      recipient.tasks.length === 1
        ? `Overdue task follow-up: ${recipient.tasks[0].agenda}`
        : `Overdue task follow-up (${recipient.tasks.length} tasks)`;

    try {
      await transporter.sendMail({
        from: `"PSTO Calendar" <${EMAIL_USER}>`,
        to: recipient.email,
        subject,
        html: buildFollowUpEmailHtml({
          recipientName: recipient.name,
          senderLabel,
          tasks: recipient.tasks,
          siteUrl: SITE_URL,
        }),
      });
      results.push({ email: recipient.email, ok: true });
    } catch (error) {
      results.push({
        email: recipient.email,
        ok: false,
        error: error.message || "Failed to send email.",
      });
    }
  }

  const sent = results.filter((row) => row.ok).length;
  const failed = results.length - sent;

  if (sent === 0) {
    return res.status(502).json({
      error: "Failed to send follow-up emails.",
      results,
    });
  }

  return res.json({
    sent,
    failed,
    results,
  });
});

app.listen(PORT, () => {
  console.log(`PSTO Calendar API listening on http://localhost:${PORT}`);
  if (!transporter) {
    console.warn("Email not configured — set EMAIL_USER and EMAIL_PASS in backend/.env");
  }
});
