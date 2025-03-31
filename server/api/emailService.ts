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
    
    // Get the color based on risk level
    let riskColor = '#4CAF50'; // Default green for LOW
    if (riskAssessment.riskLevel === 'HIGH') {
      riskColor = '#FF5252'; // Red
    } else if (riskAssessment.riskLevel === 'MEDIUM') {
      riskColor = '#FFB74D'; // Orange
    }
    
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: ${riskColor};">
          Flood Risk Alert: ${riskAssessment.riskLevel}
        </h2>
        <p>Dear FloodGuard User,</p>
        <p>We've detected a <strong style="color: ${riskColor}">${riskAssessment.riskLevel}</strong> flood risk in your area.</p>
        <hr style="border: 1px solid #eee; margin: 15px 0;">
        <h3>Risk Assessment Details:</h3>
        <ul>
          <li>Current Water Level: ${riskAssessment.waterLevel} cm</li>
          <li>Critical Threshold: ${riskAssessment.thresholdLevel} cm</li>
        </ul>
        <div style="background-color: #f8f8f8; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <h3 style="margin-top: 0;">Safety Recommendations:</h3>
          <p>Please take necessary precautions based on the risk level:</p>
          <ul>
            ${riskAssessment.riskLevel === 'HIGH' ? `
              <li><strong>HIGH RISK:</strong> Immediate action required. Consider evacuation if advised.</li>
              <li>Avoid all flood-prone areas and do not attempt to cross flooded roads.</li>
              <li>Stay tuned to emergency broadcasts and follow all official instructions.</li>
            ` : riskAssessment.riskLevel === 'MEDIUM' ? `
              <li><strong>MEDIUM RISK:</strong> Be prepared for possible flooding in your area.</li>
              <li>Avoid flood-prone areas and be ready to move to higher ground if needed.</li>
              <li>Keep emergency supplies and important documents accessible.</li>
            ` : `
              <li><strong>LOW RISK:</strong> Monitor the situation for any changes.</li>
              <li>Review your emergency plan and know your evacuation routes.</li>
              <li>Stay informed about changing weather conditions.</li>
            `}
            <li>Use the FloodGuard app to find safe routes if you need to travel.</li>
          </ul>
        </div>
        <p style="margin-top: 20px;">
          <a href="http://localhost:3000/dashboard" 
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
