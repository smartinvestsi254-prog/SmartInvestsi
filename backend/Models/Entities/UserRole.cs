namespace SmartInvest.Models.Entities
{
    public enum UserRole
    {
        User,           // Basic user
        Buyer,          // Can purchase products
        Seller,         // Can list products for sale
        Merchant,       // Business account, can manage products & orders
        Executive,      // Granted by admin, elevated access
        Admin           // Full system access
    }
}
