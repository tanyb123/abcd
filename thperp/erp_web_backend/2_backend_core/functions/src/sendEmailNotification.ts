import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

const db = admin.firestore();

// SMTP configuration
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'taotentanyb@gmail.com',
    pass: functions.config().smtp?.password || process.env.SMTP_PASSWORD || '',
  },
};

// Create reusable transporter
const transporter = nodemailer.createTransport(SMTP_CONFIG);

interface EmailNotificationData {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email notification
 */
export const sendEmailNotification = functions
  .region('asia-southeast1')
  .https.onCall(async (data: EmailNotificationData, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Bạn cần đăng nhập.'
      );
    }

    const { to, subject, html, text } = data;

    if (!to || !subject || !html) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Thiếu thông tin: to, subject, hoặc html'
      );
    }

    try {
      const mailOptions = {
        from: `"THP ERP System" <${SMTP_CONFIG.auth.user}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        html,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error('Error sending email:', error);
      throw new functions.https.HttpsError(
        'internal',
        error.message || 'Lỗi gửi email'
      );
    }
  });

/**
 * Trigger: Send email when notification is created
 */
export const onNotificationCreated = functions
  .region('asia-southeast1')
  .firestore.document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const notificationData = snap.data();
    if (!notificationData) {
      return null;
    }

    const { userId, message, type, projectName, projectId } = notificationData;

    // Get user email from users collection
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log(`User ${userId} not found`);
      return null;
    }

    const userData = userDoc.data();
    const userEmail = userData?.gmail || userData?.email;

    if (!userEmail) {
      console.log(`No email found for user ${userId}`);
      return null;
    }

    // Check if user has email notifications enabled
    const emailNotificationsEnabled = userData?.emailNotificationsEnabled !== false; // Default to true

    if (!emailNotificationsEnabled) {
      console.log(`Email notifications disabled for user ${userId}`);
      return null;
    }

    // Build email content
    const subject = `THP ERP: ${type === 'PROJECT_OPENED' ? 'Dự án mới được mở' : 'Thông báo mới'}`;
    const projectLink = projectId
      ? `https://your-domain.com/projects/${projectId}`
      : 'https://your-domain.com/dashboard';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0066cc; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #0066cc; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>THP ERP System</h2>
          </div>
          <div class="content">
            <p>Xin chào,</p>
            <p>${message}</p>
            ${projectId ? `<p><strong>Dự án:</strong> ${projectName || 'N/A'}</p>` : ''}
            <a href="${projectLink}" class="button">Xem chi tiết</a>
            <div class="footer">
              <p>Email này được gửi tự động từ hệ thống THP ERP.</p>
              <p>Bạn có thể tắt thông báo email trong cài đặt tài khoản.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const mailOptions = {
        from: `"THP ERP System" <${SMTP_CONFIG.auth.user}>`,
        to: userEmail,
        subject,
        html,
      };

      await transporter.sendMail(mailOptions);
      console.log(`Email notification sent to ${userEmail} for notification ${context.params.notificationId}`);
      return null;
    } catch (error: any) {
      console.error('Error sending email notification:', error);
      // Don't throw error to avoid breaking notification creation
      return null;
    }
  });

