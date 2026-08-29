import CoreLocation
import ExpoModulesCore
import GooglePlaces

public final class IkkyeePlaceSearchModule: Module {
  private var initialized = false

  public func definition() -> ModuleDefinition {
    Name("IkkyeePlaceSearch")

    AsyncFunction("searchPlaces") { (
      query: String,
      north: Double,
      south: Double,
      east: Double,
      west: Double,
      promise: Promise
    ) in
      guard validInput(query, north, south, east, west),
            Bundle.main.bundleIdentifier == expectedBundleId else {
        promise.reject("E_PLACE_SEARCH_INVALID", "Native place search input is invalid")
        return
      }
      guard let apiKey = Bundle.main.object(forInfoDictionaryKey: "GMSApiKey") as? String,
            !apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
        promise.reject("E_PLACE_SEARCH_UNAVAILABLE", "Native place search is unavailable")
        return
      }
      if !initialized {
        GMSPlacesClient.provideAPIKey(apiKey)
        initialized = true
      }

      let properties = [
        GMSPlaceProperty.placeID,
        GMSPlaceProperty.name,
        GMSPlaceProperty.formattedAddress,
        GMSPlaceProperty.coordinate
      ].map { $0.rawValue }
      let request = GMSPlaceSearchByTextRequest(
        textQuery: query.trimmingCharacters(in: .whitespacesAndNewlines),
        placeProperties: properties
      )
      request.maxResultCount = 5
      request.locationBias = GMSPlaceRectangularLocationOption(
        northEast: CLLocationCoordinate2D(latitude: north, longitude: east),
        southWest: CLLocationCoordinate2D(latitude: south, longitude: west)
      )

      GMSPlacesClient.shared().searchByText(with: request) { places, error in
        if let error {
          rejectPlaceSearchError(error, promise)
          return
        }
        guard let places else {
          promise.reject("E_PLACE_SEARCH", "Native place search failed")
          return
        }
        let projection: [[String: Any]] = places.prefix(5).compactMap { place in
          guard let id = place.placeID, !id.isEmpty,
                let name = place.name, !name.isEmpty else { return nil }
          return [
            "id": id,
            "name": name,
            "address": place.formattedAddress?.isEmpty == false ? place.formattedAddress! : name,
            "latitude": place.coordinate.latitude,
            "longitude": place.coordinate.longitude
          ]
        }
        promise.resolve(projection)
      }
    }
  }
}

private func rejectPlaceSearchError(_ error: Error, _ promise: Promise) {
  let providerError = error as NSError
  guard providerError.domain == kGMSPlacesErrorDomain,
        let placesCode = GMSPlacesErrorCode(rawValue: providerError.code) else {
    promise.reject("E_PLACE_SEARCH", "Native place search failed")
    return
  }
  switch placesCode {
  case .networkError:
    promise.reject("E_PLACE_SEARCH_NETWORK", "Native place search network failed")
  case .usageLimitExceeded, .rateLimitExceeded, .deviceRateLimitExceeded:
    promise.reject("E_PLACE_SEARCH_QUOTA", "Native place search quota exceeded")
  case .keyInvalid, .keyExpired, .accessNotConfigured, .incorrectBundleIdentifier:
    promise.reject("E_PLACE_SEARCH_CONFIGURATION", "Native place search configuration rejected")
  default:
    promise.reject("E_PLACE_SEARCH", "Native place search failed")
  }
}

private let expectedBundleId = "com.ikkyee.mobile"

private func validInput(_ query: String, _ north: Double, _ south: Double, _ east: Double, _ west: Double) -> Bool {
  let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
  return !trimmed.isEmpty && trimmed.count <= 80 &&
    north.isFinite && south.isFinite && east.isFinite && west.isFinite &&
    north > south && east > west && north <= 90 && south >= -90 && east <= 180 && west >= -180
}
