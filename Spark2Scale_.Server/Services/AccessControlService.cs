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
            if (string.IsNullOrWhiteSpace(token)) return false;

            try
            {
                // 1. Validate Token & Get User
                var user = await _supabase.Auth.GetUser(token);
                if (user == null || user.Id == null) return false;

                var userId = Guid.Parse(user.Id);

                // 2. Check if User is the Founder (Owner) of the startup
                var startupCheck = await _supabase.From<Startup>()
                    .Where(s => s.Sid == startupId && s.FounderId == userId)
                    .Get();

                if (startupCheck.Models.Any()) return true;

                // 3. Optional: Check if User has 'Founder' role explicitly in public.users (if that's the requirement)
                // But generally, only the specific startup owner should edit.
                // For now, strict ownership is safer.

                return false;
            }
            catch
            {
                return false;
            }
        }

        public async Task<string?> GetUserId(string token)
        {
             if (string.IsNullOrWhiteSpace(token)) return null;
             try {
                var user = await _supabase.Auth.GetUser(token);
                return user?.Id;
             } catch { return null; }
        }
    }
}
