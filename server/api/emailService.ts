import nodemailer from 'nodemailer';

class EmailService {
  private transporter: any;
  private isConfigured: boolean = false;
  
  constructor() {
    // Check for email configuration
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.setupTransporter();
    } else {
      console.warn('Email service not configured. Set EMAIL_USER and EMAIL_PASS environment variables for email alerts.');
    }
  }
  
  private setupTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      this.isConfigured = true;
      console.log('Email service configured successfully');
    } catch (error) {
      console.error('Failed to setup email transporter:', error);
      this.isConfigured = false;
    }
  }
  
  /**
   * Send a flood alert email to a user
   */
  async sendFloodAlert(userEmail: string, riskAssessment: any) {
    if (!this.isConfigured) {
      console.warn('Email service not configured. Skipping email alert.');
      return;
    }
    
    if (!userEmail) {
      console.error('No email provided for alert');
      return;
    }
    
    const subject = `FloodGuard Alert: ${riskAssessment.riskLevel} Flood Risk Detected`;
    
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: ${riskAssessment.riskLevel === 'HIGH' ? '#FF5252' : '#FFB74D'};">
          Flood Risk Alert: ${riskAssessment.riskLevel}
        </h2>
        <p>Dear FloodGuard User,</p>
        <p>We've detected a <strong>${riskAssessment.riskLevel}</strong> flood risk in your area.</p>
        <hr style="border: 1px solid #eee; margin: 15px 0;">
        <h3>Risk Assessment Details:</h3>
        <ul>
          <li>Current Water Level: ${riskAssessment.waterLevel} meters</li>
          <li>Critical Threshold: ${riskAssessment.thresholdLevel} meters</li>
          <li>Closest River: ${riskAssessment.riverName || 'Unknown'}</li>
          <li>Distance to River: ${riskAssessment.distance ? `${riskAssessment.distance.toFixed(2)} km` : 'Unknown'}</li>
        </ul>
        <div style="background-color: #f8f8f8; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <h3 style="margin-top: 0;">Safety Recommendations:</h3>
          <p>Please take necessary precautions and consider the following:</p>
          <ul>
            <li>Stay away from flood-prone areas</li>
            <li>Follow evacuation instructions if provided by local authorities</li>
            <li>Use the FloodGuard app to find safe routes</li>
          </ul>
        </div>
        <p style="margin-top: 20px;">
          <a href="https://floodguard-app.com/dashboard" 
             style="background-color: #1976D2; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">
            View in FloodGuard
          </a>
        </p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #777;">
          This is an automated alert from FloodGuard. Please do not reply to this email.
          To manage your alert settings, visit your profile in the FloodGuard app.
        </p>
      </div>
    `;
    
    try {
      await this.transporter.sendMail({
        from: `"FloodGuard Alerts" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject,
        html
      });
      
      console.log(`Flood alert email sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send flood alert email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
