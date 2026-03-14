using System;
using System.ComponentModel.DataAnnotations;

namespace SmartInvest.Models.Entities.Social
{
    public class UserConnection
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string RequesterId { get; set; }

        [Required]
        public string AddresseeId { get; set; }

        public ConnectionStatus Status { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? RespondedAt { get; set; }

        public string Notes { get; set; }
    }

    public enum ConnectionStatus
    {
        Pending,
        Accepted,
        Rejected,
        Blocked
    }
}
