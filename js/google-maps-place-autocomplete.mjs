export function mountGoogleMapsPlaceAutocomplete({ maps, map, input, onError = () => {} } = {}) {
    const PlaceAutocompleteElement = maps?.places?.PlaceAutocompleteElement;
    if (typeof PlaceAutocompleteElement !== 'function' || !map || !input?.replaceWith) return null;

    const element = new PlaceAutocompleteElement();
    element.id = input.id || '';
    element.placeholder = input.placeholder || '';
    element.className = 'explore-place-autocomplete';
    input.replaceWith(element);

    element.addEventListener('gmp-select', async ({ placePrediction } = {}) => {
        try {
            if (!placePrediction?.toPlace) throw new Error('Place prediction is unavailable');
            const place = placePrediction.toPlace();
            await place.fetchFields({ fields: ['location'] });
            if (!place.location) throw new Error('Place location is unavailable');
            map.panTo(place.location);
            map.setZoom(13);
        } catch (error) {
            onError(error);
        }
    });
    return element;
}
