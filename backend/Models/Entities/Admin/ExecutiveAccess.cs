using System;
using System.ComponentModel.DataAnnotations;

namespace SmartInvest.Models.Entities.Admin
{
    public class ExecutiveAccess
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string UserId { get; set; }

        [Required]
        public string GrantedByAdminId { get; set; }

        public string AccessLevel { get; set; }

        public string Permissions { get; set; }

        public string Reason { get; set; }

        public DateTime GrantedAt { get; set; }

        public DateTime? RevokedAt { get; set; }

        public string RevokedBy { get; set; }

        public bool IsActive { get; set; }
    }
}
