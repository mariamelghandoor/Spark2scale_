using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using System;

namespace Spark2Scale_.Server.Services
{
    public class EmailService
    {
        private readonly string _smtpHost = "smtp.gmail.com";
        private readonly int _smtpPort = 587;

        // Environment variables
        private readonly string _email = Environment.GetEnvironmentVariable("GMAIL_USER") ?? string.Empty;
        private readonly string _password = Environment.GetEnvironmentVariable("GMAIL_APP_PASSWORD") ?? string.Empty;

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            if (string.IsNullOrEmpty(_email) || string.IsNullOrEmpty(_password))
            {
                Console.WriteLine("Warning: Email credentials not set. Skipping email send.");
                return;
            }
            var smtp = new SmtpClient();
            using var client = new SmtpClient(_smtpHost, _smtpPort)
            {
                EnableSsl = true,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(_email, _password)
            };

            // FIX: Added "Spark2Scale" as the Display Name here
            var fromAddress = new MailAddress(_email, "Spark2Scale");
            var toAddress = new MailAddress(toEmail);

            var mailMessage = new MailMessage(fromAddress, toAddress)
            {
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };

            try
            {
                await client.SendMailAsync(mailMessage);
            }
            catch (SmtpException ex)
            {
                Console.WriteLine($"SMTP Error: {ex.Message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"General Error: {ex.Message}");
            }
        }
        public async Task SendVerificationEmailAsync(string toEmail, string name, string verificationLink)
        {
            if (string.IsNullOrEmpty(_email) || string.IsNullOrEmpty(_password))
            {
                Console.WriteLine("Warning: Email credentials not set. Skipping verification email.");
                return;
            }

            string subject = "🚀 Verify Your Account - Spark2Scale";
            string body = $@"
                <!DOCTYPE html>
                <html>
                <body style='margin:0; padding:0; background-color:#F0EADC; font-family: Arial, sans-serif;'>
                    <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color:#F0EADC; padding: 40px 0;'>
                        <tr>
                            <td align='center'>
                                <table width='600' border='0' cellspacing='0' cellpadding='0' style='background-color:#ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'>
                                    <tr>
                                        <td style='background-color:#576238; padding: 30px; text-align: center;'>
                                            <h1 style='color:#ffffff; margin:0; font-size: 24px; letter-spacing: 1px;'>Spark2Scale</h1>
                                            <p style='color:#FFD95D; margin:5px 0 0 0; font-size: 14px; font-weight: bold;'>BUILDING THE FUTURE</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style='padding: 40px 30px;'>
                                            <h2 style='color:#576238; margin-top:0;'>Welcome {name}!</h2>
                                            <p style='color:#555555; font-size: 16px; line-height: 1.5;'>
                                                Thank you for joining <strong>Spark2Scale</strong>. To get started, please verify your email address.
                                            </p>
                                            <div style='background-color:#F9F9F9; border-left: 5px solid #FFD95D; padding: 20px; margin: 25px 0; border-radius: 4px;'>
                                                <p style='margin: 0; color: #576238; font-weight: bold;'>
                                                    Click the button below to activate your account:
                                                </p>
                                            </div>
                                            <div style='text-align: center; margin-top: 30px;'>
                                                <a href='{verificationLink}' style='background-color:#576238; color:#ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block; font-size: 16px;'>
                                                    Verify Email
                                                </a>
                                            </div>
                                            <p style='color:#999; font-size: 14px; margin-top: 30px; text-align: center;'>
                                                If the button doesn't work, copy and paste this link into your browser:<br>
                                                <a href='{verificationLink}' style='color:#576238; word-break: break-all;'>{verificationLink}</a>
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style='background-color:#f8f8f8; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;'>
                                            <p style='margin:0; font-size: 12px; color:#999;'>&copy; 2025 Spark2Scale Inc.</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            ";

            await SendEmailAsync(toEmail, subject, body);
        }

        public async Task SendInvitationEmailAsync(string toEmail, string startupName, string inviteLink)
        {
            if (string.IsNullOrEmpty(_email) || string.IsNullOrEmpty(_password))
            {
                Console.WriteLine("Warning: Email credentials not set. Skipping invitation email.");
                return;
            }

            string subject = $"You're invited to join {startupName} on Spark2Scale";
            string body = $@"
                <!DOCTYPE html>
                <html>
                <body style='margin:0; padding:0; background-color:#F0EADC; font-family: Arial, sans-serif;'>
                    <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color:#F0EADC; padding: 40px 0;'>
                        <tr>
                            <td align='center'>
                                <table width='600' border='0' cellspacing='0' cellpadding='0' style='background-color:#ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'>
                                    <tr>
                                        <td style='background-color:#576238; padding: 30px; text-align: center;'>
                                            <h1 style='color:#ffffff; margin:0; font-size: 24px; letter-spacing: 1px;'>Spark2Scale</h1>
                                            <p style='color:#FFD95D; margin:5px 0 0 0; font-size: 14px; font-weight: bold;'>BUILDING THE FUTURE</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style='padding: 40px 30px;'>
                                            <h2 style='color:#576238; margin-top:0;'>Join {startupName}!</h2>
                                            <p style='color:#555555; font-size: 16px; line-height: 1.5;'>
                                               You have been invited to collaborate on <strong>{startupName}</strong> as a Contributor.
                                            </p>
                                            <div style='background-color:#F9F9F9; border-left: 5px solid #FFD95D; padding: 20px; margin: 25px 0; border-radius: 4px;'>
                                                <p style='margin: 0; color: #576238; font-weight: bold;'>
                                                    Click below to accept the invitation:
                                                </p>
                                            </div>
                                            <div style='text-align: center; margin-top: 30px;'>
                                                <a href='{inviteLink}' style='background-color:#576238; color:#ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block; font-size: 16px;'>
                                                    Accept Invitation
                                                </a>
                                            </div>
                                             <p style='color:#999; font-size: 14px; margin-top: 30px; text-align: center;'>
                                                If the button doesn't work, copy and paste this link into your browser:<br>
                                                <a href='{inviteLink}' style='color:#576238; word-break: break-all;'>{inviteLink}</a>
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style='background-color:#f8f8f8; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;'>
                                            <p style='margin:0; font-size: 12px; color:#999;'>&copy; 2025 Spark2Scale Inc.</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            ";

            await SendEmailAsync(toEmail, subject, body);
        }
    }
}