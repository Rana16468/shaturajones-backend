export interface EmailConfigType {
  companyName: string;
}

export interface EmailContextType {
  sendVerificationData: (
    username: string,
    otp: string,
    subject: string
  ) => string;
}

/**
 * EmailTemplateManager - Generates Plain Text OTP Emails for the Team
 */
export class EmailTemplateManager implements EmailContextType {
  private companyName: string;

  constructor(config: EmailConfigType) {
    this.companyName = config.companyName;
  }

  /**
   * কোনো HTML ছাড়া একদম সাধারণ (Plain Text) উপায়ে ওটিপি ইমেইল জেনারেট করার মেثড
   */
  public sendVerificationData(
    username: string,
    otp: string,
    subject: string
  ): string {
    
    // =====================
    // ভ্যালিডেশন (Validation)
    // =====================
    if (!username || typeof username !== 'string') {
      throw new Error('[EmailTemplateManager]: Username must be a non-empty string');
    }

    if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      throw new Error('[EmailTemplateManager]: OTP must be a 6-digit numeric string');
    }

    if (!subject || typeof subject !== 'string') {
      throw new Error('[EmailTemplateManager]: Subject must be a non-empty string');
    }

    const currentYear = new Date().getFullYear();

    // প্লেইন টেক্সট ইমেইলে HTML বা CSS এর কোনো প্রয়োজন নেই।
    // এখানে '\n' ব্যবহার করা হয়েছে নতুন লাইনে (Line break) যাওয়ার জন্য।
    return `Hello ${username},

Thank you for choosing our service. Please use the following 6-digit verification code to verify your account:

Verification Code: ${otp}

Important: This security code is valid for 10 minutes. Please do not share this code with anyone.
If you did not request this verification, you can safely ignore this email.

Best regards,
The Support Team
${this.companyName}

--------------------------------------------------
This is an automated security email. Please do not reply directly to this message.
© ${currentYear} ${this.companyName}. All rights reserved.`;
  }
}

export default EmailTemplateManager;