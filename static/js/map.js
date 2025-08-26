document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const addLocationBtn = document.getElementById('addLocationBtn');
    const addLocationModal = document.getElementById('addLocationModal');
    const cancelLocationBtn = document.getElementById('cancelLocation');
    const saveLocationBtn = document.getElementById('saveLocation');
    const locationForm = document.getElementById('locationForm');
    const locationList = document.querySelector('.location-list');
    const mapCanvas = document.getElementById('mapCanvas');
    const searchInput = document.querySelector('.search-container input');
    const filterSelects = document.querySelectorAll('.map-filters select');
    const mapLayerBtns = document.querySelectorAll('.map-layers button');
    const clientTypeFilter = document.getElementById('clientTypeFilter');
    const statusFilter = document.getElementById('statusFilter');
    const clientList = document.getElementById('clientList');
    const toggleHeatMapBtn = document.querySelector('[title="Toggle Heat Map"]');
    const centerMapBtn = document.querySelector('[title="Center Map"]');
    const fitBoundsBtn = document.getElementById('fitBounds');

    // Map initialization
    const LAGUNA_CENTER = [14.2691, 121.4113]; // Coordinates for Laguna
    let map = null;
    let heatLayer = null;
    let markers = [];
    let clients = [];
    let baseLayer = null;
    let isHeatMapVisible = true;
    let isLoading = false;

    // Make refresh function global for HTML access
    window.refreshClientData = function() {
        loadClientData();
    };

    // Initialize map
    function initializeMap() {
        // Create the map centered on Laguna
        map = L.map('mapCanvas').setView(LAGUNA_CENTER, 11);

        // Add the default tile layer (OpenStreetMap)
        baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(map);

        // Initialize empty heat layer
        heatLayer = L.heatLayer([], {
            radius: 25,
            blur: 15,
            maxZoom: 10,
            gradient: {0.4: 'blue', 0.65: 'lime', 1: 'red'}
        }).addTo(map);

        // Add zoom control to top-right
        map.zoomControl.setPosition('topright');

        // Add scale control
        L.control.scale().addTo(map);

        // Load real client data instead of sample data
        loadClientData();
    }

    // Show loading state
    function showLoading() {
        isLoading = true;
        document.getElementById('loadingOverlay').style.display = 'flex';
        
        // Show loading in client list if no data yet
        if (clients.length === 0) {
            const locationItems = document.querySelector('.location-items');
            if (locationItems) {
                locationItems.innerHTML = `
                    <div class="loading-message" style="text-align: center; padding: 20px; color: #666;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i>
                        <p>Loading client locations...</p>
                    </div>
                `;
            }
        }
    }

    // Hide loading state
    function hideLoading() {
        isLoading = false;
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    // Update client count display
    function updateClientCount() {
        const filteredClients = filterClients();
        const totalClients = clients.length;
        const activeClients = filteredClients.length;
        
        if (window.updateClientCount) {
            if (activeClients === totalClients) {
                window.updateClientCount(totalClients);
            } else {
                window.updateClientCount(`${activeClients} of ${totalClients}`);
            }
        }
    }

    // Load real client data from API
    async function loadClientData() {
        try {
            showLoading();
            console.log('Loading client location data...');
            const response = await fetch('/api/clients/locations');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const clientData = await response.json();
            console.log('Raw client data:', clientData); // Log raw data
            
            // Process and validate client data
            const invalidClients = []; // Track invalid clients
            clients = clientData.filter(client => {
                // Only include clients with valid coordinates
                const isValid = client.coordinates && 
                       typeof client.coordinates.lat === 'number' && 
                       typeof client.coordinates.lng === 'number' &&
                       !isNaN(client.coordinates.lat) && 
                       !isNaN(client.coordinates.lng);
                
                if (!isValid) {
                    invalidClients.push({
                        name: client.name,
                        address: client.address,
                        coordinates: client.coordinates
                    });
                }
                return isValid;
            });
            
            console.log('Invalid clients:', invalidClients); // Log invalid clients
            console.log(`Loaded ${clients.length} clients with valid coordinates`);
            
            hideLoading();
            
            if (clients.length === 0) {
                console.warn('No clients with valid coordinates found');
                showNoDataMessage();
            } else {
                updateMap();
                updateClientList();
                updateClientCount();
            }

            // Start background geocoding for any missing coordinates
            startBackgroundGeocoding();
            
        } catch (error) {
            console.error('Error loading client data:', error);
            hideLoading();
            showErrorMessage('Failed to load client location data');
        }
    }

    // Start background geocoding process
    async function startBackgroundGeocoding() {
        try {
            const response = await fetch('/api/clients/geocode-missing', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Geocoding result:', result); // Log geocoding result
            
            if (result.success && result.count > 0) {
                console.log(`Started geocoding ${result.count} clients in background`);
                showNotification(`Geocoding ${result.count} client locations in background...`, 'info');
                
                // Set up periodic refresh to get newly geocoded locations
                const checkInterval = setInterval(async () => {
                    if (!isLoading) {
                        const newData = await fetch('/api/clients/locations').then(r => r.json());
                        console.log('New data from refresh:', newData); // Log refreshed data
                        if (newData.length > clients.length) {
                            clients = newData;
                            updateMap();
                            updateClientList();
                            updateClientCount();
                            showNotification('New client locations added to map', 'success');
                        }
                    }
                }, 10000); // Check every 10 seconds
                
                // Stop checking after 5 minutes
                setTimeout(() => {
                    clearInterval(checkInterval);
                }, 300000);
            }
        } catch (error) {
            console.error('Error starting background geocoding:', error);
        }
    }

    // Show notification message
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // Show message when no data is available
    function showNoDataMessage() {
        clientList.innerHTML = `
            <div class="no-data-message" style="text-align: center; padding: 20px; color: #666;">
                <i class="fas fa-map-marker-alt" style="font-size: 48px; margin-bottom: 10px; opacity: 0.3;"></i>
                <h4>No Client Locations</h4>
                <p>No clients with valid coordinates found. Add coordinate data to clients to see them on the map.</p>
            </div>
        `;
        updateClientCount();
    }

    // Show error message
    function showErrorMessage(message) {
        clientList.innerHTML = `
            <div class="error-message" style="text-align: center; padding: 20px; color: #e74c3c;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 10px;"></i>
                <h4>Error Loading Data</h4>
                <p>${message}</p>
                <button onclick="window.refreshClientData()" class="btn-primary" style="margin-top: 10px;">
                    <i class="fas fa-refresh"></i> Retry
                </button>
            </div>
        `;
    }

    // Update map with filtered clients
    function updateMap() {
        const filteredClients = filterClients();
        
        // Clear existing markers
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];

        // Update heat map data
        const heatData = filteredClients.map(client => [
            client.coordinates.lat,
            client.coordinates.lng,
            1 // intensity - could be weighted by factors like client priority, etc.
        ]);
        
        console.log('Updating heat map with', heatData.length, 'data points');
        heatLayer.setLatLngs(heatData);

        // Add markers for each client
        filteredClients.forEach(client => {
            const markerIcon = getClientMarkerIcon(client);
            const marker = L.marker([client.coordinates.lat, client.coordinates.lng], {
                icon: markerIcon
            })
                .bindPopup(createPopupContent(client))
                .addTo(map);
            markers.push(marker);
        });

        // Update client count
        updateClientCount();
    }

    // Fit map bounds to show all markers
    function fitMapBounds() {
        if (markers.length > 0) {
            const group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
            console.log('Map fitted to show all clients');
        } else {
            map.setView(LAGUNA_CENTER, 11);
            console.log('No markers to fit, centered on Laguna');
        }
    }

    // Get custom marker icon based on client type and status
    function getClientMarkerIcon(client) {
        let iconColor = '#3498db'; // Default blue
        
        // Color by care type
        if (client.care_type === 'after_care') {
            iconColor = '#e67e22'; // Orange for after care
        } else {
            iconColor = '#2ecc71'; // Green for in-house
        }
        
        // Adjust opacity based on status
        const opacity = client.status === 'active' ? 1.0 : 0.7;
        
        return L.divIcon({
            html: `<div style="background-color: ${iconColor}; opacity: ${opacity};" class="custom-marker">
                     <i class="fas fa-user"></i>
                   </div>`,
            iconSize: [20, 20],
            className: 'custom-div-icon'
        });
    }

    // Create popup content for markers
    function createPopupContent(client) {
        const careTypeLabel = client.care_type === 'in_house' ? 'In-House' : 'After Care';
        const statusClass = client.status.toLowerCase();
        
        // Determine coordinate source badge
        let sourceBadge = '';
        const source = client.coordinate_source || 'unknown';
        switch(source) {
            case 'google':
                sourceBadge = '<span class="coord-source google" title="Geocoded with Google Maps"><i class="fas fa-map-marker-alt"></i> Google</span>';
                break;
            case 'nominatim':
                sourceBadge = '<span class="coord-source nominatim" title="Geocoded with OpenStreetMap"><i class="fas fa-map"></i> OSM</span>';
                break;
            case 'cached':
                sourceBadge = '<span class="coord-source cached" title="Previously geocoded"><i class="fas fa-check-circle"></i> Cached</span>';
                break;
            case 'fallback':
                sourceBadge = '<span class="coord-source fallback" title="Approximate location"><i class="fas fa-exclamation-triangle"></i> Approx</span>';
                break;
            default:
                sourceBadge = '<span class="coord-source unknown" title="Unknown source"><i class="fas fa-question-circle"></i> Unknown</span>';
        }
        
        // Use formatted address if available, otherwise use original address
        const displayAddress = client.formatted_address || client.address;
        
        return `
            <div class="popup-content">
                <h4>${client.name}</h4>
                <p><i class="fas fa-map-marker-alt"></i> ${displayAddress}</p>
                <div class="popup-meta">
                    <span class="popup-care-type care-type-${client.care_type}">
                        <i class="fas fa-home"></i> ${careTypeLabel}
                    </span>
                    <span class="popup-status status-${statusClass}">
                        <i class="fas fa-circle"></i> ${client.status}
                    </span>
                </div>
                <div class="popup-coords">
                    <small class="coordinates">${client.coordinates.lat.toFixed(6)}, ${client.coordinates.lng.toFixed(6)}</small>
                    ${sourceBadge}
                </div>
            </div>
        `;
    }

    // Update client list in sidebar
    function updateClientList() {
        const filteredClients = filterClients();
        const locationItems = document.querySelector('.location-items');
        locationItems.innerHTML = '';

        if (filteredClients.length === 0) {
            locationItems.innerHTML = `
                <div class="no-results" style="text-align: center; padding: 20px; color: #666;">
                    <i class="fas fa-search" style="font-size: 32px; margin-bottom: 10px; opacity: 0.3;"></i>
                    <p>No clients match the current filters</p>
                </div>
            `;
            return;
        }

        // Update summary count
        const summaryTitle = document.querySelector('.location-summary h4');
        if (summaryTitle) {
            summaryTitle.textContent = `Client Locations (${filteredClients.length})`;
        }

        // Calculate geocoding statistics
        const stats = calculateGeocodingStats(filteredClients);
        
        // Update geocoding stats
        const statsContainer = document.querySelector('.geocoding-stats small');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <span class="stat-item google">${stats.google} Google</span>
                <span class="stat-item nominatim">${stats.nominatim} OSM</span>
                <span class="stat-item cached">${stats.cached} Cached</span>
                <span class="stat-item fallback">${stats.fallback} Approx</span>
            `;
        }

        // Add client items
        filteredClients.forEach(client => {
            const item = document.createElement('div');
            item.className = 'location-item';
            
            // Add coordinate source indicator
            const sourceClass = client.coordinate_source || 'unknown';
            let sourceIcon = 'fas fa-map-marker-alt';
            switch(sourceClass) {
                case 'google': sourceIcon = 'fab fa-google'; break;
                case 'nominatim': sourceIcon = 'fas fa-map'; break;
                case 'cached': sourceIcon = 'fas fa-check-circle'; break;
                case 'fallback': sourceIcon = 'fas fa-exclamation-triangle'; break;
            }
            
            item.innerHTML = `
                <div class="location-icon ${client.care_type === 'in_house' ? 'in-house' : 'after-care'}">
                    <i class="fas fa-user"></i>
                </div>
                <div class="location-details">
                    <h4>${client.name}</h4>
                    <p>${client.formatted_address || client.address}</p>
                    <div class="location-meta">
                        <span class="location-type">${client.care_type === 'in_house' ? 'In-House' : 'After Care'}</span>
                        <span class="client-status ${client.status.toLowerCase()}">${client.status}</span>
                        <span class="coord-source-small ${sourceClass}" title="Coordinate source: ${sourceClass}">
                            <i class="${sourceIcon}"></i>
                        </span>
                    </div>
                </div>
            `;

            item.addEventListener('click', () => {
                map.setView([client.coordinates.lat, client.coordinates.lng], 15);
                const marker = markers.find(m => 
                    Math.abs(m.getLatLng().lat - client.coordinates.lat) < 0.0001 && 
                    Math.abs(m.getLatLng().lng - client.coordinates.lng) < 0.0001
                );
                if (marker) marker.openPopup();
            });

            locationItems.appendChild(item);
        });
    }

    // Calculate geocoding statistics for display
    function calculateGeocodingStats(clients) {
        const stats = {
            google: 0,
            nominatim: 0,
            cached: 0,
            fallback: 0,
            unknown: 0
        };

        clients.forEach(client => {
            const source = client.coordinate_source || 'unknown';
            if (stats.hasOwnProperty(source)) {
                stats[source]++;
            } else {
                stats.unknown++;
            }
        });

        return stats;
    }

    // Filter clients based on selected filters
    function filterClients() {
        const typeFilter = clientTypeFilter.value;
        const statusFilterValue = statusFilter.value;
        const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';

        return clients.filter(client => {
            const matchesType = typeFilter === 'all' || client.care_type === typeFilter;
            const matchesStatus = statusFilterValue === 'all' || client.status.toLowerCase() === statusFilterValue;
            const matchesSearch = !searchQuery || 
                                client.name.toLowerCase().includes(searchQuery) ||
                                client.address.toLowerCase().includes(searchQuery);

            return matchesType && matchesStatus && matchesSearch;
        });
    }

    // Modal Handling
    function openAddLocationModal() {
        if (addLocationModal) {
            addLocationModal.classList.add('active');
        }
    }

    function closeAddLocationModal() {
        if (addLocationModal) {
            addLocationModal.classList.remove('active');
            if (locationForm) locationForm.reset();
        }
    }

    // Utility function to calculate distance between two coordinates (future use)
    function calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Radius of the Earth in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in kilometers
    }

    // Map Controls
    function handleMapControls(action) {
        switch(action) {
            case 'center':
                map.setView(LAGUNA_CENTER, 11);
                console.log('Map centered on Laguna');
                break;
            case 'fullscreen':
                toggleFullscreen();
                break;
            case 'refresh':
                refreshClientData();
                break;
        }
    }

    function toggleFullscreen() {
        const mapView = document.querySelector('.map-view');
        if (!document.fullscreenElement) {
            mapView.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }

    // Event Listeners
    if (addLocationBtn) {
        addLocationBtn.addEventListener('click', openAddLocationModal);
    }
    
    if (cancelLocationBtn) {
        cancelLocationBtn.addEventListener('click', closeAddLocationModal);
    }
    
    if (saveLocationBtn) {
        saveLocationBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (locationForm && locationForm.checkValidity()) {
                const formData = new FormData(locationForm);
                // saveLocation(formData); // Commented out for now
            } else if (locationForm) {
                locationForm.reportValidity();
            }
        });
    }

    if (addLocationModal) {
        addLocationModal.addEventListener('click', (e) => {
            if (e.target === addLocationModal) {
                closeAddLocationModal();
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            updateMap();
            updateClientList();
        });
    }

    if (clientTypeFilter) {
        clientTypeFilter.addEventListener('change', () => {
            updateMap();
            updateClientList();
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            updateMap();
            updateClientList();
        });
    }

    if (toggleHeatMapBtn) {
        toggleHeatMapBtn.addEventListener('click', () => {
            if (map.hasLayer(heatLayer)) {
                map.removeLayer(heatLayer);
                toggleHeatMapBtn.classList.remove('active');
                isHeatMapVisible = false;
                console.log('Heat map hidden');
            } else {
                map.addLayer(heatLayer);
                toggleHeatMapBtn.classList.add('active');
                isHeatMapVisible = true;
                console.log('Heat map shown');
            }
        });
    }

    if (centerMapBtn) {
        centerMapBtn.addEventListener('click', () => {
            handleMapControls('center');
        });
    }

    if (fitBoundsBtn) {
        fitBoundsBtn.addEventListener('click', () => {
            fitMapBounds();
        });
    }

    // Map layer switching
    mapLayerBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            mapLayerBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const layer = btn.dataset.layer;
            if (layer === 'satellite') {
                map.removeLayer(baseLayer);
                baseLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    attribution: '© Esri',
                    maxZoom: 18
                }).addTo(map);
                console.log('Switched to satellite view');
            } else {
                map.removeLayer(baseLayer);
                baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 18
                }).addTo(map);
                console.log('Switched to map view');
            }
        });
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (map) {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + R: Refresh data
        if ((e.ctrlKey || e.metaKey) && e.key === 'r' && !isLoading) {
            e.preventDefault();
            window.refreshClientData();
        }
        
        // Escape: Clear search
        if (e.key === 'Escape' && searchInput) {
            searchInput.value = '';
            updateMap();
            updateClientList();
        }
        
        // F: Fit bounds
        if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
            fitMapBounds();
        }
    });

    // Initialize heat map toggle button state
    if (toggleHeatMapBtn) {
        toggleHeatMapBtn.classList.add('active');
    }

    // Add fix coordinates function
    async function fixClientCoordinates() {
        try {
            const response = await fetch('/api/fix/client-coordinates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Fix coordinates result:', result);
            
            if (result.success) {
                showNotification(`Fixed ${result.fixed_count} client coordinates`, 'success');
                if (result.errors.length > 0) {
                    console.warn('Some errors occurred:', result.errors);
                }
                // Refresh the map after fixing
                await loadClientData();
            } else {
                showNotification('Failed to fix coordinates', 'error');
            }
        } catch (error) {
            console.error('Error fixing coordinates:', error);
            showNotification('Error fixing coordinates', 'error');
        }
    }

    // Add function to manually set coordinates
    async function setClientCoordinates() {
        try {
            const response = await fetch('/api/set-client-coordinates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Set coordinates result:', result);
            
            if (result.success) {
                showNotification(`Set coordinates for ${result.updated_count} clients`, 'success');
                console.log('Client info:', result.client_info);
                return result.updated_count > 0;
            } else {
                showNotification('Failed to set coordinates', 'error');
                return false;
            }
        } catch (error) {
            console.error('Error setting coordinates:', error);
            showNotification('Error setting coordinates', 'error');
            return false;
        }
    }

    // Add geocodeAll button handler
    const geocodeAllBtn = document.getElementById('geocodeAll');
    if (geocodeAllBtn) {
        geocodeAllBtn.addEventListener('click', async () => {
            try {
                geocodeAllBtn.disabled = true;
                geocodeAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                
                showNotification('Force geocoding all clients...', 'info');
                
                const response = await fetch('/api/force-geocode-all', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                console.log('Force geocode result:', result);
                
                if (result.success) {
                    showNotification(result.message, 'success');
                    console.log('Geocoding details:', result.results.details);
                    
                    // Refresh the map immediately
                    await loadClientData();
                } else {
                    showNotification('Failed to geocode clients', 'error');
                }
                
            } catch (error) {
                console.error('Error force geocoding clients:', error);
                showNotification('Error geocoding clients', 'error');
            } finally {
                geocodeAllBtn.disabled = false;
                geocodeAllBtn.innerHTML = '<i class="fas fa-map-marked-alt"></i>';
            }
        });
    }

    // Initialize map
    console.log('DOM loaded, initializing map...');
    initializeMap();

    // Auto-refresh data every 5 minutes
    setInterval(() => {
        if (!isLoading && document.visibilityState === 'visible') {
            console.log('Auto-refreshing client data...');
            loadClientData();
        }
    }, 300000); // 5 minutes
}); 