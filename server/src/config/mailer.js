import nodemailer from 'nodemailer';

let transporterInstance = null;

export const getTransporter = async () => {
  if (transporterInstance) {
    return transporterInstance;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

  const isRealGmailConfigured =
    SMTP_USER &&
    SMTP_PASS &&
    !SMTP_USER.includes('test.blood.system') &&
    !SMTP_PASS.includes('mockapppassword');

  if (isRealGmailConfigured) {
    transporterInstance = nodemailer.createTransport({
      host: SMTP_HOST || 'smtp.gmail.com',
      port: Number(SMTP_PORT) || 465,
      secure: SMTP_SECURE === 'true' || SMTP_SECURE === true,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    try {
      await transporterInstance.verify();
      console.log('[Mailer] Gmail SMTP transport connected and verified.');
    } catch (err) {
      console.warn(`[Mailer] Gmail SMTP verification warning: ${err.message}. Emails will be logged to console in dev mode.`);
    }
  } else {
    console.log('[Mailer] Gmail credentials not set or using dev placeholder. Using simulated Nodemailer logger.');
    // Simulated transporter for development / testing that prints OTP and emails directly to terminal
    transporterInstance = {
      sendMail: async (mailOptions) => {
        console.log('\n================== [OUTGOING EMAIL NOTIFICATION] ==================');
        console.log(`To:      ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`From:    ${mailOptions.from || process.env.EMAIL_FROM}`);
        if (mailOptions.text) console.log(`Text:\n${mailOptions.text}`);
        if (mailOptions.html) console.log(`HTML Preview:\n${mailOptions.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`);
        console.log('====================================================================\n');
        return {
          messageId: `simulated-${Date.now()}@blooddonation.local`,
          response: '250 Message queued (simulated)',
        };
      },
    };
  }

  return transporterInstance;
};

export const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = await getTransporter();
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Blood Donation Network" <noreply@blooddonation.org>',
    to,
    subject,
    text,
    html,
  };

  return await transporter.sendMail(mailOptions);
};
