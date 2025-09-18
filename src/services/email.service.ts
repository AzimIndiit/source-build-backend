// @ts-ignore - sib-api-v3-sdk doesn't have proper TypeScript declarations
import SibApiV3Sdk from "sib-api-v3-sdk";
// @ts-ignore - ejs doesn't have proper TypeScript declarations
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import config from "@config/index.js";
import logger from "@config/logger.js";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Brevo API client
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = config.BREVO.API_KEY || ''; 

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

/**
 * Send email using template
 */
export const sendEmail = async (data: any, templateName: string): Promise<any> => {
  try {
    const templatePath = path.join(__dirname, "../templates", templateName);
    const html = await ejs.renderFile(templatePath, data);
    
    const mailOptions = {
      from: data.sender || 'mohdazimindiit@gmail.com',
      to: data.email,
      subject: data.subject,
      html: html,
    };

    const info = await sendBrevoEmail(mailOptions);
    logger.info('Email sent successfully', { to: data.email, subject: data.subject });
    return info;
  } catch (error) {
    logger.error('Failed to send email', { error, to: data.email, template: templateName });
    throw error;
  }
};

/**
 * Send email using Brevo API
 */
export const sendBrevoEmail = async (data: any): Promise<any> => {
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.subject = data.subject;
    sendSmtpEmail.htmlContent = data.html;
    sendSmtpEmail.sender = { 
      name: data.senderName || "no-reply", 
      email: data.from 
    };
    sendSmtpEmail.to = [{ email: data.to }];

    const info = await apiInstance.sendTransacEmail(sendSmtpEmail);
    logger.info('Email sent via Brevo API', { messageId: info.messageId });
    
    return { 
      statusCode: 201, 
      message: "Success", 
      data: info 
    };
  } catch (error: any) {
    logger.error('Error sending email via Brevo', { error: error.message });
    
    return {
      statusCode: 400,
      message: error.response?.body?.message || error.message || 'Failed to send email',
    };
  }
};

/**
 * Send password reset email with token link
 */
export const sendPasswordResetEmail = async (email: string, token: string): Promise<any> => {
  try {
    const resetLink = `${config.FRONTEND_URL}/auth/reset-password?token=${token}`;
    
    const emailData = {
      email,
      subject: 'Password Reset Request - Source Build',
      name: email.split('@')[0], // Extract name from email if not provided
      link: resetLink,
      expiry: 15, // Token expiry in minutes
      sender: 'mohdazimindiit@gmail.com',
      senderName: 'Source Build'
    };

    const result = await sendEmail(emailData, 'reset-password.ejs');
    logger.info('Password reset email sent', { email, resetLink });
    
    return result;
  } catch (error) {
    logger.error('Failed to send password reset email', { error, email });
    throw new Error('Failed to send password reset email');
  }
};

/**
 * Send welcome email to new users
 */
export const sendWelcomeEmail = async (email: string, name: string): Promise<any> => {
  try {
    const currentYear = new Date().getFullYear();
    
    const emailData = {
      email,
      subject: 'Welcome to Source Build - Your Account is Ready!',
      name: name || email.split('@')[0], // Use provided name or extract from email
      dashboardUrl: `${config.FRONTEND_URL}/`,
      privacyUrl: `${config.FRONTEND_URL}/privacy`,
      termsUrl: `${config.FRONTEND_URL}/terms`,
      year: currentYear,
      sender: 'mohdazimindiit@gmail.com',
      senderName: 'Source Build Team'
    };

    const result = await sendEmail(emailData, 'welcome.ejs');
    logger.info('Welcome email sent successfully', { email, name });
    
    return result;
  } catch (error) {
    logger.error('Failed to send welcome email', { error, email });
    throw new Error('Failed to send welcome email');
  }
};

/**
 * Send account blocked notification email
 */
export const sendAccountBlockedEmail = async (
  email: string, 
  name: string, 
  accountType: string,
  reason?: string
): Promise<any> => {
  try {
    const currentYear = new Date().getFullYear();
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const emailData = {
      email,
      subject: 'Important: Your Source Build Account Has Been Blocked',
      name: name || email.split('@')[0],
      accountType: accountType || 'User',
      date: currentDate,
      reason: reason || 'Violation of terms of service',
      supportEmail: 'support@sourcebuild.com',
      privacyUrl: `${config.FRONTEND_URL}/privacy`,
      termsUrl: `${config.FRONTEND_URL}/terms`,
      year: currentYear,
      sender: 'mohdazimindiit@gmail.com',
      senderName: 'Source Build Security Team'
    };

    const result = await sendEmail(emailData, 'account-blocked.ejs');
    logger.info('Account blocked email sent successfully', { email, name });
    
    return result;
  } catch (error) {
    logger.error('Failed to send account blocked email', { error, email });
    throw new Error('Failed to send account blocked email');
  }
};

/**
 * Send account unblocked notification email
 */
export const sendAccountUnblockedEmail = async (
  email: string, 
  name: string,
  accountType: string
): Promise<any> => {
  try {
    const currentYear = new Date().getFullYear();
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const emailData = {
      email,
      subject: 'Good News: Your Source Build Account is Active Again!',
      name: name || email.split('@')[0],
      accountType: accountType || 'User',
      date: currentDate,
      dashboardUrl: `${config.FRONTEND_URL}/dashboard`,
      supportEmail: 'support@sourcebuild.com',
      privacyUrl: `${config.FRONTEND_URL}/privacy`,
      termsUrl: `${config.FRONTEND_URL}/terms`,
      year: currentYear,
      sender: 'mohdazimindiit@gmail.com',
      senderName: 'Source Build Team'
    };

    const result = await sendEmail(emailData, 'account-unblocked.ejs');
    logger.info('Account unblocked email sent successfully', { email, name });
    
    return result;
  } catch (error) {
    logger.error('Failed to send account unblocked email', { error, email });
    throw new Error('Failed to send account unblocked email');
  }
};

/**
 * Send account deleted notification email
 */
export const sendAccountDeletedEmail = async (
  email: string, 
  name: string,
  accountType: string,
  reason?: string
): Promise<any> => {
  try {
    const currentYear = new Date().getFullYear();
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const emailData = {
      email,
      subject: 'Source Build Account Deletion Confirmation',
      name: name || email.split('@')[0],
      accountType: accountType || 'User',
      date: currentDate,
      reason: reason || 'Account deletion requested',
      supportEmail: 'support@sourcebuild.com',
      privacyUrl: `${config.FRONTEND_URL}/privacy`,
      termsUrl: `${config.FRONTEND_URL}/terms`,
      year: currentYear,
      sender: 'mohdazimindiit@gmail.com',
      senderName: 'Source Build Team'
    };

    const result = await sendEmail(emailData, 'account-deleted.ejs');
    logger.info('Account deleted email sent successfully', { email, name });
    
    return result;
  } catch (error) {
    logger.error('Failed to send account deleted email', { error, email });
    throw new Error('Failed to send account deleted email');
  }
};

export default {
  sendEmail,
  sendBrevoEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendAccountBlockedEmail,
  sendAccountUnblockedEmail,
  sendAccountDeletedEmail,
};
