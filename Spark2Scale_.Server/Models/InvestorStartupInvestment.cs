using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;

namespace Spark2Scale_.Server.Models
{
    [Table("investor_startup_investments")]
    public class InvestorStartupInvestment : BaseModel
    {
        [PrimaryKey("investor_id", false)]
        [Column("investor_id")]
        public Guid InvestorId { get; set; }

        [PrimaryKey("startup_id", false)]
        [Column("startup_id")]
        public Guid StartupId { get; set; }

        [Column("invested_at")]
        public DateTime? InvestedAt { get; set; } = DateTime.UtcNow;

        [Column("amount")]
        public decimal? Amount { get; set; }
    }

    // DTO with primary constructor
    public record InvestorStartupInvestmentDto(Guid InvestorId, Guid StartupId, DateTime? InvestedAt = null, decimal? Amount = null);
}
