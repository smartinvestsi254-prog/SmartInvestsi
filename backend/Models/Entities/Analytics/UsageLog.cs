using System;
using System.ComponentModel.DataAnnotations;

namespace SmartInvest.Models.Entities.Analytics
{
    public class UsageLog
    {
        [Key]
        public int Id { get; set; }

        public string UserId { get; set; }

        public string Action { get; set; }

        public string EntityType { get; set; }

        public string EntityId { get; set; }

        public string IpAddress { get; set; }

        public string UserAgent { get; set; }

        public string Metadata { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
