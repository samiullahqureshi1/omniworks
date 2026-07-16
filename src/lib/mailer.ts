import nodemailer from 'nodemailer';

/**
 * Send an email via the same Gmail transport the rest of the app uses
 * (EMAIL_USER / EMAIL_PASS). Returns false (and does not throw) when email is
 * not configured or sending fails, so callers can treat it as best-effort.
 */
export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return false;
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    await transporter.sendMail({
      from: `"OmniWork" <${process.env.EMAIL_USER}>`,
      to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
      replyTo: process.env.EMAIL_USER,
      subject: opts.subject,
      html: opts.html,
    });
    return true;
  } catch (e: any) {
    console.error('[mailer] sendMail failed:', e?.message || e);
    return false;
  }
}
