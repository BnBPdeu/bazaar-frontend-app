import nodemailer from "nodemailer";
import { sendMail } from "./mailService.js";

// Clean and Simple Email Template
const otpEmailTemplateModern = (email, otp) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bazaar - Verification Code</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            margin: 0;
            padding: 20px 0;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        
        .logo-container {
            margin-bottom: 20px;
        }
        
        .logo-placeholder {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            background: linear-gradient(45deg, #00ff88, #00d4ff);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            color: white;
        }
        
        .company-name {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            color: #00ff88;
        }
        
        .company-tagline {
            font-size: 16px;
            color: #ccc;
            font-weight: 400;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .welcome-section {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .welcome-title {
            font-size: 24px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 12px;
        }
        
        .welcome-text {
            font-size: 16px;
            color: #666;
            line-height: 1.6;
        }
        
        .otp-section {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
            border: 2px solid #e9ecef;
        }
        
        .otp-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 15px;
            font-weight: 500;
        }
        
        .otp-code {
            font-size: 36px;
            font-weight: 700;
            color: #00ff88;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            margin-bottom: 15px;
            padding: 20px;
            background: white;
            border-radius: 8px;
            border: 2px solid #00ff88;
            display: inline-block;
        }
        
        .otp-expiry {
            font-size: 14px;
            color: #e74c3c;
            font-weight: 500;
        }
        
        .instructions {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
        }
        
        .instructions-title {
            font-size: 16px;
            font-weight: 600;
            color: #856404;
            margin-bottom: 10px;
        }
        
        .instructions-list {
            list-style: none;
            padding: 0;
        }
        
        .instructions-list li {
            font-size: 14px;
            color: #856404;
            margin-bottom: 8px;
            padding-left: 20px;
            position: relative;
        }
        
        .instructions-list li::before {
            content: '•';
            color: #f39c12;
            font-weight: bold;
            position: absolute;
            left: 0;
        }
        
        .security-notice {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
        }
        
        .security-title {
            font-size: 16px;
            font-weight: 600;
            color: #0c5460;
            margin-bottom: 10px;
        }
        
        .security-text {
            font-size: 14px;
            color: #0c5460;
            line-height: 1.5;
        }
        
        .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        
        .footer-brand {
            font-size: 18px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 15px;
        }
        
        .footer-info {
            font-size: 14px;
            color: #666;
            margin: 8px 0;
        }
        
        .footer-email {
            color: #00ff88;
            text-decoration: none;
            font-weight: 500;
        }
        
        .footer-links {
            margin: 20px 0;
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
        }
        
        .footer-link {
            color: #666;
            text-decoration: none;
            font-size: 14px;
            padding: 8px 16px;
            border-radius: 6px;
            background: white;
            border: 1px solid #e9ecef;
            transition: all 0.2s;
        }
        
        .footer-link:hover {
            background: #00ff88;
            color: white;
            border-color: #00ff88;
        }
        
        .footer-copyright {
            font-size: 12px;
            color: #999;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
        }
        
        /* Mobile Responsive */
        @media (max-width: 600px) {
            body {
                padding: 10px 0;
            }
            
            .email-container {
                margin: 0 10px;
                border-radius: 8px;
            }
            
            .header {
                padding: 30px 20px;
            }
            
            .content {
                padding: 30px 20px;
            }
            
            .company-name {
                font-size: 24px;
            }
            
            .company-tagline {
                font-size: 14px;
            }
            
            .welcome-title {
                font-size: 22px;
            }
            
            .welcome-text {
                font-size: 15px;
            }
            
            .otp-section {
                padding: 25px 15px;
                margin: 25px 0;
            }
            
            .otp-code {
                font-size: 32px;
                letter-spacing: 6px;
                padding: 15px;
            }
            
            .logo-placeholder {
                width: 70px;
                height: 70px;
                font-size: 12px;
            }
            
            .instructions, .security-notice {
                padding: 15px;
                margin: 20px 0;
            }
            
            .footer {
                padding: 25px 20px;
            }
            
            .footer-links {
                gap: 10px;
            }
            
            .footer-link {
                font-size: 13px;
                padding: 6px 12px;
            }
        }
        
        @media (max-width: 400px) {
            .email-container {
                margin: 0 5px;
            }
            
            .header {
                padding: 25px 15px;
            }
            
            .content {
                padding: 25px 15px;
            }
            
            .otp-code {
                font-size: 28px;
                letter-spacing: 4px;
                padding: 12px;
            }
            
            .welcome-title {
                font-size: 20px;
            }
            
            .company-name {
                font-size: 22px;
            }
            
            .footer {
                padding: 20px 15px;
            }
            
            .footer-links {
                flex-direction: column;
                align-items: center;
                gap: 8px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <div class="logo-container">
                <!-- Replace this div with your bull/bear logo -->
                
                <div class="company-name">Bazaar</div>
                <div class="company-tagline">Professional Trading Platform</div>
            </div>
        </div>
        
        <!-- Main Content -->
        <div class="content">
            <div class="welcome-section">
                <h1 class="welcome-title">Verification Required</h1>
                <p class="welcome-text">
                    We've sent you a secure verification code to complete your login process.
                </p>
            </div>
            
            <!-- OTP Section -->
            <div class="otp-section">
                <div class="otp-label">Your Verification Code</div>
                <div class="otp-code">${otp}</div>
                <div class="otp-expiry">⏱ Expires in 10 minutes</div>
            </div>
            
            <!-- Instructions -->
            <div class="instructions">
                <div class="instructions-title">📝 How to use this code:</div>
                <ul class="instructions-list">
                    <li>Return to the Bazaar login page</li>
                    <li>Enter the 4-digit code above</li>
                    <li>Complete your secure login</li>
                </ul>
            </div>
            
            <!-- Security Notice -->
            <div class="security-notice">
                <div class="security-title">🔒 Security Notice</div>
                <p class="security-text">
                    This code is confidential and should not be shared with anyone. 
                    If you didn't request this code, please contact our support team immediately.
                </p>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="footer-brand">Bazaar</div>
            <div class="footer-info">
                Email sent to: <a href="mailto:${email}" class="footer-email">${email}</a>
            </div>
            
            <div class="footer-links">
                <a href="#" class="footer-link">📞 Support</a>
                <a href="#" class="footer-link">🌐 Website</a>
                <a href="#" class="footer-link">📱 Mobile App</a>
                <a href="#" class="footer-link">❓ Help</a>
            </div>
            
            <div class="footer-info">
                Need help? Contact us at <a href="mailto:support@bulltraders.pro" class="footer-email">support@bulltraders.pro</a>
            </div>
            
            <div class="footer-copyright">
                © 2025 Bazaar. All rights reserved.
            </div>
        </div>
    </div>
</body>
</html>`;

export const passwordOtpEmail = async (to, otp) => {
  try {
    const subject = "🔐 Bazaar - Your Verification Code";
    const htmlContent = otpEmailTemplateModern(to, otp);
    await sendMail({to:to,subject,text:'OTP Verification',html:htmlContent})
    console.log("OTP email sent successfully to:", to);
    return { success: true, message: "OTP email sent successfully" };
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw error;
  }
};
