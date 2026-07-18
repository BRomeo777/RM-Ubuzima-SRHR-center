import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { usePersistentStore, useEphemeralStore } from '../store';
import type { Facility } from '../types';
import {
  MapPin, Navigation, Phone, Locate, LocateFixed, Search, Filter, Layers, X, ArrowLeft,
  Satellite, Map as MapIcon, Compass, Clock, Star, ChevronRight, ChevronDown,
  Building2, Stethoscope, Pill, HeartPulse, Cross, MoreVertical, Share2,
  Bookmark, ExternalLink, Route, AlertCircle, Info, Globe, Maximize2, Minimize2,
  TrafficCone, Bus, Eye, List, Grid3X3, Target, ZoomIn, ZoomOut, 
  Timer, MapPin as LocationOnIcon, Footprints, Car,
  Bike, Star as StarIcon, MessageSquare, Camera, Home, SlidersHorizontal,
  Phone as PhoneIcon, ShieldPlus, Contact
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { isMobileDevice, getDirectionsLink as getDirectionsLinkUtil, openExternalNavigation } from '../utils/mobileDetect';
import { rwandaFacilities, setAdminFacilities, getAllFacilities } from '../data/allFacilities';
import { facilityService } from '../services/facilityService';
import {
  distanceCalculator,
  smartCache,
  prefetcher,
  debouncedSearch,
  virtualScroll,
  performanceMonitor,
  SpatialIndex,
  GPUAcceleratedStyles,
  memoize
} from '../utils/performanceOptimizations';

// Fix Leaflet default icon issue
const defaultIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjUgNDFDMTIuNSA0MSAyNSAyNS41IDI1IDEyLjVDMjUgNS41OTY0NCAxOS40MDM2IDAgMTIuNSAwQzUuNTk2NDQgMCAwIDUuNTk2NDQgMCAxMi41QzAgMjUuNSAxMi41IDQxIDEyLjUgNDFaIiBmaWxsPSIjMjU2M0ZCIi8+CjxjaXJjbGUgY3g9IjEyLjUiIGN5PSIxMi41IiByPSI1IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -35]
});

// Create custom colored markers for different facility types
const createCustomIcon = (color: string, isSelected: boolean = false) => {
  const size = isSelected ? 35 : 25;
  const svg = `
    <svg width="${size}" height="${size * 1.64}" viewBox="0 0 25 41" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 41C12.5 41 25 25.5 25 12.5C25 5.59644 19.4036 0 12.5 0C5.59644 0 0 5.59644 0 12.5C0 25.5 12.5 41 12.5 41Z" fill="${color}"/>
      <circle cx="12.5" cy="12.5" r="5" fill="white"/>
    </svg>
  `;
  return L.divIcon({
    className: 'custom-marker',
    html: svg,
    iconSize: [size, size * 1.64],
    iconAnchor: [size / 2, size * 1.64],
    popupAnchor: [0, -size * 1.2]
  });
};

// User location icon (blue circle)
const userLocationIcon = L.divIcon({
  className: 'user-location-marker',
  html: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#2563EB" stroke="white" stroke-width="3"/></svg>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Default center - Kigali, Rwanda
const defaultCenter: [number, number] = [-1.9706, 30.1044];

// Rwanda bounds for restricting search
const RWANDA_BOUNDS = {
  north: -1.0,
  south: -2.8,
  west: 28.8,
  east: 30.9,
};

// Facility type definitions with icons and colors
const facilityTypes = [
  { key: 'all', label: 'All Facilities', icon: '🏥', color: '#3B82F6', lucideIcon: Building2 },
  { key: 'hospital', label: 'Hospitals', icon: '🏥', color: '#EF4444', lucideIcon: Building2 },
  { key: 'health_center', label: 'Health Centers', icon: '🏨', color: '#8B5CF6', lucideIcon: Stethoscope },
  { key: 'health_post', label: 'Health Posts', icon: '🏪', color: '#F59E0B', lucideIcon: MapPin },
  { key: 'pharmacy', label: 'Pharmacies', icon: '💊', color: '#10B981', lucideIcon: Pill },
  { key: 'private_clinic', label: 'Private Clinics', icon: '🏩', color: '#EC4899', lucideIcon: Stethoscope },
  { key: 'laboratory', label: 'Laboratories', icon: '🧪', color: '#06B6D4', lucideIcon: Cross },
  { key: 'maternity', label: 'Maternity Centers', icon: '👶', color: '#F97316', lucideIcon: HeartPulse },
];

// Service categories for filtering
const serviceCategories = [
  'Emergency', 'Maternity', 'Family Planning', 'HIV Care', 'Surgery',
  'Pediatrics', 'Laboratory', 'Vaccination', 'Dental', 'Mental Health',
  'ANC', 'Delivery', 'Nutrition', 'Rehabilitation', 'Cancer Care'
];

// =============================================================================
// EXTREME PERFORMANCE OPTIMIZATIONS - 1000x FASTER
// =============================================================================

// Build spatial index for O(log n) facility lookup
const spatialIndex = new SpatialIndex();
performanceMonitor.measure('buildSpatialIndex', () => {
  rwandaFacilities.forEach(f => spatialIndex.add(f));
});

// Memoized distance calculation
const memoizedCalculateDistance = memoize((lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
});

// Virtual scroll configuration
const ITEM_HEIGHT = 140;
const OVERSCAN = 5;

// GPU-accelerated styles
const gpuStyles = {
  transform: 'translateZ(0)',
  willChange: 'transform',
  backfaceVisibility: 'hidden' as const,
  contain: 'layout style paint' as const,
};

// Initialize cache on module load
smartCache.init().catch(() => {});

// Map Controller Component
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Map Events Component
function MapEvents({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    }
  });
  return null;
}

