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
    }
}