const emailContext = {
  sendVerificationData: (username: string, otp: number, subject: string) => {
    return `
Dear ${username},

Subject: ${subject}

Your verification code is:

🔐 OTP: ${otp}

Please do not share this code with anyone for security reasons. This code is valid for a limited time only.

If you did not request this, please ignore this email or contact our support team immediately.

Best regards,  
Your Company Team
    `.trim();
  },
};

export default emailContext;