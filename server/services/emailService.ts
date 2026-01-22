import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const APP_NAME = 'Briefcase';
const FROM_EMAIL = 'onboarding@resend.dev';

console.log(`Email service initialized: ${resend ? 'Resend configured' : 'Resend not configured (missing RESEND_API_KEY)'}`);

export function isEmailConfigured(): boolean {
  return !!resend;
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  verificationToken: string
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('Resend not configured - email not sent. Please add RESEND_API_KEY to secrets.');
    return { success: false, error: 'Email service not configured' };
  }

  console.log(`Attempting to send verification email to: ${to}`);

  try {
    const baseUrl = process.env.EXPO_PUBLIC_DOMAIN 
      ? (process.env.EXPO_PUBLIC_DOMAIN.startsWith('http') ? process.env.EXPO_PUBLIC_DOMAIN : `https://${process.env.EXPO_PUBLIC_DOMAIN}`)
      : 'http://localhost:5000';
    const verificationUrl = `${baseUrl}/api/auth/verify/${verificationToken}`;
    
    const { error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject: `Verify your ${APP_NAME} account`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your email</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0A0A0B; font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0A0A0B;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="100%" style="max-width: 480px; background-color: #141416; border-radius: 12px; border: 1px solid #262629;">
                  <tr>
                    <td style="padding: 40px;">
                      <div style="text-align: center; margin-bottom: 32px;">
                        <div style="display: inline-block; width: 56px; height: 56px; background-color: #C9A962; border-radius: 12px; line-height: 56px; font-size: 24px;">
                          <span style="color: #0A0A0B;">B</span>
                        </div>
                      </div>
                      
                      <h1 style="color: #FAFAFA; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
                        Verify your email
                      </h1>
                      
                      <p style="color: #A1A1A6; font-size: 16px; line-height: 24px; margin: 0 0 24px 0; text-align: center;">
                        Hi ${name || 'there'},<br><br>
                        Thanks for signing up for ${APP_NAME}. Please verify your email address to complete your registration.
                      </p>
                      
                      <div style="text-align: center; margin-bottom: 24px;">
                        <a href="${verificationUrl}" style="display: inline-block; background-color: #C9A962; color: #0A0A0B; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">
                          Verify Email
                        </a>
                      </div>
                      
                      <p style="color: #A1A1A6; font-size: 14px; line-height: 20px; margin: 0 0 16px 0; text-align: center;">
                        Or copy this verification code:
                      </p>
                      
                      <div style="background-color: #1C1C1E; border: 1px solid #262629; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
                        <code style="color: #C9A962; font-size: 18px; font-family: 'IBM Plex Mono', monospace; letter-spacing: 2px;">
                          ${verificationToken.substring(0, 8).toUpperCase()}
                        </code>
                      </div>
                      
                      <p style="color: #6B6B70; font-size: 12px; line-height: 18px; margin: 0; text-align: center;">
                        This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
                
                <p style="color: #6B6B70; font-size: 12px; margin-top: 24px; text-align: center;">
                  ${APP_NAME} - AI-Powered Investment Dashboard
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
Hi ${name || 'there'},

Thanks for signing up for ${APP_NAME}. Please verify your email address.

Click this link to verify: ${verificationUrl}

Or use this verification code: ${verificationToken.substring(0, 8).toUpperCase()}

This link expires in 24 hours.

If you didn't create an account, you can safely ignore this email.

- The ${APP_NAME} Team
      `.trim(),
    });

    if (error) {
      console.error('Resend error:', JSON.stringify(error, null, 2));
      const errorMessage = error.message || 'Email send failed';
      if (errorMessage.includes('sandbox') || errorMessage.includes('verify')) {
        return { 
          success: false, 
          error: 'Resend sandbox mode: Can only send to verified email addresses. Add a verified domain in Resend dashboard.' 
        };
      }
      return { success: false, error: errorMessage };
    }

    console.log(`Verification email sent successfully to: ${to}`);
    return { success: true };
  } catch (error: any) {
    console.error('Email send error:', error?.message || error);
    return { success: false, error: error?.message || 'Failed to send verification email' };
  }
}

export async function sendWelcomeEmail(
  to: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject: `Welcome to ${APP_NAME}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0A0A0B; font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0A0A0B;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="100%" style="max-width: 480px; background-color: #141416; border-radius: 12px; border: 1px solid #262629;">
                  <tr>
                    <td style="padding: 40px;">
                      <div style="text-align: center; margin-bottom: 32px;">
                        <div style="display: inline-block; width: 56px; height: 56px; background-color: #C9A962; border-radius: 12px; line-height: 56px; font-size: 24px;">
                          <span style="color: #0A0A0B;">B</span>
                        </div>
                      </div>
                      
                      <h1 style="color: #FAFAFA; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
                        Welcome to ${APP_NAME}!
                      </h1>
                      
                      <p style="color: #A1A1A6; font-size: 16px; line-height: 24px; margin: 0 0 24px 0; text-align: center;">
                        Hi ${name || 'there'},<br><br>
                        Your account is now verified and ready to use. Start tracking your investments with AI-powered insights.
                      </p>
                      
                      <div style="background-color: #1C1C1E; border: 1px solid #262629; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                        <h3 style="color: #FAFAFA; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">Get started:</h3>
                        <ul style="color: #A1A1A6; font-size: 14px; line-height: 22px; margin: 0; padding-left: 20px;">
                          <li>Add your first investment holding</li>
                          <li>View real-time portfolio analytics</li>
                          <li>Chat with AI for investment insights</li>
                        </ul>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `Welcome to ${APP_NAME}!\n\nHi ${name || 'there'},\n\nYour account is now verified. Start tracking your investments with AI-powered insights.\n\n- The ${APP_NAME} Team`,
    });

    if (error) {
      console.error('Resend welcome email error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Welcome email error:', error);
    return { success: false, error: 'Failed to send welcome email' };
  }
}