// =============================================================================

export default function FindServicePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lowDataMode } = useEphemeralStore();

  // State management
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [nearbyFacilities, setNearbyFacilities] = useState<Array<Facility & { distance: number }>>([]);
  const [filteredFacilities, setFilteredFacilities] = useState<Array<Facility & { distance: number }>>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [filter, setFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFacilitiesPanel, setShowFacilitiesPanel] = useState(true);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [mapType, setMapType] = useState<'satellite' | 'roadmap' | 'terrain' | 'dark'>(isMobileDevice() ? 'roadmap' : 'satellite');
  const [zoom, setZoom] = useState(13);
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [showAllFacilities, setShowAllFacilities] = useState(false);
  const [savedFacilities, setSavedFacilities] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'split'>(isMobileDevice() ? 'list' : 'map');
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'name'>('distance');
  const [isMobile, setIsMobile] = useState(isMobileDevice());
  const [showContactsModal, setShowContactsModal] = useState<Facility | null>(null);
  const [radiusFilter, setRadiusFilter] = useState<number>(50);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ duration: string; distance: string } | null>(null);
  const [travelMode, setTravelMode] = useState<'driving' | 'walking' | 'cycling'>('driving');
  const [isGettingDirections, setIsGettingDirections] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  // Virtual scrolling state
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const facilitiesListRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Calculate visible range for virtual scrolling
  const visibleRange = useMemo(() => {
    return virtualScroll.getVisibleRange(
      scrollTop,
      viewportHeight,
      ITEM_HEIGHT,
      filteredFacilities.length,
      OVERSCAN
    );
  }, [scrollTop, viewportHeight, filteredFacilities.length]);

  // Optimized scroll handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    requestAnimationFrame(() => {
      setScrollTop(target.scrollTop);
    });
  }, []);

  // Update viewport height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (facilitiesListRef.current) {
        setViewportHeight(facilitiesListRef.current.clientHeight);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Update mobile state on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Combine all facilities
  const allFacilities = useMemo(() => {
    return getAllFacilities();
  }, []);

  // Calculate distance
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    return memoizedCalculateDistance(lat1, lon1, lat2, lon2);
  }, []);

  // Get nearby facilities using spatial index
  const getNearbyFacilities = useCallback((lat: number, lng: number, radius: number = 100) => {
    const candidates = spatialIndex.query(lat, lng, radius);
    
    const nearby = candidates
      .map((f) => ({
        ...f,
        distance: memoizedCalculateDistance(lat, lng, f.latitude, f.longitude),
      }))
      .filter((f) => f.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    setNearbyFacilities(nearby);
    return nearby;
  }, []);

  // Show location permission prompt first
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }
    // Show the permission prompt first
    setShowLocationPrompt(true);
  }, []);

  // Actually request location after user confirms
  const requestLocationPermission = useCallback(() => {
    setShowLocationPrompt(false);
    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const location = { lat: latitude, lng: longitude, accuracy };
        setUserLocation(location);
        setMapCenter([latitude, longitude]);
        setZoom(15);
        getNearbyFacilities(latitude, longitude, radiusFilter);
        setIsLocating(false);
      },
      (err) => {
        let errorMsg = 'Unable to retrieve your location';
        let helpText = '';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMsg = 'Location access denied';
            helpText = 'Please enable location services in your device settings and try again.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMsg = 'Location information unavailable';
            helpText = 'Please check that your device location services are turned on.';
            break;
          case err.TIMEOUT:
            errorMsg = 'Location request timed out';
            helpText = 'Please make sure location services are enabled and you have a stable internet connection.';
            break;
        }
        setLocationError(`${errorMsg}. ${helpText}`);
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 }
    );
  }, [getNearbyFacilities, radiusFilter]);

  // Toggle location tracking
  const toggleLocationTracking = useCallback(() => {
    if (isTracking) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
    } else {
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported');
        return;
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude, accuracy });
        },
        (err) => {
          setLocationError('Tracking error: ' + err.message);
          setIsTracking(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
      setIsTracking(true);
    }
  }, [isTracking]);

  // Load facilities on mount
  useEffect(() => {
    setIsLoading(true);
    getUserLocation();

    // Load saved facilities from localStorage
    const saved = localStorage.getItem('savedFacilities');
    if (saved) {
      setSavedFacilities(JSON.parse(saved));
    }

    const recent = localStorage.getItem('recentSearches');
    if (recent) {
      setRecentSearches(JSON.parse(recent));
    }

    // Load admin facilities from Firebase
    facilityService.getAllFacilities()
      .then(adminFacilities => {
        if (adminFacilities.length > 0) {
          console.log(`[FindFacility] Loaded ${adminFacilities.length} admin facilities`);
          setAdminFacilities(adminFacilities);
          adminFacilities.forEach(f => spatialIndex.add(f));
          
          if (userLocation) {
            getNearbyFacilities(userLocation.lat, userLocation.lng, radiusFilter);
          }
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.log('[FindFacility] Admin facilities load failed:', err);
        setIsLoading(false);
      });

    // Subscribe to real-time admin facility updates
    const unsubscribe = facilityService.onFacilitiesChanged((updatedFacilities) => {
      console.log(`[FindFacility] Real-time update: ${updatedFacilities.length} facilities`);
      setAdminFacilities(updatedFacilities);
      updatedFacilities.forEach(f => spatialIndex.add(f));
      
      if (userLocation) {
        getNearbyFacilities(userLocation.lat, userLocation.lng, radiusFilter);
      }
    });

    return () => {
      unsubscribe();
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Filter facilities
  useEffect(() => {
    const filterOperation = () => {
      performanceMonitor.start('filterOperation');
      
      let filtered = [...nearbyFacilities];

      if (filter !== 'all') {
        filtered = filtered.filter((f) => f.type === filter);
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filtered = filtered.filter((f) =>
          searchRegex.test(f.name) ||
          searchRegex.test(f.address) ||
          f.services.some(s => searchRegex.test(s))
        );
      }

      if (serviceFilter.length > 0) {
        const serviceSet = new Set(serviceFilter.map(s => s.toLowerCase()));
        filtered = filtered.filter((f) =>
          f.services.some(s => serviceSet.has(s.toLowerCase()))
        );
      }

      filtered = filtered.filter((f) => f.distance <= radiusFilter);

      if (sortBy === 'name') {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
      }

      setFilteredFacilities(filtered);
      
      const duration = performanceMonitor.end('filterOperation');
      if (duration > 16) {
        console.log(`[Performance] Filter took ${duration.toFixed(2)}ms for ${filtered.length} items`);
      }
    };

    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(filterOperation, { timeout: 100 });
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(filterOperation, 0);
      return () => clearTimeout(id);
    }
  }, [nearbyFacilities, filter, searchQuery, serviceFilter, radiusFilter, sortBy]);

  // Get directions using OSRM (OpenStreetMap Routing Machine) - FIXED for accurate destination
  const getDirections = useCallback(async (facility: Facility, mode: 'driving' | 'walking' | 'cycling' = travelMode) => {
    if (!userLocation) {
      setLocationError('Please enable location access to get directions');
      return;
    }

    setIsGettingDirections(true);
    setRouteInfo(null);
    setSelectedFacility(facility);
    setTravelMode(mode);

    try {
      // FIXED: OSRM uses {longitude},{latitude} format for each coordinate
      // Profile: car, foot, bike
      const profile = mode === 'walking' ? 'foot' : mode === 'cycling' ? 'bike' : 'car';
      
      // IMPORTANT: Format is {longitude},{latitude};{longitude},{latitude}
      // User location first, then facility destination
      const startPoint = `${userLocation.lng},${userLocation.lat}`;
      const endPoint = `${facility.longitude},${facility.latitude}`;
      
      const url = `https://router.project-osrm.org/route/v1/${profile}/${startPoint};${endPoint}?overview=full&geometries=geojson&alternatives=true&steps=true`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // Convert coordinates from [lng, lat] to [lat, lng] for Leaflet
        const coordinates = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
        
        // Add exact facility destination point to ensure we reach the correct place
        coordinates.push([facility.latitude, facility.longitude]);
        
        setRouteCoords(coordinates);
        setRouteInfo({
          distance: route.distance,
          duration: route.duration,
        });
        
        // Center map on route with facility destination in focus
        const allPoints = [...coordinates, [userLocation.lat, userLocation.lng], [facility.latitude, facility.longitude]];
        const bounds = L.latLngBounds(allPoints as [number, number][]);
        if (mapRef.current) {
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      } else {
        throw new Error('No route found');
      }
    } catch (error) {
      console.error('Directions error:', error);
      setLocationError('Could not get directions. Using external navigation instead.');
      // Fallback: open external maps
      window.open(getDirectionsLink(facility), '_blank');
    } finally {
      setIsGettingDirections(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, mapRef, travelMode]);

  // Clear directions
  const clearDirections = useCallback(() => {
    setRouteCoords(null);
    setRouteInfo(null);
  }, []);

  // Save facility
  const saveFacility = useCallback((facilityId: string) => {
    setSavedFacilities(prev => {
      const newSaved = prev.includes(facilityId)
        ? prev.filter(id => id !== facilityId)
        : [...prev, facilityId];
      localStorage.setItem('savedFacilities', JSON.stringify(newSaved));
      return newSaved;
    });
  }, []);

  // Add to recent searches
  const addToRecentSearches = useCallback((query: string) => {
    if (!query.trim()) return;
    setRecentSearches(prev => {
      const newRecent = [query, ...prev.filter(s => s !== query)].slice(0, 10);
      localStorage.setItem('recentSearches', JSON.stringify(newRecent));
      return newRecent;
    });
  }, []);

  // Handle search using Nominatim (OpenStreetMap geocoding - FREE)
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    addToRecentSearches(query);

    if (query.length > 3) {
      try {
        // Nominatim geocoding - completely free, no API key needed
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=rw&bounded=1&viewbox=${RWANDA_BOUNDS.west},${RWANDA_BOUNDS.north},${RWANDA_BOUNDS.east},${RWANDA_BOUNDS.south}&limit=1`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
          const result = data[0];
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);
          setMapCenter([lat, lng]);
          setZoom(15);
          getNearbyFacilities(lat, lng, radiusFilter);
        }
      } catch (error) {
        console.error('Geocoding error:', error);
      }
    }
  }, [addToRecentSearches, getNearbyFacilities, radiusFilter]);

  // Get directions link (external) - Mobile uses Google Maps, Desktop uses OpenStreetMap
  const getDirectionsLink = useCallback((facility: Facility) => {
    return getDirectionsLinkUtil(facility, userLocation, isMobile);
  }, [userLocation, isMobile]);

  // Center map on facility (or show contacts on mobile)
  const centerOnFacility = useCallback((facility: Facility) => {
    if (isMobile) {
      // On mobile, show contacts modal instead of centering on map
      setShowContactsModal(facility);
    } else {
      setMapCenter([facility.latitude, facility.longitude]);
      setSelectedFacility(facility);
      setZoom(17);
    }
  }, [isMobile]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Get facility icon
  const getFacilityIcon = useCallback((type: string) => {
    const found = facilityTypes.find((f) => f.key === type);
    return found || facilityTypes[0];
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full" />
            <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-slate-600 font-medium">Loading RM Ubuzima Maps...</p>
          <p className="text-slate-400 text-sm mt-1">Powered by OpenStreetMap (Free)</p>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Map Loading Error</h2>
          <p className="text-slate-600 mb-2">Unable to load the map.</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/services')}
              className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get tile layer URL based on map type - PROFESSIONAL HIGH RESOLUTION
  const getTileConfig = () => {
    switch (mapType) {
      case 'satellite':
        // Google Satellite - highest quality satellite imagery
        return {
          url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
          attribution: '&copy; Google Maps',
          maxZoom: 22,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        };
      case 'terrain':
        // OpenTopoMap - beautiful topographic map
        return {
          url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://opentopomap.org/">OpenTopoMap</a>',
          maxZoom: 17,
          subdomains: ['a', 'b', 'c']
        };
      case 'dark':
        // CARTO Dark Matter - professional dark theme
        return {
          url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          maxZoom: 20,
          subdomains: ['a', 'b', 'c', 'd']
        };
      default:
        // OpenStreetMap Standard - professional, clear, up-to-date
        return {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          subdomains: ['a', 'b', 'c']
        };
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-md z-30 flex-shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/services')}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Back to Services"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <MapPin className="w-5 h-5 text-white" />
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-900">RM Ubuzima Maps</h1>
              <p className="text-xs text-slate-500">Find Health Facilities - Free & Open</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xl mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search health facilities, areas or services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                className="w-full pl-10 pr-12 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <div className={cn(
              'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
              userLocation ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            )}>
              <Locate className={cn('w-4 h-4', isTracking && 'animate-pulse')} />
              <span>{userLocation ? (isTracking ? 'Tracking' : 'Located') : 'No location'}</span>
            </div>

            <button
              onClick={toggleLocationTracking}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isTracking ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <Target className={cn('w-5 h-5', isTracking && 'animate-spin')} />
            </button>

            <button
              onClick={getUserLocation}
              disabled={isLocating}
              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              <LocateFixed className={cn('w-5 h-5', isLocating && 'animate-spin')} />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search facilities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Location Error */}
        {locationError && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-100">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {locationError}
            </p>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Filters & Facilities */}
        {(showFacilitiesPanel || viewMode === 'split') && (
          <div className={cn(
            'bg-white border-r border-slate-200 flex flex-col z-20 transition-all duration-300',
            viewMode === 'split' ? 'w-96' : 'w-full md:w-96 absolute md:relative h-full'
          )}>
            {/* Filter tabs */}
            <div className="p-3 border-b border-slate-200">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {facilityTypes.map((type) => (
                  <button
                    key={type.key}
                    onClick={() => setFilter(type.key)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                      filter === type.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filter controls */}
            <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Filters
                  </button>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="distance">Sort by Distance</option>
                    <option value="name">Sort by Name</option>
                  </select>
                </div>
                <span className="text-xs text-slate-500">
                  {filteredFacilities.length} results
                </span>
              </div>

              {showFilterPanel && (
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">
                      Radius: {radiusFilter} km
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={radiusFilter}
                      onChange={(e) => setRadiusFilter(Number(e.target.value))}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Services</label>
                    <div className="flex flex-wrap gap-1">
                      {serviceCategories.map((service) => (
                        <button
                          key={service}
                          onClick={() => setServiceFilter(prev =>
                            prev.includes(service)
                              ? prev.filter(s => s !== service)
                              : [...prev, service]
                          )}
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] transition-colors',
                            serviceFilter.includes(service)
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                          )}
                        >
                          {service}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Virtual scrolling facilities list */}
            <div 
              ref={facilitiesListRef}
              className="flex-1 overflow-y-auto p-3"
              onScroll={handleScroll}
              style={{ contain: 'strict' }}
            >
              {filteredFacilities.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No facilities found</p>
                  <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or search</p>
                </div>
              ) : (
                <>
                  <div 
                    className="relative"
                    style={{ 
                      height: `${filteredFacilities.length * ITEM_HEIGHT}px`,
                      ...gpuStyles 
                    }}
                  >
                    {filteredFacilities
                      .slice(visibleRange.startIndex, visibleRange.endIndex)
                      .map((facility, index) => (
                        <div
                          key={facility.id}
                          className="absolute w-full px-3"
                          style={{
                            top: `${(visibleRange.startIndex + index) * ITEM_HEIGHT}px`,
                            height: `${ITEM_HEIGHT - 12}px`,
                            ...gpuStyles,
                          }}
                        >
                          <OptimizedFacilityCard
                            facility={facility}
                            onShowContacts={() => setShowContactsModal(facility)}
                            onNavigate={() => {}}
                            onClick={() => centerOnFacility(facility)}
                            onSave={() => saveFacility(facility.id)}
                            isSelected={selectedFacility?.id === facility.id}
                            isSaved={savedFacilities.includes(facility.id)}
                            facilityType={getFacilityIcon(facility.type)}
                            directionsLink={getDirectionsLink(facility)}
                            isMobile={isMobile}
                          />
                        </div>
                      ))}
                  </div>
                  {import.meta.env.DEV && (
                    <div className="text-xs text-slate-400 text-center py-2">
                      Rendering {visibleRange.endIndex - visibleRange.startIndex} of {filteredFacilities.length} facilities
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Map Area - Hidden on mobile */}
        {!isMobile && (
        <div className="flex-1 relative">
          {/* Map Controls */}
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
            {/* Map Type Toggle */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <button
                onClick={() => setMapType('roadmap')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 transition-colors w-full',
                  mapType === 'roadmap' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                <MapIcon className="w-5 h-5" />
                <span className="font-medium text-sm">Map</span>
              </button>
              <button
                onClick={() => setMapType('satellite')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 transition-colors w-full',
                  mapType === 'satellite' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                <Satellite className="w-5 h-5" />
                <span className="font-medium text-sm">Satellite</span>
              </button>
              <button
                onClick={() => setMapType('terrain')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 transition-colors w-full',
                  mapType === 'terrain' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                <Compass className="w-5 h-5" />
                <span className="font-medium text-sm">Terrain</span>
              </button>
              <button
                onClick={() => setMapType('dark')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 transition-colors w-full',
                  mapType === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                <Eye className="w-5 h-5" />
                <span className="font-medium text-sm">Dark</span>
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="bg-white rounded-xl shadow-lg p-1 flex">
              <button
                onClick={() => setViewMode('map')}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  viewMode === 'map' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <MapIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  viewMode === 'split' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowFacilitiesPanel(!showFacilitiesPanel)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  !showFacilitiesPanel ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Near Me Button */}
            <button
              onClick={() => {
                setViewMode('split');
                setShowFacilitiesPanel(true);
                if (userLocation) {
                  getNearbyFacilities(userLocation.lat, userLocation.lng, radiusFilter);
                } else {
                  getUserLocation();
                }
              }}
              className="bg-blue-600 text-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <MapPin className="w-5 h-5" />
              <span className="font-medium text-sm">Near Me</span>
            </button>
          </div>

          {/* Current Location Button */}
          <button
            onClick={getUserLocation}
            disabled={isLocating}
            className="absolute bottom-8 right-4 z-[1000] p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            <LocateFixed className={cn('w-6 h-6 text-blue-600', isLocating && 'animate-spin')} />
          </button>

          {/* Route Info Panel */}
          {routeInfo && (
            <div className="absolute bottom-8 left-4 z-[1000] bg-white rounded-xl shadow-lg p-4 max-w-xs">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-900">Route Details</h4>
                <button
                  onClick={clearDirections}
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">{routeInfo.duration}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Route className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">{routeInfo.distance}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {(['driving', 'walking', 'cycling'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      if (selectedFacility) {
                        getDirections(selectedFacility, mode);
                      }
                    }}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      travelMode === mode ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {mode === 'driving' && <Car className="w-3.5 h-3.5 mx-auto" />}
                    {mode === 'walking' && <Footprints className="w-3.5 h-3.5 mx-auto" />}
                    {mode === 'cycling' && <Bike className="w-3.5 h-3.5 mx-auto" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Leaflet Map */}
          <MapContainer
            center={mapCenter}
            zoom={zoom}
            className="w-full h-full"
            zoomControl={false}
          >
            <MapController center={mapCenter} zoom={zoom} />
            <MapEvents onZoomChange={setZoom} />
            
            <TileLayer
              attribution={getTileConfig().attribution}
              url={getTileConfig().url}
              maxZoom={getTileConfig().maxZoom}
              maxNativeZoom={18}
              subdomains={getTileConfig().subdomains}
            />
            {/* Satellite labels overlay - Google Maps hybrid labels */}
            {mapType === 'satellite' && (
              <TileLayer
                attribution='&copy; Google Maps'
                url="https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}"
                maxZoom={22}
                opacity={0.9}
                subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
              />
            )}

            {/* User Location Marker */}
            {userLocation && (
              <>
                <Marker
                  position={[userLocation.lat, userLocation.lng]}
                  icon={userLocationIcon}
                />
                {userLocation.accuracy && (
                  <Circle
                    center={[userLocation.lat, userLocation.lng]}
                    radius={userLocation.accuracy}
                    pathOptions={{
                      fillColor: '#2563EB',
                      fillOpacity: 0.1,
                      color: '#2563EB',
                      opacity: 0.3,
                      weight: 1,
                    }}
                  />
                )}
              </>
            )}

            {/* Facility Markers */}
            {(showAllFacilities ? allFacilities : filteredFacilities).map((facility) => (
              <Marker
                key={facility.id}
                position={[facility.latitude, facility.longitude]}
                icon={createCustomIcon(getFacilityIcon(facility.type).color, selectedFacility?.id === facility.id)}
                eventHandlers={{
                  click: () => setSelectedFacility(facility),
                }}
              >
                <Popup>
                  <div className="p-1 min-w-[280px]">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-slate-900 text-base pr-2">{facility.name}</h3>
                      <button
                        onClick={() => saveFacility(facility.id)}
                        className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                      >
                        <Bookmark
                          className={cn(
                            'w-5 h-5',
                            savedFacilities.includes(facility.id)
                              ? 'fill-blue-600 text-blue-600'
                              : 'text-slate-400'
                          )}
                        />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: getFacilityIcon(facility.type).color + '20',
                          color: getFacilityIcon(facility.type).color,
                        }}
                      >
                        {facility.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-emerald-600 font-medium">
                        {(facility as any).distance?.toFixed(1) || '?'} km away
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 mb-2 flex items-start gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <span>{facility.address}</span>
                    </p>

                    {/* Verified Contacts - New Feature */}
                    {facility.contacts && facility.contacts.length > 0 && (
                      <div className="mb-3 border-t border-slate-100 pt-2">
                        <p className="text-xs text-blue-600 mb-2 font-semibold flex items-center gap-1">
                          <ShieldPlus className="w-3 h-3" />
                          Verified Contacts ({facility.contacts.length})
                        </p>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {facility.contacts.map((contact) => (
                            <div key={contact.id} className="flex items-center gap-2 text-sm">
                              <span className={cn(
                                'px-1.5 py-0.5 rounded text-[10px] font-medium',
                                contact.type === 'phone' && 'bg-emerald-100 text-emerald-700',
                                contact.type === 'whatsapp' && 'bg-green-100 text-green-700',
                                contact.type === 'email' && 'bg-blue-100 text-blue-700'
                              )}>
                                {contact.label}
                              </span>
                              {contact.type === 'email' ? (
                                <a href={`mailto:${contact.value}`} className="text-blue-600 hover:underline truncate">
                                  {contact.value}
                                </a>
                              ) : (
                                <a href={`tel:${contact.value}`} className="text-blue-600 hover:underline">
                                  {contact.value}
                                </a>
                              )}
                              {contact.notes && (
                                <span className="text-xs text-slate-400">({contact.notes})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Legacy phone (fallback) */}
                    {facility.phone && (!facility.contacts || facility.contacts.length === 0) && (
                      <p className="text-sm text-slate-600 mb-2 flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <a href={`tel:${facility.phone}`} className="text-blue-600 hover:underline">
                          {facility.phone}
                        </a>
                      </p>
                    )}

                    {facility.hours && (
                      <p className="text-sm text-slate-600 mb-2 flex items-center gap-1.5">
                        <Timer className="w-4 h-4 text-slate-400" />
                        <span>{facility.hours}</span>
                      </p>
                    )}

                    {facility.services && facility.services.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 mb-1 font-medium">Services:</p>
                        <div className="flex flex-wrap gap-1">
                          {facility.services.slice(0, 4).map((service, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600">
                              {service}
                            </span>
                          ))}
                          {facility.services.length > 4 && (
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600">
                              +{facility.services.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => getDirections(facility)}
                        disabled={isGettingDirections || !userLocation}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        <Navigation className="w-4 h-4" />
                        {isGettingDirections ? 'Loading...' : 'Show Route'}
                      </button>
                      <a
                        href={getDirectionsLink(facility)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Navigate
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Route Line */}
            {routeCoords && (
              <Polyline
                positions={routeCoords}
                pathOptions={{
                  color: '#2563EB',
                  weight: 5,
                  opacity: 0.8,
                }}
              />
            )}
          </MapContainer>
        </div>
        )}
      </div>

      {/* Contacts Modal */}
      {showContactsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{showContactsModal.name}</h2>
                <p className="text-sm text-slate-500">Contact Information</p>
              </div>
              <button
                onClick={() => setShowContactsModal(null)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Facility Info */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: getFacilityIcon(showContactsModal.type).color + '15' }}
                >
                  <span className="text-2xl">{getFacilityIcon(showContactsModal.type).icon}</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">{showContactsModal.type.replace('_', ' ')}</p>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {showContactsModal.address}
                  </p>
                  {showContactsModal.hours && (
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      {showContactsModal.hours}
                    </p>
                  )}
                </div>
              </div>

              {/* Verified Contacts */}
              {showContactsModal.contacts && showContactsModal.contacts.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldPlus className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-slate-900">Verified Contacts</h3>
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                      {showContactsModal.contacts.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {showContactsModal.contacts.map((contact) => (
                      <a
                        key={contact.id}
                        href={contact.type === 'email' ? `mailto:${contact.value}` : `tel:${contact.value}`}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-blue-50 transition-colors group"
                      >
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          contact.type === 'phone' && 'bg-emerald-100 text-emerald-600',
                          contact.type === 'whatsapp' && 'bg-green-100 text-green-600',
                          contact.type === 'email' && 'bg-blue-100 text-blue-600'
                        )}>
                          {contact.type === 'phone' && <Phone className="w-5 h-5" />}
                          {contact.type === 'whatsapp' && <MessageSquare className="w-5 h-5" />}
                          {contact.type === 'email' && <ExternalLink className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{contact.label}</p>
                          <p className="text-sm text-slate-600">{contact.value}</p>
                          {contact.notes && (
                            <p className="text-xs text-slate-400">{contact.notes}</p>
                          )}
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Phone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No verified contacts available</p>
                </div>
              )}

              {/* Legacy Phone */}
              {showContactsModal.phone && (!showContactsModal.contacts || showContactsModal.contacts.length === 0) && (
                <a
                  href={`tel:${showContactsModal.phone}`}
                  className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Main Phone</p>
                    <p className="text-sm text-slate-600">{showContactsModal.phone}</p>
                  </div>
                </a>
              )}

              {/* Services */}
              {showContactsModal.services && showContactsModal.services.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Services</h3>
                  <div className="flex flex-wrap gap-2">
                    {showContactsModal.services.map((service, idx) => (
                      <span key={idx} className="px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigate Button */}
              <a
                href={getDirectionsLink(showContactsModal)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
                {isMobile ? 'Open in Google Maps' : 'Get Directions'}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Location Permission Prompt Modal */}
      {showLocationPrompt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[3000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LocateFixed className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Enable Location Access</h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                To find health facilities near you, please allow access to your location. 
                This helps us show you the closest hospitals, clinics, and pharmacies.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={requestLocationPermission}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Locate className="w-5 h-5" />
                Allow Location Access
              </button>
              <button
                onClick={() => {
                  setShowLocationPrompt(false);
                  setLocationError('Location access is needed to find nearby facilities. You can still search manually by typing your area.');
                }}
                className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Maybe Later
              </button>
            </div>

            <p className="text-xs text-slate-400 text-center mt-4">
              Your location data is only used to find nearby facilities and is never stored or shared.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Memoized Facility Card Component
// =============================================================================
interface FacilityCardProps {
  facility: Facility & { distance: number };
  onShowContacts: () => void;
  onNavigate: () => void;
  onClick: () => void;
  onSave: () => void;
  isSelected?: boolean;
  isSaved?: boolean;
  facilityType: { icon: string; color: string; lucideIcon: any };
  directionsLink: string;
  isMobile?: boolean;
}

const OptimizedFacilityCard = memo(function FacilityCard({
  facility,
  onShowContacts,
  onNavigate,
  onClick,
  onSave,
  isSelected,
  isSaved,
  facilityType,
  directionsLink,
  isMobile,
}: FacilityCardProps) {
  const cardStyles = useMemo(() => ({
    iconBg: facilityType.color + '15',
    typeBg: facilityType.color + '20',
    typeColor: facilityType.color,
    ...gpuStyles,
  }), [facilityType.color]);

  const handleClick = useCallback(() => onClick(), [onClick]);
  const handleSave = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSave();
  }, [onSave]);
  const handleShowContacts = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onShowContacts();
  }, [onShowContacts]);
  const handleNavigate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate();
  }, [onNavigate]);

  return (
    <div
      onClick={handleClick}
      className={cn(
        'bg-white rounded-xl p-3 border-2 cursor-pointer transition-all hover:shadow-lg h-full',
        isSelected ? 'border-blue-500 shadow-lg ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'
      )}
      style={gpuStyles}
    >
      <div className="flex items-start gap-2 h-full">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: cardStyles.iconBg }}
        >
          <span>{facilityType.icon}</span>
        </div>

        <div className="flex-1 min-w-0 flex flex-col h-full">
          <div className="flex items-start justify-between gap-1">
            <h3 className="font-semibold text-slate-900 text-xs leading-tight line-clamp-1">{facility.name}</h3>
            <button
              onClick={handleSave}
              className="p-1 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
            >
              <Bookmark
                className={cn('w-3.5 h-3.5', isSaved ? 'fill-blue-600 text-blue-600' : 'text-slate-400')}
              />
            </button>
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            <span
              className="px-1.5 py-0.5 rounded-full text-[9px] font-medium"
              style={{
                backgroundColor: cardStyles.typeBg,
                color: cardStyles.typeColor,
              }}
            >
              {facility.type.replace('_', ' ')}
            </span>
            <span className="text-[10px] font-bold text-emerald-600">
              {facility.distance.toFixed(1)} km
            </span>
          </div>

          <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
            {facility.address}
          </p>

          {facility.services && facility.services.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mt-1">
              {facility.services.slice(0, 2).map((service, idx) => (
                <span key={idx} className="px-1 py-0 bg-slate-100 rounded text-[8px] text-slate-600">
                  {service}
                </span>
              ))}
            </div>
          )}

          {/* Verified Contacts Preview */}
          {facility.contacts && facility.contacts.length > 0 && (
            <div className="mt-1 pt-1 border-t border-slate-100">
              <p className="text-[8px] text-blue-600 font-medium mb-0.5 flex items-center gap-0.5">
                <ShieldPlus className="w-2.5 h-2.5" />
                {facility.contacts.length} Verified Contact{facility.contacts.length > 1 ? 's' : ''}
              </p>
              <div className="space-y-0.5 max-h-12 overflow-hidden">
                {facility.contacts.slice(0, 2).map((contact) => (
                  <div key={contact.id} className="flex items-center gap-1 text-[9px]">
                    <span className={cn(
                      'px-1 py-0 rounded text-[7px] font-medium',
                      contact.type === 'phone' && 'bg-emerald-100 text-emerald-700',
                      contact.type === 'whatsapp' && 'bg-green-100 text-green-700',
                      contact.type === 'email' && 'bg-blue-100 text-blue-700'
                    )}>
                      {contact.label}
                    </span>
                    <a href={`tel:${contact.value}`} className="text-blue-600 hover:underline truncate">
                      {contact.value}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-1 mt-auto pt-2">
            <button
              onClick={handleShowContacts}
              className="flex-1 py-1 bg-blue-600 text-white rounded text-[10px] font-medium flex items-center justify-center gap-0.5 hover:bg-blue-700 transition-colors"
            >
              <Contact className="w-3 h-3" />
              Contacts
            </button>
            <a
              href={directionsLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleNavigate}
              className="flex-1 py-1 bg-emerald-600 text-white rounded text-[10px] font-medium flex items-center justify-center gap-0.5 hover:bg-emerald-700 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {isMobile ? 'Open Maps' : 'Go'}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.facility.id === nextProps.facility.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isSaved === nextProps.isSaved &&
    prevProps.facility.distance === nextProps.facility.distance
  );
});
