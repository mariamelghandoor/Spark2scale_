using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;

namespace Spark2Scale_.Server.Models
{
    [Table("pitchdeck_likes")]
    public class PitchDeckLike : BaseModel
    {
        // CHANGE THIS FROM false TO true
        // true = "I am providing this ID manually, please send it to the database"
        [PrimaryKey("investor_id", true)]
        public Guid InvestorId { get; set; }

        [Column("pitchdeck_id")]
        public Guid PitchDeckId { get; set; }

        [Column("liked_at")]
        public DateTime LikedAt { get; set; }
    }

    public class PitchDeckLikeInsertDto
    {
        public Guid investor_id { get; set; }
        public Guid pitchdeck_id { get; set; }
    }
}