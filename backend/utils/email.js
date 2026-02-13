import transporter from '../config/email.js';

/**
 * Send email
 */
export const sendEmail = async (options) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: options.to,
            subject: options.subject,
            html: options.html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

/**
 * Send OTP verification email
 */
export const sendOTPEmail = async (email, name, otp) => {
    try{
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 8px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Email Verification</h1>
        </div>
        <div class="content">
          <h2>Hello ${name}!</h2>
          <p>Thank you for registering with Task Manager. To complete your registration, please use the following OTP:</p>
          <div class="otp-box">${otp}</div>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Task Manager. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    await sendEmail({
        to: email,
        subject: 'Email Verification - Task Manager',
        html,
    });
      console.log("OTP email sent to:", email);

  } catch (err) {
    console.error("OTP email failed:", err);
    throw err; // let controller handle
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email, name, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hello ${name}!</h2>
          <p>You requested to reset your password. Click the button below to reset it:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          <p>This link is valid for 1 hour.</p>
          <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Task Manager. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    await sendEmail({
        to: email,
        subject: 'Password Reset Request - Task Manager',
        html,
    });
};

/**
 * Send task assignment notification email
 */
export const sendTaskAssignmentEmail = async (email, name, taskTitle, assignedBy) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .task-box { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Task Assigned</h1>
        </div>
        <div class="content">
          <h2>Hello ${name}!</h2>
          <p>${assignedBy} has assigned you a new task:</p>
          <div class="task-box">
            <h3>${taskTitle}</h3>
          </div>
          <p>Login to your Task Manager dashboard to view details and start working on it.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Task Manager. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    await sendEmail({
        to: email,
        subject: 'New Task Assigned - Task Manager',
        html,
    });
};

/**
 * Send task due reminder email
 */
export const sendTaskDueReminderEmail = async (email, name, taskTitle, dueDate) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .task-box { background: white; padding: 20px; border-left: 4px solid #ef4444; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Task Due Soon</h1>
        </div>
        <div class="content">
          <h2>Hello ${name}!</h2>
          <p>This is a reminder that the following task is due soon:</p>
          <div class="task-box">
            <h3>${taskTitle}</h3>
            <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
          </div>
          <p>Please complete it before the deadline.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Task Manager. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    await sendEmail({
        to: email,
        subject: '⚠️ Task Due Reminder - Task Manager',
        html,
    });
};
