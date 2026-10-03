/**
 * Converts degrees to radians
 */
const toRad = (value) => (value * Math.PI) / 180;

/**
 * Calculates Haversine distance in kilometers between two [longitude, latitude] coordinates
 * @param {[number, number]} coords1 [longitude, latitude]
 * @param {[number, number]} coords2 [longitude, latitude]
 * @returns {number} distance in kilometers rounded to 2 decimals
 */
export const calculateDistanceKm = (coords1, coords2) => {
  if (!coords1 || !coords2 || coords1.length < 2 || coords2.length < 2) {
    return 0;
  }

  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;

  const R = 6371; // Earth's mean radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100;
};

/**
 * Creates standard GeoJSON Point object from latitude and longitude
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {{type: string, coordinates: [number, number]}}
 */
export const toGeoJSONPoint = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    return { type: 'Point', coordinates: [0, 0] };
  }

  return {
    type: 'Point',
    coordinates: [lng, lat],
  };
};
