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
      ? 'Verify Your Email - Bayroot Edu Tech'
      : 'Reset Your Password - Bayroot Edu Tech';

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
            <h1>Bayroot Edu Tech</h1>
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
      from: `"Bayroot Edu Tech" <${EMAIL_CONFIG.USER}>`,
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
  verifyEmailConfig
};

