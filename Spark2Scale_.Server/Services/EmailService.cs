using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using System;

namespace Spark2Scale_.Server.Services
{
    public class EmailService
    {
        // Credentials should be retrieved from environment variables set in Program.cs
        private readonly string _smtpHost = "smtp.gmail.com";
        private readonly int _smtpPort = 587;
        // NOTE: GMAIL_USER and GMAIL_APP_PASSWORD are used here.
        private readonly string _email = Environment.GetEnvironmentVariable("GMAIL_USER") ?? string.Empty;
        private readonly string _password = Environment.GetEnvironmentVariable("GMAIL_APP_PASSWORD") ?? string.Empty;

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            if (string.IsNullOrEmpty(_email) || string.IsNullOrEmpty(_password))
            {
                Console.WriteLine("Warning: Email credentials not set. Skipping email send.");
                return;
            }

            using var client = new SmtpClient(_smtpHost, _smtpPort)
            {
                EnableSsl = true,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(_email, _password)
            };

            var mailMessage = new MailMessage(_email, toEmail, subject, body)
            {
                IsBodyHtml = true
            };

            try
            {
                await client.SendMailAsync(mailMessage);
            }
            catch (SmtpException ex)
            {
                Console.WriteLine($"SMTP Error sending email to {toEmail}: {ex.Message}");
                // Ensure App Password is used here, not the regular Gmail password.
            }
            catch (Exception ex)
            {
                Console.WriteLine($"General Error sending email to {toEmail}: {ex.Message}");
            }
        }
    }
}