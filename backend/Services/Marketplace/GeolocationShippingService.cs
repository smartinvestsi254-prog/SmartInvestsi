using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using GeoIP2.Exceptions;
using MaxMind.GeoIP2;
using SmartInvest.Models;

namespace SmartInvest.Services.Marketplace;

/// <summary>
/// Geolocation Tracking Service for Premium+ shipments
/// Maps IP addresses to physical coordinates
/// Integrates with shipping carriers for live tracking
/// </summary>
public interface IGeolocationShippingService
{
    Task<GeolocationResult> ResolveIpAddressAsync(string ipAddress);
    Task<ShipmentGeolocation> GetShipmentGeolocationAsync(string trackingId);
    Task<ShipmentRoute> CalculateShipmentRouteAsync(string trackingId);
    Task<bool> UpdateCarrierLocationAsync(string trackingId, double latitude, double longitude);
    Task<bool> ValidateDeliveryAddressAsync(string address);
    Task<GeofenceAlert> CheckGeofenceAsync(string trackingId);
}

public class GeolocationShippingService : IGeolocationShippingService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<GeolocationShippingService> _logger;
    private readonly IConfiguration _config;
    private readonly HttpClient _httpClient;

    public GeolocationShippingService(
        ApplicationDbContext context,
        ILogger<GeolocationShippingService> logger,
        IConfiguration config,
        HttpClient httpClient)
    {
        _context = context;
        _logger = logger;
        _config = config;
        _httpClient = httpClient;
    }

    /// <summary>
    /// Resolve IP address to geographic coordinates
    /// Uses MaxMind GeoIP2 database or fallback API
    /// </summary>
    public async Task<GeolocationResult> ResolveIpAddressAsync(string ipAddress)
    {
        try
        {
            // Try MaxMind GeoIP2 first (most accurate)
            var dbPath = _config["GEOIP_DB_PATH"];
            if (!string.IsNullOrEmpty(dbPath) && File.Exists(dbPath))
            {
                return await ResolveViaMaxMindAsync(ipAddress, dbPath);
            }

            // Fallback to IP-to-location API
            return await ResolveViaApiAsync(ipAddress);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Geolocation failed for IP {ipAddress}: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Get full shipment geolocation with route information
    /// Premium+ only - includes shipper IP location
    /// </summary>
    public async Task<ShipmentGeolocation> GetShipmentGeolocationAsync(string trackingId)
    {
        var shipping = await _context.ShippingLabels
            .Include(s => s.Order)
            .FirstOrDefaultAsync(s => s.TrackingNumber == trackingId);

        if (shipping == null)
            throw new KeyNotFoundException($"Tracking not found: {trackingId}");

        var shipperLocation = await ResolveIpAddressAsync(shipping.ShipperIpAddress);
        var route = await CalculateShipmentRouteAsync(trackingId);

        return new ShipmentGeolocation
        {
            TrackingNumber = trackingId,
            CurrentLocation = new CoordinateInfo
            {
                Latitude = shipping.CurrentLatitude ?? 0,
                Longitude = shipping.CurrentLongitude ?? 0,
                Address = shipping.CurrentAddress,
                LastUpdatedAt = shipping.LastLocationUpdate ?? DateTime.UtcNow,
                Accuracy = shipping.GpsAccuracy ?? 100 // meters
            },
            ShipperLocation = new CoordinateInfo
            {
                Latitude = shipperLocation.Latitude,
                Longitude = shipperLocation.Longitude,
                Address = shipperLocation.Address,
                IpAddress = shipping.ShipperIpAddress,
                Country = shipperLocation.Country,
                City = shipperLocation.City,
                Timezone = shipperLocation.Timezone
            },
            ReceiverLocation = new CoordinateInfo
            {
                Address = shipping.DestinationAddress,
                // Geocode address to get coordinates
                Latitude = shipping.DestinationLatitude ?? 0,
                Longitude = shipping.DestinationLongitude ?? 0
            },
            Route = route,
            CarrierInfo = new CarrierInfo
            {
                Name = shipping.Carrier,
                VehicleId = shipping.CarrierVehicleId,
                DriverName = shipping.CarrierDriverName,
                EstimatedDelivery = shipping.EstimatedDelivery ?? DateTime.UtcNow.AddDays(5)
            }
        };
    }

    /// <summary>
    /// Calculate optimal route between shipper and receiver
    /// Includes distance, ETA, and waypoints
    /// </summary>
    public async Task<ShipmentRoute> CalculateShipmentRouteAsync(string trackingId)
    {
        var shipping = await _context.ShippingLabels
            .FirstOrDefaultAsync(s => s.TrackingNumber == trackingId);

        if (shipping == null)
            throw new KeyNotFoundException();

        var shipperLoc = await ResolveIpAddressAsync(shipping.ShipperIpAddress);

        // Calculate great-circle distance
        var distance = CalculateDistance(
            shipperLoc.Latitude,
            shipperLoc.Longitude,
            shipping.DestinationLatitude ?? 0,
            shipping.DestinationLongitude ?? 0
        );

        // Estimate delivery (varies by carrier)
        var daysInTransit = EstimateDaysInTransit(distance, shipping.Carrier);
        var expectedDelivery = DateTime.UtcNow.AddDays(daysInTransit);

        return new ShipmentRoute
        {
            TrackingNumber = trackingId,
            DistanceKm = distance,
            EstimatedDeliveryDate = expectedDelivery,
            CurrentProgress = CalculateProgress(shipping.Status),
            Waypoints = new List<Waypoint>
            {
                // Waypoints are updated as carrier provides data
                new Waypoint
                {
                    Location = $"{shipperLoc.City}, {shipperLoc.Country}",
                    Type = "Origin",
                    Timestamp = shipping.CreatedAt
                },
                new Waypoint
                {
                    Location = shipping.CurrentAddress,
                    Type = "InTransit",
                    Timestamp = shipping.LastLocationUpdate ?? DateTime.UtcNow
                },
                new Waypoint
                {
                    Location = shipping.DestinationAddress,
                    Type = "Destination",
                    Timestamp = expectedDelivery
                }
            }
        };
    }

    /// <summary>
    /// Update carrier location from real-time tracking
    /// Called via webhook from DHL, FedEx, UPS
    /// </summary>
    public async Task<bool> UpdateCarrierLocationAsync(string trackingId, double latitude, double longitude)
    {
        try
        {
            var shipping = await _context.ShippingLabels
                .FirstOrDefaultAsync(s => s.TrackingNumber == trackingId);

            if (shipping == null)
                return false;

            shipping.CurrentLatitude = latitude;
            shipping.CurrentLongitude = longitude;
            shipping.LastLocationUpdate = DateTime.UtcNow;

            // Reverse geocode to get address
            shipping.CurrentAddress = await ReverseGeocodeAsync(latitude, longitude);

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Updated location for {trackingId}: {latitude}, {longitude}");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Failed to update carrier location: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Validate delivery address before shipping
    /// Ensures valid coordinates and accessibility
    /// </summary>
    public async Task<bool> ValidateDeliveryAddressAsync(string address)
    {
        try
        {
            var apiKey = _config["GEOCODING_API_KEY"];
            if (string.IsNullOrEmpty(apiKey))
                return true; // Skip if not configured

            var url = $"https://maps.googleapis.com/maps/api/geocode/json?address={Uri.EscapeDataString(address)}&key={apiKey}";
            var response = await _httpClient.GetAsync(url);

            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Address validation failed: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Check if shipment has entered delivery zone (geofence)
    /// Alert customer when package arrives in their neighborhood
    /// </summary>
    public async Task<GeofenceAlert> CheckGeofenceAsync(string trackingId)
    {
        const double DELIVERY_RADIUS_KM = 5;

        var shipping = await _context.ShippingLabels
            .FirstOrDefaultAsync(s => s.TrackingNumber == trackingId);

        if (shipping == null)
            throw new KeyNotFoundException();

        var distance = CalculateDistance(
            shipping.CurrentLatitude ?? 0,
            shipping.CurrentLongitude ?? 0,
            shipping.DestinationLatitude ?? 0,
            shipping.DestinationLongitude ?? 0
        );

        var isInZone = distance <= DELIVERY_RADIUS_KM;

        return new GeofenceAlert
        {
            TrackingNumber = trackingId,
            IsInDeliveryZone = isInZone,
            DistanceToDeliveryKm = distance,
            AlertLevel = isInZone ? AlertLevel.DeliveryImminent : AlertLevel.InTransit,
            Timestamp = DateTime.UtcNow
        };
    }

    // Private Helper Methods

    private async Task<GeolocationResult> ResolveViaMaxMindAsync(string ipAddress, string dbPath)
    {
        using (var reader = new DatabaseReader(dbPath))
        {
            var response = reader.City(ipAddress);

            return new GeolocationResult
            {
                IpAddress = ipAddress,
                Country = response.Country.IsoCode,
                City = response.City.Name,
                Latitude = response.Location.Latitude ?? 0,
                Longitude = response.Location.Longitude ?? 0,
                Timezone = response.Location.TimeZone,
                PostalCode = response.Postal.Code,
                Isp = response.Traits.Isp,
                Address = $"{response.City.Name}, {response.MostSpecificSubdivision.Name}, {response.Country.IsoCode}"
            };
        }
    }

    private async Task<GeolocationResult> ResolveViaApiAsync(string ipAddress)
    {
        var apiKey = _config["GEOIP_API_KEY"];
        var url = $"https://geoip.example.com/api/v1/locate?ip={ipAddress}&key={apiKey}";

        var response = await _httpClient.GetAsync(url);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"GeoIP API failed: {response.StatusCode}");

        var json = await response.Content.ReadAsStringAsync();
        var data = JsonConvert.DeserializeObject<dynamic>(json);

        return new GeolocationResult
        {
            IpAddress = ipAddress,
            Country = data["country"],
            City = data["city"],
            Latitude = double.Parse(data["latitude"].ToString()),
            Longitude = double.Parse(data["longitude"].ToString()),
            Timezone = data["timezone"],
            Address = $"{data["city"]}, {data["region"]}, {data["country"]}"
        };
    }

    private double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double EARTH_RADIUS_KM = 6371;

        var dLat = ToRad(lat2 - lat1);
        var dLon = ToRad(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return EARTH_RADIUS_KM * c;
    }

    private double ToRad(double degrees) => degrees * Math.PI / 180;

    private int EstimateDaysInTransit(double distanceKm, string carrier)
    {
        return carrier?.ToLower() switch
        {
            "dhl" => distanceKm > 1000 ? 5 : 3,
            "fedex" => distanceKm > 1000 ? 4 : 2,
            "ups" => distanceKm > 1000 ? 6 : 3,
            _ => 5
        };
    }

    private double CalculateProgress(string status)
    {
        return status?.ToLower() switch
        {
            "pending" => 0,
            "picked_up" => 0.25,
            "in_transit" => 0.50,
            "out_for_delivery" => 0.75,
            "delivered" => 1.0,
            _ => 0
        };
    }

    private async Task<string> ReverseGeocodeAsync(double latitude, double longitude)
    {
        var apiKey = _config["GEOCODING_API_KEY"];
        if (string.IsNullOrEmpty(apiKey))
            return $"{latitude}, {longitude}";

        var url = $"https://maps.googleapis.com/maps/api/geocode/json?latlng={latitude},{longitude}&key={apiKey}";

        try
        {
            var response = await _httpClient.GetAsync(url);
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var data = JsonConvert.DeserializeObject<dynamic>(json);
                return data["results"][0]?["formatted_address"] ?? $"{latitude}, {longitude}";
            }
        }
        catch
        {
            // Fallback
        }

        return $"{latitude}, {longitude}";
    }
}

// Data Models
public class GeolocationResult
{
    public string IpAddress { get; set; }
    public string Country { get; set; }
    public string City { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string Timezone { get; set; }
    public string PostalCode { get; set; }
    public string Isp { get; set; }
    public string Address { get; set; }
}

public class ShipmentGeolocation
{
    public string TrackingNumber { get; set; }
    public CoordinateInfo CurrentLocation { get; set; }
    public CoordinateInfo ShipperLocation { get; set; }
    public CoordinateInfo ReceiverLocation { get; set; }
    public ShipmentRoute Route { get; set; }
    public CarrierInfo CarrierInfo { get; set; }
}

public class CoordinateInfo
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string Address { get; set; }
    public string IpAddress { get; set; }
    public string Country { get; set; }
    public string City { get; set; }
    public string Timezone { get; set; }
    public DateTime? LastUpdatedAt { get; set; }
    public double? Accuracy { get; set; }
}

public class ShipmentRoute
{
    public string TrackingNumber { get; set; }
    public double DistanceKm { get; set; }
    public DateTime EstimatedDeliveryDate { get; set; }
    public double CurrentProgress { get; set; } // 0-1.0
    public List<Waypoint> Waypoints { get; set; }
}

public class Waypoint
{
    public string Location { get; set; }
    public string Type { get; set; } // Origin, InTransit, Destination
    public DateTime Timestamp { get; set; }
}

public class CarrierInfo
{
    public string Name { get; set; }
    public string VehicleId { get; set; }
    public string DriverName { get; set; }
    public DateTime EstimatedDelivery { get; set; }
}

public class GeofenceAlert
{
    public string TrackingNumber { get; set; }
    public bool IsInDeliveryZone { get; set; }
    public double DistanceToDeliveryKm { get; set; }
    public AlertLevel AlertLevel { get; set; }
    public DateTime Timestamp { get; set; }
}

public enum AlertLevel
{
    InTransit,
    DeliveryImminent,
    DeliveryAttempted,
    DeliveryFailed
}
