using SmartInvest.Models.Entities.Marketplace;
using System.Net;
using GeoCoordinatePortable;

namespace SmartInvest.Services.Marketplace;

/// <summary>
/// Geolocation & Shipment Mapping Service
/// Tracks shipments on a map with IP location, physical address, and route optimization
/// </summary>
public interface IGeolocationService
{
    Task<ShipmentLocation> LogShipmentLocationAsync(string shipmentId, string ipAddress, string address, LocationType locationType);
    Task<List<ShipmentLocation>> GetShipmentRouteAsync(string shippingLabelId);
    Task<double> CalculateDistanceAsync(ShipmentLocation from, ShipmentLocation to);
    Task<GeoData> GetGeoDataFromIpAsync(string ipAddress);
    Task<List<ShipmentLocation>> GetShipmentsInRegionAsync(string country, string city);
    Task<ShipmentLocation> UpdateLocationAsync(string locationId, string address, decimal? latitude, decimal? longitude);
    Task<Map> GenerateShipmentMapAsync(string shippingLabelId);
}

public class GeolocationService : IGeolocationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<GeolocationService> _logger;
    private readonly HttpClient _httpClient;

    public GeolocationService(ApplicationDbContext context, ILogger<GeolocationService> logger, HttpClient httpClient)
    {
        _context = context;
        _logger = logger;
        _httpClient = httpClient;
    }

    public async Task<ShipmentLocation> LogShipmentLocationAsync(string shippingLabelId, string ipAddress, string address, LocationType locationType)
    {
        try
        {
            // Get geolocation data from IP
            var geoData = await GetGeoDataFromIpAsync(ipAddress);

            var location = new ShipmentLocation
            {
                ShippingLabelId = shippingLabelId,
                IpAddress = ipAddress,
                FullAddress = address,
                LocationType = locationType,
                Latitude = geoData.Latitude,
                Longitude = geoData.Longitude,
                Country = geoData.Country,
                City = geoData.City,
                PostalCode = geoData.PostalCode,
                GeohashCode = GenerateGeohash(geoData.Latitude, geoData.Longitude),
                Accuracy = geoData.Accuracy,
                Timestamp = DateTime.UtcNow
            };

            _context.ShipmentLocations.Add(location);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Shipment location logged: {shippingLabelId} at {location.City}, {location.Country}");
            return location;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error logging shipment location: {ex.Message}");
            throw;
        }
    }

    public async Task<List<ShipmentLocation>> GetShipmentRouteAsync(string shippingLabelId)
    {
        return await _context.ShipmentLocations
            .Where(l => l.ShippingLabelId == shippingLabelId)
            .OrderBy(l => l.Timestamp)
            .ToListAsync();
    }

    public async Task<double> CalculateDistanceAsync(ShipmentLocation from, ShipmentLocation to)
    {
        try
        {
            if (!double.TryParse(from.Latitude, out var fromLat) || 
                !double.TryParse(from.Longitude, out var fromLon) ||
                !double.TryParse(to.Latitude, out var toLat) || 
                !double.TryParse(to.Longitude, out var toLon))
            {
                return -1; // Invalid coordinates
            }

            var coord1 = new GeoCoordinate(fromLat, fromLon);
            var coord2 = new GeoCoordinate(toLat, toLon);

            // Distance in meters
            var distanceMeters = coord1.GetDistanceTo(coord2);
            return distanceMeters / 1000; // Convert to kilometers
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error calculating distance: {ex.Message}");
            return -1;
        }
    }

    public async Task<GeoData> GetGeoDataFromIpAsync(string ipAddress)
    {
        try
        {
            // Use IP-API.com free tier (simple implementation)
            // In production, use a paid service for better accuracy
            var response = await _httpClient.GetAsync($"http://ip-api.com/json/{ipAddress}?fields=status,country,city,zip,lat,lon,isp");
            
            if (!response.IsSuccessStatusCode)
            {
                return new GeoData
                {
                    Latitude = "0",
                    Longitude = "0",
                    Country = "Unknown",
                    City = "Unknown",
                    Accuracy = 1000
                };
            }

            var content = await response.Content.ReadAsStringAsync();
            var data = System.Text.Json.JsonSerializer.Deserialize<dynamic>(content);

            return new GeoData
            {
                IpAddress = ipAddress,
                Latitude = data?.GetProperty("lat").GetDouble().ToString() ?? "0",
                Longitude = data?.GetProperty("lon").GetDouble().ToString() ?? "0",
                Country = data?.GetProperty("country").GetString() ?? "Unknown",
                City = data?.GetProperty("city").GetString() ?? "Unknown",
                PostalCode = data?.GetProperty("zip").GetString() ?? "",
                Accuracy = 100 // IP geolocation accuracy in meters (100m typical)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting geo data from IP: {ex.Message}");
            return new GeoData { Country = "Unknown", City = "Unknown", Accuracy = 1000 };
        }
    }

    public async Task<List<ShipmentLocation>> GetShipmentsInRegionAsync(string country, string city)
    {
        return await _context.ShipmentLocations
            .Where(l => l.Country == country && (string.IsNullOrEmpty(city) || l.City == city))
            .OrderByDescending(l => l.Timestamp)
            .Take(100)
            .ToListAsync();
    }

    public async Task<ShipmentLocation> UpdateLocationAsync(string locationId, string address, decimal? latitude, decimal? longitude)
    {
        var location = await _context.ShipmentLocations.FindAsync(locationId);
        if (location == null)
            throw new KeyNotFoundException("Location not found");

        location.FullAddress = address ?? location.FullAddress;
        if (latitude.HasValue) location.Latitude = latitude.Value.ToString();
        if (longitude.HasValue) location.Longitude = longitude.Value.ToString();
        location.Timestamp = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return location;
    }

    public async Task<Map> GenerateShipmentMapAsync(string shippingLabelId)
    {
        var locations = await GetShipmentRouteAsync(shippingLabelId);

        if (!locations.Any())
            throw new InvalidOperationException("No locations found for shipment");

        var map = new Map
        {
            ShippingLabelId = shippingLabelId,
            Origin = locations.First(l => l.LocationType == LocationType.Origin),
            Destination = locations.LastOrDefault(l => l.LocationType == LocationType.Destination),
            Waypoints = locations.Where(l => l.LocationType == LocationType.InTransit).ToList(),
            Status = DetermineMapStatus(locations),
            TotalDistance = await CalculateTotalDistanceAsync(locations)
        };

        return map;
    }

    private async Task<double> CalculateTotalDistanceAsync(List<ShipmentLocation> locations)
    {
        double total = 0;
        for (int i = 0; i < locations.Count - 1; i++)
        {
            total += await CalculateDistanceAsync(locations[i], locations[i + 1]);
        }
        return total;
    }

    private string DetermineMapStatus(List<ShipmentLocation> locations)
    {
        var latest = locations.Last();
        return latest.LocationType switch
        {
            LocationType.Origin => "Pickup",
            LocationType.InTransit => "In Transit",
            LocationType.Destination => "Delivered",
            _ => "Unknown"
        };
    }

    private string GenerateGeohash(string lat, string lon)
    {
        // Simple geohash generation for region queries
        if (!double.TryParse(lat, out var latitude) || !double.TryParse(lon, out var longitude))
            return "";

        // Simplified geohash (real implementation would use proper encoding)
        var latPrefix = ((int)(latitude * 2)).ToString("X");
        var lonPrefix = ((int)(longitude * 2)).ToString("X");
        return $"{latPrefix}{lonPrefix}";
    }
}

public class GeoData
{
    public string IpAddress { get; set; }
    public string Latitude { get; set; }
    public string Longitude { get; set; }
    public string Country { get; set; }
    public string City { get; set; }
    public string PostalCode { get; set; }
    public double Accuracy { get; set; } // In meters
}

public class Map
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ShippingLabelId { get; set; }
    public ShipmentLocation Origin { get; set; }
    public ShipmentLocation Destination { get; set; }
    public List<ShipmentLocation> Waypoints { get; set; }
    public string Status { get; set; } // "Pickup", "In Transit", "Delivered"
    public double TotalDistance { get; set; } // km
    public string MapUrl { get; set; } // Generated map URL
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
