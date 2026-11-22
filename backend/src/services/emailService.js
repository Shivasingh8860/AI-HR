import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  return transporter;
}

export async function sendResetPasswordEmail(email, token) {
  const clientUrl = (process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5174").replace(/\/$/, "");
  const resetUrl = `${clientUrl}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"Smart HR" <${process.env.SMTP_USER || "noreply@smarthr.local"}>`,
    to: email,
    subject: "Reset Your Password - Smart HR",
    html: `
      <div style="font-family: sans-serif; padding: 24px; color: #1e293b; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; rounded: 12px;">
        <h2 style="color: #10b981; margin-bottom: 8px;">Password Reset Request</h2>
        <p style="color: #64748b; line-height: 1.5;">You requested to reset your password for Smart HR. Click the button below to proceed. This link expires in 1 hour.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 28px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Reset Password
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `
  };

  const mailer = getTransporter();
  if (!mailer) {
    console.warn("SMTP credentials not configured. Password reset link:", resetUrl);
    return;
  }
  return mailer.sendMail(mailOptions);
}

export async function sendEmail({ to, subject, text, html }) {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn(`SMTP credentials not configured. Suppressing email to ${to}: ${subject}`);
    return;
  }
  const mailOptions = {
    from: `"Smart HR" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html: html || `<p>${text}</p>`
  };
  return mailer.sendMail(mailOptions);
}
