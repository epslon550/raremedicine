import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom SVG Icons for markers to prevent missing asset errors and provide premium visuals
const createUserIcon = () => L.divIcon({
  className: 'custom-user-marker',
  html: `<div class="relative flex items-center justify-center">
    <div class="absolute w-6 h-6 bg-red-500 rounded-full animate-ping opacity-60"></div>
    <div class="relative w-4 h-4 bg-red-600 border-2 border-white rounded-full shadow-lg"></div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const createPharmacyIcon = () => L.divIcon({
  className: 'custom-pharmacy-marker',
  html: `<div class="relative flex items-center justify-center">
    <div class="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center border-2 border-white shadow-xl hover:scale-110 transition-transform">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    </div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const MapView = ({ pharmacies = [], userLocation, onSelectPharmacy, focusLocation }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if not already initialized
    if (!mapRef.current) {
      const defaultLat = userLocation?.lat || 17.3850;
      const defaultLng = userLocation?.lng || 78.4867;

      mapRef.current = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], 13);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);

      // Layer for dynamic markers
      markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    return () => {
      // Cleanup map on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Effect to handle panning/zooming and opening popup of focused location
  useEffect(() => {
    if (focusLocation && mapRef.current) {
      mapRef.current.setView([focusLocation.lat, focusLocation.lng], 15);
      const marker = markersRef.current[focusLocation.id];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [focusLocation]);

  // Update map view and markers when pharmacies or userLocation changes
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    // Clear previous markers
    markersLayerRef.current.clearLayers();
    markersRef.current = {};

    // Create user marker
    const lat = userLocation?.lat || 17.3850;
    const lng = userLocation?.lng || 78.4867;
    
    L.marker([lat, lng], { icon: createUserIcon() })
      .addTo(markersLayerRef.current)
      .bindPopup('<b class="text-slate-800 font-bold">Your Location</b>')
      .openPopup();

    // Add pharmacy markers
    pharmacies.forEach((item) => {
      const phar = item.pharmacy;
      if (!phar || !phar.latitude || !phar.longitude) return;

      const marker = L.marker([phar.latitude, phar.longitude], { icon: createPharmacyIcon() })
        .addTo(markersLayerRef.current);

      markersRef.current[phar._id] = marker;

      marker.bindPopup(`
        <div class="p-1 text-slate-800">
          <h4 class="font-bold text-sm text-red-600 m-0">${phar.pharmacyName}</h4>
          <p class="text-xs text-slate-600 my-1">${phar.address}</p>
          <p class="text-xs text-slate-700"><b>Distance:</b> ${item.distance !== null ? `${item.distance} km` : 'Calculating...'}</p>
          <p class="text-xs text-slate-700"><b>Stock:</b> ${item.quantity} available</p>
          <button class="mt-2 w-full bg-red-600 text-white rounded text-xs py-1 font-semibold hover:bg-red-700 cursor-pointer text-center select-btn">View Details</button>
        </div>
      `);

      marker.on('popupopen', () => {
        // Find button in popup and attach click handler
        const btn = document.querySelector('.select-btn');
        if (btn) {
          btn.onclick = () => {
            onSelectPharmacy(item);
          };
        }
      });
    });

    // Fit map bounds to show user and nearest pharmacies
    if (pharmacies.length > 0) {
      const coords = [[lat, lng], ...pharmacies.map(item => [item.pharmacy.latitude, item.pharmacy.longitude])];
      mapRef.current.fitBounds(coords, { padding: [50, 50] });
    } else {
      mapRef.current.setView([lat, lng], 13);
    }
  }, [pharmacies, userLocation]);

  return (
    <div className="relative w-full h-full min-h-[350px] md:min-h-[500px] border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />
    </div>
  );
};

export default MapView;
