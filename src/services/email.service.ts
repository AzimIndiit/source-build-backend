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

export default {
  sendEmail,
  sendBrevoEmail,
  sendPasswordResetEmail,
};
