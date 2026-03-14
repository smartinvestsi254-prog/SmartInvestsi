using System;
using System.ComponentModel.DataAnnotations;

namespace SmartInvest.Models.Entities.Social
{
    public class WorkPost
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string UserId { get; set; }

        [Required]
        [StringLength(160)]
        public string Title { get; set; }

        [StringLength(2000)]
        public string Description { get; set; }

        [Required]
        public string ImageUrl { get; set; }

        public string ThumbnailUrl { get; set; }

        public WorkPostVisibility Visibility { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public enum WorkPostVisibility
    {
        Public,
        ConnectionsOnly
    }
}
