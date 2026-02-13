# Email Configuration Setup for OTP Verification

This guide will help you configure email settings for OTP verification in the Bayroot Edu Tech platform.

## Prerequisites

- Gmail account: `partnerbayroot@gmail.com`
- Gmail App Password (required for OTP emails)

## Step 1: Generate Gmail App Password

Since Gmail requires an App Password for third-party applications, follow these steps:

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (enable it if not already enabled)
3. Scroll down to **App passwords**
4. Select **Mail** and **Other (Custom name)**
5. Enter "Bayroot Edu Tech" as the app name
6. Click **Generate**
7. Copy the 16-character password (you'll need this for `.env`)

## Step 2: Configure Environment Variables

Add the following to your `backend/.env` file:

```env
# Email Configuration for OTP
EMAIL_USER=partnerbayroot@gmail.com
EMAIL_PASSWORD=your-16-character-app-password-here
```

**Important:** 
- Replace `your-16-character-app-password-here` with the actual App Password from Step 1
- Never commit `.env` file to version control
- Keep your App Password secure

## Step 3: Verify Email Configuration

When you start the server, it will automatically verify the email configuration. You should see:

```
Email server is ready to send messages
```

If you see a warning, check:
- ✅ App Password is correct (16 characters, no spaces)
- ✅ 2-Step Verification is enabled on Gmail account
- ✅ EMAIL_USER matches the Gmail account exactly

## Testing OTP Functionality

### Signup Flow:
1. User enters email and clicks "SEND CODE"
2. OTP is sent to `partnerbayroot@gmail.com` (configured sender)
3. User receives email with 4-digit OTP
4. User enters OTP and completes registration

### Forgot Password Flow:
1. User enters email and clicks "SEND VERIFICATION CODE"
2. OTP is sent to user's email
3. User verifies OTP
4. User sets new password

## Troubleshooting

### Error: "Failed to send email"
- Check if App Password is correct
- Verify 2-Step Verification is enabled
- Ensure EMAIL_USER matches Gmail account exactly
- Check internet connection

### Error: "Invalid login credentials"
- Regenerate App Password
- Ensure no extra spaces in EMAIL_PASSWORD
- Verify EMAIL_USER format: `partnerbayroot@gmail.com`

### OTP not received
- Check spam/junk folder
- Verify email address is correct
- Wait a few minutes (Gmail may delay)
- Check server logs for email sending errors

## Security Notes

- OTP expires in 10 minutes
- Each OTP can only be used once
- Rate limiting prevents abuse (5 requests per minute)
- OTPs are automatically deleted after expiry

## Email Template

OTP emails are sent with:
- **From:** Bayroot Edu Tech <partnerbayroot@gmail.com>
- **Subject:** Verify Your Email - Bayroot Edu Tech (for signup)
- **Subject:** Reset Your Password - Bayroot Edu Tech (for password reset)
- **Content:** HTML formatted email with OTP code

---

For support, contact the development team.

