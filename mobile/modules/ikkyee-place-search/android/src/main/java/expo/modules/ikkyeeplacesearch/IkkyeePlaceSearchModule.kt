package expo.modules.ikkyeeplacesearch

import android.content.pm.PackageManager
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.maps.model.LatLng
import com.google.android.libraries.places.api.model.Place
import com.google.android.libraries.places.api.model.RectangularBounds
import com.google.android.libraries.places.api.net.Places
import com.google.android.libraries.places.api.net.PlacesStatusCodes
import com.google.android.libraries.places.api.net.SearchByTextRequest
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class IkkyeePlaceSearchModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("IkkyeePlaceSearch")

    AsyncFunction("searchPlaces") {
      query: String,
      north: Double,
      south: Double,
      east: Double,
      west: Double,
      promise: Promise ->
      val context = appContext.reactContext
      if (context == null || context.packageName != EXPECTED_APPLICATION_ID ||
        !validInput(query, north, south, east, west)) {
        promise.reject("E_PLACE_SEARCH_INVALID", "Native place search input is invalid", null)
        return@AsyncFunction
      }

      val applicationInfo = context.packageManager.getApplicationInfo(
        context.packageName,
        PackageManager.GET_META_DATA
      )
      val apiKey = applicationInfo.metaData?.getString(MAPS_API_KEY_METADATA).orEmpty()
      if (apiKey.isBlank()) {
        promise.reject("E_PLACE_SEARCH_UNAVAILABLE", "Native place search is unavailable", null)
        return@AsyncFunction
      }

      if (!Places.isInitialized()) {
        Places.initializeWithNewPlacesApiEnabled(context.applicationContext, apiKey)
      }
      val fields = listOf(
        Place.Field.ID,
        Place.Field.DISPLAY_NAME,
        Place.Field.FORMATTED_ADDRESS,
        Place.Field.LOCATION
      )
      val request = SearchByTextRequest.builder(query.trim(), fields)
        .setLocationBias(RectangularBounds.newInstance(LatLng(south, west), LatLng(north, east)))
        .setMaxResultCount(MAX_RESULTS)
        .build()

      Places.createClient(context).searchByText(request)
        .addOnSuccessListener { response ->
          val projection = response.places.take(MAX_RESULTS).mapNotNull { place ->
            val id = place.id
            val name = place.displayName
            val location = place.location
            if (id.isNullOrBlank() || name.isNullOrBlank() || location == null) null else mapOf(
              "id" to id,
              "name" to name,
              "address" to (place.formattedAddress?.takeIf { it.isNotBlank() } ?: name),
              "latitude" to location.latitude,
              "longitude" to location.longitude
            )
          }
          promise.resolve(projection)
        }
        .addOnFailureListener { error ->
          val statusCode = (error as? ApiException)?.statusCode
          when (statusCode) {
            PlacesStatusCodes.NOT_FOUND -> promise.resolve(emptyList<Map<String, Any>>())
            PlacesStatusCodes.OVER_QUERY_LIMIT ->
              promise.reject("E_PLACE_SEARCH_QUOTA", "Native place search quota exceeded", null)
            PlacesStatusCodes.REQUEST_DENIED ->
              promise.reject("E_PLACE_SEARCH_CONFIGURATION", "Native place search configuration rejected", null)
            CommonStatusCodes.NETWORK_ERROR ->
              promise.reject("E_PLACE_SEARCH_NETWORK", "Native place search network failed", null)
            else -> promise.reject("E_PLACE_SEARCH", "Native place search failed", null)
          }
        }
    }
  }

  private fun validInput(query: String, north: Double, south: Double, east: Double, west: Double): Boolean {
    return query.trim().isNotEmpty() && query.trim().length <= 80 &&
      listOf(north, south, east, west).all { it.isFinite() } &&
      north > south && east > west && north <= 90 && south >= -90 && east <= 180 && west >= -180
  }

  private companion object {
    const val EXPECTED_APPLICATION_ID = "com.ikkyee.mobile"
    const val MAPS_API_KEY_METADATA = "com.google.android.geo.API_KEY"
    const val MAX_RESULTS = 5
  }
}
