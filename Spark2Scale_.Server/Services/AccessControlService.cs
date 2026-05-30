using Supabase;
using System;
using System.Linq;
using System.Threading.Tasks;
using Spark2Scale_.Server.Models;
using System.Collections.Generic;

namespace Spark2Scale_.Server.Services
{
    public class AccessControlService
    {
        private readonly Client _supabase;

        public AccessControlService(Client supabase)
        {
            _supabase = supabase;
        }

        public async Task<bool> IsFounderOrOwner(string token, Guid startupId)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                Console.WriteLine($"[AuthDebug] Token is missing or empty.");
                return false;
            }

            try
            {
                // 1. Validate Token & Get User
                var user = await _supabase.Auth.GetUser(token);

                if (user == null || user.Id == null)
                {
                    Console.WriteLine($"[AuthDebug] GetUser returned null for token: {token.Substring(0, Math.Min(10, token.Length))}...");
                    return false;
                }

                var userId = Guid.Parse(user.Id);
                Console.WriteLine($"[AuthDebug] User Identified: {userId}");
                Console.WriteLine($"[AuthDebug] Checking ownership for Startup: {startupId}");

                // 2. FIX: Select only sid + founder_id to avoid ORM crash on json_response (JSONB column)
                var startupCheck = await _supabase.From<Startup>()
                    .Select("sid,founder_id")
                    .Where(s => s.Sid == startupId && s.FounderId == userId)
                    .Get();

                bool isOwner = startupCheck.Models.Any();
                Console.WriteLine($"[AuthDebug] Ownership Check Result: {isOwner}");

                return isOwner;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AuthDebug] Exception in IsFounderOrOwner: {ex.Message}");
                return false;
            }
        }

        public async Task<string?> GetUserId(string token)
        {
            if (string.IsNullOrWhiteSpace(token)) return null;
            try
            {
                var user = await _supabase.Auth.GetUser(token);
                return user?.Id;
            }
            catch { return null; }
        }

        public async Task<bool> IsFounderOrContributor(string token, Guid startupId)
        {
            if (string.IsNullOrWhiteSpace(token)) return false;

            try
            {
                var user = await _supabase.Auth.GetUser(token);
                if (user?.Id == null) return false;
                var userId = Guid.Parse(user.Id);

                var founderCheck = await _supabase.From<Startup>()
                    .Select("sid,founder_id")
                    .Where(s => s.Sid == startupId && s.FounderId == userId)
                    .Get();
                if (founderCheck.Models.Any()) return true;

                var contributorCheck = await _supabase.From<StartupContributor>()
                    .Where(c => c.StartupId == startupId && c.ContributorId == userId)
                    .Get();
                return contributorCheck.Models.Any();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AuthDebug] IsFounderOrContributor failed: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> CanReadStartupDocs(string token, Guid startupId, string? investorId)
        {
            if (string.IsNullOrWhiteSpace(token)) return false;

            if (!string.IsNullOrWhiteSpace(investorId))
            {
                var callerId = await GetUserId(token);
                return callerId != null
                    && string.Equals(callerId, investorId, StringComparison.OrdinalIgnoreCase);
            }

            return await IsFounderOrContributor(token, startupId);
        }
    }
}