using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;
using System.Collections.Generic;

namespace Spark2Scale_.Server.Models
{
    [Table("pitchdecks")]
    public class PitchDeck : BaseModel
    {
        [PrimaryKey("pitchdeckid", false)]
        public Guid pitchdeckid { get; set; }

        [Column("startup_id")]
        public Guid startup_id { get; set; }

        [Column("tags")]
        public List<string> tags { get; set; } = new List<string>();

        [Column("countlikes")]
        public int countlikes { get; set; }

        [Column("created_at")]
        public DateTime created_at { get; set; }
    }

    // INPUT: Only asks for the startup link and tags
    public class PitchDeckInsertDto
    {
        public Guid startup_id { get; set; }
        public List<string> tags { get; set; } = new List<string>();
        public int countlikes { get; set; }
    }

    // OUTPUT: Returns the ID and Timestamp
    public class PitchDeckResponseDto
    {
        public Guid pitchdeckid { get; set; }
        public Guid startup_id { get; set; }
        public List<string> tags { get; set; }
        public int countlikes { get; set; }
        public DateTime created_at { get; set; }
    }
}