const nodemailer = require('nodemailer');
const { EMAIL_CONFIG } = require('../config/env');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_CONFIG.USER,
    pass: EMAIL_CONFIG.PASSWORD
  }
});

/**
 * Send OTP email
 * @param {string} to - Recipient email
 * @param {string} otp - OTP code
 * @param {string} type - Type of OTP (SIGNUP or FORGOT_PASSWORD)
 */
const sendOTPEmail = async (to, otp, type = 'SIGNUP') => {
  try {
    const subject = type === 'SIGNUP' 
      ? 'Verify Your Email - Bayroot Edu Connect'
      : 'Reset Your Password - Bayroot Edu Connect';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1a5f5f 0%, #0d3d3d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp-box { background: white; border: 2px solid #32cd32; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #32cd32; letter-spacing: 8px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bayroot Edu Connect</h1>
          </div>
          <div class="content">
            <h2>${type === 'SIGNUP' ? 'Verify Your Email Address' : 'Reset Your Password'}</h2>
            <p>${type === 'SIGNUP' ? 'Thank you for signing up! Please use the verification code below to complete your registration:' : 'You requested to reset your password. Please use the verification code below:'}</p>
            
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            
            <p><strong>This code will expire in 10 minutes.</strong></p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2026 Doabsy Solutions. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Bayroot Edu Connect" <${EMAIL_CONFIG.USER}>`,
      to: to,
      subject: subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
};

/**
 * Send comment notification email
 * @param {string} to - Recipient email
 * @param {Object} options - Email options
 * @param {string} options.studentName - Student full name
 * @param {string} options.commenterName - Name of person who commented (partner company name or admin name)
 * @param {string} options.commenterRole - Role of commenter (PARTNER or ADMIN)
 * @param {string} options.message - Comment message
 * @param {boolean} options.isReply - Whether this is a reply to another comment
 */
const sendCommentNotificationEmail = async (to, options) => {
  try {
    const { studentName, commenterName, commenterRole, message, isReply = false } = options;
    
    const subject = isReply 
      ? `New Reply on Comment - ${studentName} - Bayroot Edu Connect`
      : `New Comment - ${studentName} - Bayroot Edu Connect`;

    const commenterLabel = commenterRole === 'ADMIN' ? 'Bayroot Admin' : commenterName;
    const recipientLabel = commenterRole === 'ADMIN' ? 'Partner' : 'Admin';
    
    // Truncate message if too long for email preview
    const messagePreview = message.length > 150 ? message.substring(0, 150) + '...' : message;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1a5f5f 0%, #0d3d3d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .student-name { font-size: 20px; font-weight: bold; color: #1a5f5f; margin-bottom: 10px; }
          .comment-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 15px 0; }
          .comment-text { color: #374151; margin: 10px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bayroot Edu Connect</h1>
          </div>
          <div class="content">
            <h2>${isReply ? 'New Reply Received' : 'New Comment Received'}</h2>
            <p>You have received a ${isReply ? 'reply' : 'new comment'} regarding a student application.</p>
            
            <div class="info-box">
              <div class="student-name">📋 Student: ${studentName}</div>
              <p><strong>From:</strong> ${commenterLabel}</p>
            </div>
            
            <div class="comment-box">
              <p><strong>Message:</strong></p>
              <div class="comment-text">${messagePreview}</div>
            </div>
            
            <p><strong>Please log in to your dashboard to view and respond to this ${isReply ? 'reply' : 'comment'}.</strong></p>
            
            <p style="color: #6b7280; font-size: 14px;">This is an automated notification to ensure you don't miss important updates about student applications.</p>
          </div>
          <div class="footer">
            <p>© 2026 Doabsy Solutions. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Bayroot Edu Connect" <${EMAIL_CONFIG.USER}>`,
      to: to,
      subject: subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Comment notification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Comment notification email error:', error);
    // Don't throw error - email failure shouldn't break comment creation
    return { success: false, error: error.message };
  }
};

/**
 * Send new application notification email to admins
 * When a partner submits a new student application
 * 
 * @param {string|string[]} to - Admin email(s)
 * @param {Object} options - Email options
 * @param {string} options.studentName - Student full name
 * @param {string} options.partnerName - Partner company name
 * @param {string} options.universityName - University name
 * @param {string} options.courseName - Course name
 */
const sendNewApplicationNotificationEmail = async (to, options) => {
  try {
    const { studentName, partnerName, universityName, courseName } = options;

    const subject = `New Application Submitted - ${studentName} - Bayroot Edu Connect`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1a5f5f 0%, #0d3d3d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .student-name { font-size: 20px; font-weight: bold; color: #1a5f5f; margin-bottom: 10px; }
          .info-row { margin: 8px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bayroot Edu Connect</h1>
          </div>
          <div class="content">
            <h2>New Application Submitted</h2>
            <p>A partner has submitted a new student application that requires your review.</p>
            
            <div class="info-box">
              <div class="student-name">📋 Student: ${studentName}</div>
              <div class="info-row"><strong>Partner:</strong> ${partnerName || 'N/A'}</div>
              <div class="info-row"><strong>University:</strong> ${universityName || 'N/A'}</div>
              <div class="info-row"><strong>Course:</strong> ${courseName || 'N/A'}</div>
            </div>
            
            <p><strong>Please log in to your admin dashboard to review this application.</strong></p>
            
            <p style="color: #6b7280; font-size: 14px;">This is an automated notification when partners submit new student applications.</p>
          </div>
          <div class="footer">
            <p>© 2026 Doabsy Solutions. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const recipients = Array.isArray(to) ? to : [to];
    const mailOptions = {
      from: `"Bayroot Edu Connect" <${EMAIL_CONFIG.USER}>`,
      to: recipients.join(', '),
      subject: subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('New application notification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('New application notification email error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verify email transporter configuration
 */
const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
};

module.exports = {
  sendOTPEmail,
  sendCommentNotificationEmail,
  sendNewApplicationNotificationEmail,
  verifyEmailConfig
};

