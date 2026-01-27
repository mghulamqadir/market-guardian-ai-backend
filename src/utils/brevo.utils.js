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
      subject: 'Email Verification',
      htmlContent: `
        <h3>Hello ${user.name},</h3>
        <p>Thank you for signing up! Please verify your email address.</p>
        <p>Your verification code is: <strong>${verificationCode}</strong></p>
        <p> Click the link below to verify your email:</p>
        <p><a href="${REDIRECT_URL}/verify-email?code=${verificationCode}">Verify Email</a></p>
        <p>If you did not request this, please ignore this email.</p>
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
