import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();
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
    
    // Ensure consistent risk level throughout email
    // Use toUpperCase to standardize the format
    const riskLevel = typeof riskAssessment.riskLevel === 'string' 
      ? riskAssessment.riskLevel.toUpperCase() 
      : 'UNKNOWN';
    
    // Update riskAssessment with standardized risk level
    riskAssessment.riskLevel = riskLevel;
    
    const subject = `FloodGuard Alert: ${riskLevel} Flood Risk Detected`;
    
    // Get the color based on standardized risk level
    let riskColor = '#4CAF50'; // Default green for LOW
    if (riskLevel === 'HIGH') {
      riskColor = '#FF5252'; // Red
    } else if (riskLevel === 'MEDIUM') {
      riskColor = '#FFB74D'; // Orange
    } else if (riskLevel === 'LOW') {
      riskColor = '#4CAF50'; // Green
    }
    
    // Create coordinates string if location is available
    const locationString = riskAssessment.location ? 
      `Latitude: ${riskAssessment.location.latitude.toFixed(6)}, Longitude: ${riskAssessment.location.longitude.toFixed(6)}` : 
      'Location data unavailable';
    
    // River name if available
    const riverName = riskAssessment.riverName || 'Unknown';
    
    // Simplified email template focusing only on the flood risk location and level
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: ${riskColor};">
          Flood Risk Alert: ${riskAssessment.riskLevel}
        </h2>
        <p>Dear FloodGuard User,</p>
        <p>We've detected a <strong style="color: ${riskColor}">${riskAssessment.riskLevel}</strong> flood risk at your location.</p>
        <hr style="border: 1px solid #eee; margin: 15px 0;">
        <h3>Location Details:</h3>
        <ul>
          <li><strong>Coordinates:</strong> ${locationString}</li>
          <li><strong>Nearest River:</strong> ${riverName}</li>
          <li><strong>Water Level:</strong> ${riskAssessment.waterLevel} m</li>
        </ul>
        
        <p style="font-weight: bold; color: ${riskColor}; margin-top: 20px;">
          Risk Level: ${riskAssessment.riskLevel}
        </p>
        
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #777;">
          This is an automated alert from FloodGuard. To disable email alerts, visit Settings in the FloodGuard app.
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
