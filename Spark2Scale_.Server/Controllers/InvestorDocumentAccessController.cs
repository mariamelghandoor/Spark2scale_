using Microsoft.AspNetCore.Mvc;
using Supabase;
using Spark2Scale_.Server.Models;
using Spark2Scale_.Server.Services;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Spark2Scale_.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InvestorDocumentAccessController : ControllerBase
    {
        private readonly Client _supabase;
        private readonly EmailService _emailService;

        public InvestorDocumentAccessController(Client supabase, EmailService emailService)
        {
            _supabase = supabase;
            _emailService = emailService;
        }

        // POST: api/investordocumentaccess/request
        [HttpPost("request")]
        public async Task<IActionResult> RequestAccess([FromBody] RequestAccessDto request)
        {
            if (request == null || request.InvestorId == Guid.Empty || request.StartupId == Guid.Empty)
                return BadRequest("Invalid Request Data.");

            try
            {
                // 1. Fetch Startup Details
                var startupResponse = await _supabase.From<Startup>()
                    .Where(x => x.Sid == request.StartupId)
                    .Get();
                var startup = startupResponse.Models.FirstOrDefault();

                if (startup == null) return NotFound("Startup not found.");

                // 2. Fetch Founder for Email
                User? founder = null;
                if (startup.FounderId != null)
                {
                    var founderResponse = await _supabase.From<User>()
                        .Where(x => x.uid == startup.FounderId.Value)
                        .Get();
                    founder = founderResponse.Models.FirstOrDefault();
                }

                // 3. Find PRIVATE documents (CanAccess = 2)
                // We purposefully do NOT fetch CanAccess = 0 (Founder Only)
                var docsResponse = await _supabase.From<Document>()
                    .Where(x => x.StartupId == request.StartupId && x.CanAccess == 2)
                    .Get();

                var privateDocs = docsResponse.Models;

                if (!privateDocs.Any())
                {
                    return Ok(new { message = "No restricted documents found to request access for." });
                }

                // 4. Create Access Rows (Granted = false)
                foreach (var doc in privateDocs)
                {
                    var accessRecord = new InvestorDocumentAccess
                    {
                        InvestorId = request.InvestorId,
                        DocumentId = doc.Did,
                        GrantedAt = DateTime.UtcNow,
                        Granted = false // PENDING STATUS
                    };

                    await _supabase.From<InvestorDocumentAccess>().Upsert(accessRecord);
                }

                // 5. Send Themed Notification Email with Direct Link
                if (founder != null && !string.IsNullOrEmpty(founder.email))
                {
                    // Direct approval link hitting our new GET endpoint
                    string baseUrl = "https://localhost:7155"; // Check your launchSettings.json for the correct port (http vs https)
                    string approvalLink = $"{baseUrl}/api/investordocumentaccess/confirm-access?investorId={request.InvestorId}&startupId={request.StartupId}";

                    // --- EMAIL DESIGN ---
                    string brandingColor = "#576238"; // Primary Olive
                    string accentColor = "#FFD95D";   // Secondary Yellow
                    string bgColor = "#F0EADC";       // Background Beige

                    string emailBody = $@"
                        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: {bgColor}; padding: 40px; border-radius: 12px;'>
                            <div style='text-align: center; padding-bottom: 30px; border-bottom: 2px solid {brandingColor};'>
                                <h1 style='color: {brandingColor}; margin: 0; font-size: 28px;'>Spark2Scale</h1>
                                <p style='color: #666; margin-top: 5px; font-style: italic;'>Empowering Startups & Investors</p>
                            </div>
                            
                            <div style='background-color: #ffffff; padding: 30px; margin-top: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);'>
                                <h2 style='color: {brandingColor}; margin-top: 0;'> New Access Request</h2>
                                <p style='font-size: 16px; color: #444; line-height: 1.6;'>
                                    Hello <strong>{founder.fname}</strong>,
                                </p>
                                <p style='font-size: 16px; color: #444; line-height: 1.6;'>
                                    An investor has requested full access to the restricted documents of your startup, <strong>{startup.StartupName}</strong>.
                                </p>
                                
                                <div style='text-align: center; margin: 40px 0;'>
                                    <a href='{approvalLink}' style='background-color: {brandingColor}; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(87, 98, 56, 0.3);'>
                                        Grant Full Access Now
                                    </a>
                                </div>

                                <p style='font-size: 14px; color: #888; text-align: center;'>
                                    Clicking the button above will instantly unlock all private documents for this investor.
                                </p>
                            </div>

                            <div style='text-align: center; margin-top: 30px; font-size: 12px; color: #888;'>
                                <p>&copy; {DateTime.Now.Year} Spark2Scale. All rights reserved.</p>
                                <p>Automated notification sent from Spark2Scale Platform.</p>
                            </div>
                        </div>";

                    await _emailService.SendEmailAsync(founder.email, $"Action Required: Access Request for {startup.StartupName}", emailBody);
                }

                return Ok(new { message = "Request sent successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error requesting access: {ex.Message}");
            }
        }

        // GET: api/investordocumentaccess/confirm-access
        // This endpoint is hit directly from the Email Button
        [HttpGet("confirm-access")]
        public async Task<IActionResult> ConfirmAccess([FromQuery] Guid investorId, [FromQuery] Guid startupId)
        {
            if (investorId == Guid.Empty || startupId == Guid.Empty)
                return BadRequest("Invalid Parameters.");

            try
            {
                // 1. Find all private documents for this startup
                var docsResponse = await _supabase.From<Document>()
                    .Where(x => x.StartupId == startupId && x.CanAccess == 2)
                    .Get();

                var privateDocs = docsResponse.Models;

                // 2. Grant Access (Update Rows to Granted = true)
                foreach (var doc in privateDocs)
                {
                    var accessRecord = new InvestorDocumentAccess
                    {
                        InvestorId = investorId,
                        DocumentId = doc.Did,
                        GrantedAt = DateTime.UtcNow,
                        Granted = true // APPROVED
                    };

                    await _supabase.From<InvestorDocumentAccess>().Upsert(accessRecord);
                }

                // 3. Redirect to Founder Dashboard (Success Page)
                // Ensure this URL matches your frontend (usually port 5173 or 3000)
                return Redirect("http://localhost:5173/founder/dashboard?status=access_granted");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error confirming access: {ex.Message}");
            }
        }

        // POST: api/investordocumentaccess/approve
        // Existing endpoint for manual approval from dashboard
        [HttpPost("approve")]
        public async Task<IActionResult> ApproveAccess([FromBody] GrantAccessDto request)
        {
            try
            {
                var accessRecord = new InvestorDocumentAccess
                {
                    InvestorId = request.InvestorId,
                    DocumentId = request.DocumentId,
                    GrantedAt = DateTime.UtcNow,
                    Granted = true // Approved
                };

                await _supabase.From<InvestorDocumentAccess>().Upsert(accessRecord);
                return Ok(new { message = "Access granted successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest($"Error: {ex.Message}");
            }
        }
    }
}