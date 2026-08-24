import nodemailer, { Transporter } from "nodemailer";
import { config } from "../config";

let transporterPromise: Promise<Transporter> | null = null;

/**
 * Lazily creates (and caches) a nodemailer transporter pointed at Ethereal.
 * If ETHEREAL_USER/PASS aren't set, we mint a fresh Ethereal test account
 * on first use so `npm run dev` works with zero setup.
 */
async function getTransporter(): Promise<Transporter> {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      let user = config.ethereal.user;
      let pass = config.ethereal.pass;

      if (!user || !pass) {
        const testAccount = await nodemailer.createTestAccount();
        user = testAccount.user;
        pass = testAccount.pass;
        console.log(
          `[mailer] No ETHEREAL_USER/PASS set — generated a test account: ${user}`
        );
      }

      return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user, pass },
      });
    })();
  }
  return transporterPromise;
}

export interface SendEmailInput {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
  return {
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info),
  };
}
