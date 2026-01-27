import SibApiV3Sdk from 'sib-api-v3-sdk';

const brevoApiKey = process.env.BREVO_API_KEY;
const senderName = process.env.SENDER_NAME;
const senderEmail = process.env.SENDER_EMAIL;
const adminEmail = process.env.CONTACT_EMAIL;

const sendPasswordResetEmail = async (user, resetCode, redirectUrl) => {
  try {
    if (!brevoApiKey) {
      throw new Error(
        'Brevo API key is missing. Please check your environment variables.',
      );
    }

    // Configure Brevo API Client
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = brevoApiKey;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // Email Parameters
    const emailParams = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: user.email, name: user.name }],
      subject: 'Password Reset Request',
      htmlContent: `
        <h3>Hello ${user.name},</h3>
        <p>We received a request to reset your password.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="${redirectUrl}/reset-password?code=${resetCode}">Reset Password</a></p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };
    // Send Email
    await apiInstance.sendTransacEmail(emailParams);
  } catch (error) {
    throw error;
  }
};
const sendContactUsEmail = async (username, email, description) => {
  try {
    if (!brevoApiKey) {
      throw new Error(
        'Brevo API key is missing. Please check your environment variables.',
      );
    }

    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = brevoApiKey;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    const emailParams = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: adminEmail, name: 'Admin' }],
      subject: 'New Contact Us Message',
      htmlContent: `
        <h3>New Contact Us Message</h3>
        <p><strong>Name:</strong> ${username}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong> ${description}</p>
      `,
    };

    await apiInstance.sendTransacEmail(emailParams);
    // console.log(`Contact Us email sent from ${email} to admin`);
  } catch (error) {
    console.error('Error sending Contact Us email:', error);
    throw error;
  }
};
const sendVerificationEmail = async (user, verificationCode) => {
  try {
    if (!brevoApiKey) {
      throw new Error(
        'Brevo API key is missing. Please check your environment variables.',
      );
    }

    // Configure Brevo API Client
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = brevoApiKey;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const REDIRECT_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Email Parameters
    const emailParams = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: user.email, name: user.name }],
      subject: 'Verify your email to unlock Market Guardian',
      htmlContent: `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Email Verification</title>
  </head>
  <body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background:#1a1f2e;border-radius:16px;overflow:hidden;border:1px solid #2d3748;box-shadow:0 12px 30px rgba(0,0,0,0.4);">
            <tr>
              <td style="padding:40px 32px 24px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#ffffff;opacity:0.95;">Market Guardian</div>
                <h1 style="margin:10px 0 0;font-size:28px;line-height:1.3;color:#ffffff;">Welcome, ${user.name}!</h1>
                <p style="margin:12px 0 0;color:#ffffff;font-size:15px;line-height:1.6;opacity:0.95;">
                  Your account is almost ready. Verify your email to unlock real-time alerts and secure access.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 24px;">
                <div style="background:#0f1524;border:2px solid #667eea;border-radius:12px;padding:22px;text-align:center;">
                  <div style="color:#a0aec0;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;font-weight:600;">Verification Code</div>
                  <div style="font-size:32px;letter-spacing:8px;color:#8b9cfc;font-weight:700;">${verificationCode}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <p style="margin:0;color:#a0aec0;font-size:13px;line-height:1.6;">
                  If you did not request this verification, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#0f1524;border-top:1px solid #2d3748;">
                <div style="font-size:11px;color:#718096;text-align:center;">
                  © Market Guardian · This verification code expires in 15 minutes for your security.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
      `,
    };
    await apiInstance.sendTransacEmail(emailParams);
    // console.log(`Verification email sent to ${user.email}`);
  } catch (error) {
    // console.error('Error sending verification email:', error);
    throw error;
  }
};

const sendPayoutEmail = async (email, name, amount) => {
  try {
    if (!brevoApiKey) {
      throw new Error(
        'Brevo API key is missing. Please check your environment variables.',
      );
    }

    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = brevoApiKey;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    const emailParams = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: email, name: name }],
      subject: 'Payout Notification',
      htmlContent: `
      <h3>Hello ${name},</h3>
      <p>You have been paid $${amount}.</p>
      <p>Best regards,<br> The Klippify Team</p>
      `,
    };

    await apiInstance.sendTransacEmail(emailParams);
  } catch (err) {
    throw err;
  }
};

export {
  sendPasswordResetEmail,
  sendContactUsEmail,
  sendVerificationEmail,
  sendPayoutEmail,
};
