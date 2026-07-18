// Mobile detection utilities for responsive behavior

/**
 * Check if the current device is a mobile device
 * Uses user agent string and screen size
 */
export function isMobileDevice(): boolean {
  // Check user agent for mobile indicators
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    'android', 'webos', 'iphone', 'ipad', 'ipod',
    'blackberry', 'windows phone', 'iemobile', 'opera mini'
  ];
  
  const isMobileUserAgent = mobileKeywords.some(keyword => 
    userAgent.includes(keyword)
  );
  
  // Also check screen width (tablets might not be in user agent)
  const isSmallScreen = window.innerWidth < 768;
  
  return isMobileUserAgent || isSmallScreen;
}

/**
 * Hook-compatible version that updates on resize
 */
export function useMobileDetect(): boolean {
  return isMobileDevice();
}

/**
 * Get the appropriate map provider URL based on device type
 * Mobile: Google Maps
 * Desktop: OpenStreetMap
 */
export function getDirectionsLink(
  facility: { latitude: number; longitude: number },
  userLocation?: { lat: number; lng: number } | null,
  isMobile?: boolean
): string {
  const mobile = isMobile !== undefined ? isMobile : isMobileDevice();
  
  if (mobile) {
    // Use Google Maps for mobile
    if (userLocation) {
      return `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${facility.latitude},${facility.longitude}&travelmode=driving`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${facility.latitude},${facility.longitude}`;
  } else {
    // Use OpenStreetMap for desktop
    if (userLocation) {
      return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userLocation.lat}%2C${userLocation.lng}%3B${facility.latitude}%2C${facility.longitude}`;
    }
    return `https://www.openstreetmap.org/?mlat=${facility.latitude}&mlon=${facility.longitude}&zoom=16`;
  }
}

/**
 * Open navigation in external app (for mobile)
 * This will open Google Maps app on phones
 */
export function openExternalNavigation(
  facility: { latitude: number; longitude: number },
  userLocation?: { lat: number; lng: number } | null
): void {
  const url = getDirectionsLink(facility, userLocation, true);
  window.open(url, '_blank');
}
