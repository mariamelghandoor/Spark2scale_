using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;

namespace Spark2Scale_.Server.Models
{
    [Table("pitchdeck_likes")]
    public class PitchDeckLike : BaseModel
    {
        [PrimaryKey("investor_id", true)]
        public Guid InvestorId { get; set; }

        [PrimaryKey("pitchdeck_id", true)]
        public Guid PitchDeckId { get; set; }

        [Column("liked_at")]
        public DateTime LikedAt { get; set; }

        [Column("liked")]
        public bool Liked { get; set; }

        [Column("contacted")]
        public bool Contacted { get; set; }
    }

    public class PitchDeckInteractionDto
    {
        public Guid investor_id { get; set; }
        public Guid pitchdeck_id { get; set; }
        public bool liked { get; set; }
        public bool contacted { get; set; }
    }
}