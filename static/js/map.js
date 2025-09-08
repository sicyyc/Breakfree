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
    const LAGUNA_CENTER = [14.2500, 121.3000]; // Centered to cover all of Laguna Province
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

    // Initialize map with enhanced online capabilities
    function initializeMap() {
        // Create the map centered on Laguna
        map = L.map('mapCanvas', {
            zoomControl: true,
            attributionControl: true,
            preferCanvas: false
        }).setView(LAGUNA_CENTER, 10);

        // Define multiple online tile layers for better reliability
        const tileLayers = {
            osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18,
                subdomains: ['a', 'b', 'c']
            }),
            cartodb: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '© OpenStreetMap contributors, © CartoDB',
                maxZoom: 20,
                subdomains: 'abcd'
            }),
            esri: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri',
                maxZoom: 18
            }),
            satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri',
                maxZoom: 18
            }),
            hybrid: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri',
                maxZoom: 18
            })
        };

        // Add layer control for switching between different online maps
        const layerControl = L.control.layers({
            "OpenStreetMap": tileLayers.osm,
            "CartoDB Light": tileLayers.cartodb,
            "Esri Street": tileLayers.esri,
            "Satellite": tileLayers.satellite
        }, {}, {
            position: 'topright',
            collapsed: true
        }).addTo(map);

        // Set default layer with error handling
        baseLayer = tileLayers.osm;
        baseLayer.addTo(map);

        // Add error handling for tile loading
        baseLayer.on('tileerror', function(e) {
            console.warn('Tile loading error:', e);
            showNotification('Map tile loading issue detected. Trying alternative source...', 'warning');
        });

        // Initialize enhanced online heat layer with better color mapping
        heatLayer = L.heatLayer([], {
            radius: 35,
            blur: 25,
            maxZoom: 12,
            gradient: {
                0.0: '#0066cc',  // Blue - Very Low (0-1 clients)
                0.2: '#00cc66',  // Green - Low (1-2 clients)
                0.4: '#ffcc00',  // Yellow - Medium (2-3 clients)
                0.6: '#ff6600',  // Orange - High (3-4 clients)
                0.8: '#ff3300',  // Red - Very High (4-5 clients)
                1.0: '#cc0000'   // Dark Red - Maximum (5+ clients)
            }
        }).addTo(map);

        // Add click event to show heat map info
        map.on('click', function(e) {
            showHeatMapInfo(e.latlng);
        });

        // Add zoom control to top-right
        map.zoomControl.setPosition('topright');

        // Add scale control
        L.control.scale({
            position: 'bottomright',
            metric: true,
            imperial: false
        }).addTo(map);

        // Add fullscreen control
        if (L.control.fullscreen) {
            L.control.fullscreen({
                position: 'topright'
            }).addTo(map);
        }

        // Store tile layers for later use
        window.tileLayers = tileLayers;

        // Load real client data instead of sample data
        loadClientData();
        
        // Add test markers for demonstration (remove this after testing)
        addTestMarkers();
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

    // Update last update time
    function updateLastUpdateTime() {
        const updateTimeElement = document.getElementById('updateTime');
        if (updateTimeElement) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });
            updateTimeElement.textContent = timeString;
        }
    }

    // Update heat map statistics
    function updateHeatMapStats(heatData) {
        const totalPointsElement = document.getElementById('totalHeatPoints');
        const maxDensityElement = document.getElementById('maxDensity');
        const heatMapUpdateTimeElement = document.getElementById('heatMapUpdateTime');
        
        if (totalPointsElement) {
            totalPointsElement.textContent = heatData.length;
        }
        
        if (maxDensityElement) {
            // Calculate max density (for now, just use the count)
            const maxDensity = heatData.length > 0 ? Math.max(...heatData.map(point => point[2])) : 0;
            maxDensityElement.textContent = maxDensity;
        }
        
        if (heatMapUpdateTimeElement) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });
            heatMapUpdateTimeElement.textContent = timeString;
        }
    }

    // Show heat map information when clicking on map
    function showHeatMapInfo(latlng) {
        if (!isHeatMapVisible) return;
        
        // Find nearby clients within a reasonable distance
        const nearbyClients = clients.filter(client => {
            if (!client.coordinates) return false;
            const distance = calculateDistance(
                latlng.lat, latlng.lng,
                client.coordinates.lat, client.coordinates.lng
            );
            return distance <= 5; // Within 5km
        });
        
        // Determine density level based on nearby clients
        let densityLevel, densityColor, densityDescription;
        const clientCount = nearbyClients.length;
        
        if (clientCount === 0) {
            densityLevel = "Very Low";
            densityColor = "#0066cc";
            densityDescription = "No clients in this area";
        } else if (clientCount <= 1) {
            densityLevel = "Low";
            densityColor = "#00cc66";
            densityDescription = "1 client in this area";
        } else if (clientCount <= 2) {
            densityLevel = "Medium";
            densityColor = "#ffcc00";
            densityDescription = "2-3 clients in this area";
        } else if (clientCount <= 3) {
            densityLevel = "High";
            densityColor = "#ff6600";
            densityDescription = "3-4 clients in this area";
        } else if (clientCount <= 4) {
            densityLevel = "Very High";
            densityColor = "#ff3300";
            densityDescription = "4-5 clients in this area";
        } else {
            densityLevel = "Maximum";
            densityColor = "#cc0000";
            densityDescription = "5+ clients in this area";
        }
        
        // Create popup content
        const popupContent = `
            <div class="heat-map-popup">
                <div class="popup-header">
                    <div class="density-indicator" style="background-color: ${densityColor}"></div>
                    <h4>Client Density: ${densityLevel}</h4>
                </div>
                <div class="popup-content">
                    <p><strong>${densityDescription}</strong></p>
                    <p><strong>Coordinates:</strong> ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}</p>
                    ${nearbyClients.length > 0 ? `
                        <div class="nearby-clients">
                            <h5>Nearby Clients:</h5>
                            <ul>
                                ${nearbyClients.map(client => `
                                    <li>
                                        <span class="client-name">${client.name}</span>
                                        <span class="client-type ${client.care_type}">${client.care_type === 'in_house' ? 'In-House' : 'After Care'}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Create and show popup
        L.popup()
            .setLatLng(latlng)
            .setContent(popupContent)
            .openOn(map);
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
            
            // Also load location API stats for debugging
            try {
                const locationStatsResponse = await fetch('/api/locations/api-stats');
                if (locationStatsResponse.ok) {
                    const locationStats = await locationStatsResponse.json();
                    console.log('Laguna Location API Stats:', locationStats);
                }
            } catch (e) {
                console.warn('Could not load location API stats:', e);
            }
            
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
            updateLastUpdateTime(); // Update the last update time
            
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

        // Update heat map data with enhanced online functionality
        const heatData = filteredClients.map(client => [
            client.coordinates.lat,
            client.coordinates.lng,
            1 // intensity - could be weighted by factors like client priority, etc.
        ]);
        
        console.log('Updating heat map with', heatData.length, 'data points');
        heatLayer.setLatLngs(heatData);
        
        // Update heat map legend stats
        updateHeatMapStats(heatData);

        // Group clients by location (within 0.001 degrees = ~100m)
        const locationGroups = groupClientsByLocation(filteredClients, 0.001);
        
        // Add markers for each client or group
        locationGroups.forEach(group => {
            if (group.clients.length === 1) {
                // Single client - add individual marker
                const client = group.clients[0];
                const markerIcon = getClientMarkerIcon(client);
                const marker = L.marker([client.coordinates.lat, client.coordinates.lng], {
                    icon: markerIcon
                })
                    .bindPopup(createPopupContent(client))
                    .addTo(map);
                markers.push(marker);
            } else {
                // Multiple clients at same location - add cluster marker
                const clusterMarker = createClusterMarker(group);
                markers.push(clusterMarker);
            }
        });

        // Update client count
        updateClientCount();
    }
    
    // Group clients by location proximity
    function groupClientsByLocation(clients, proximityThreshold = 0.001) {
        const groups = [];
        const processed = new Set();
        
        clients.forEach((client, index) => {
            if (processed.has(index)) return;
            
            const group = {
                center: { lat: client.coordinates.lat, lng: client.coordinates.lng },
                clients: [client]
            };
            
            processed.add(index);
            
            // Find other clients at the same location
            clients.forEach((otherClient, otherIndex) => {
                if (otherIndex === index || processed.has(otherIndex)) return;
                
                const distance = Math.sqrt(
                    Math.pow(client.coordinates.lat - otherClient.coordinates.lat, 2) +
                    Math.pow(client.coordinates.lng - otherClient.coordinates.lng, 2)
                );
                
                if (distance <= proximityThreshold) {
                    group.clients.push(otherClient);
                    processed.add(otherIndex);
                }
            });
            
            groups.push(group);
        });
        
        return groups;
    }
    
    // Create a cluster marker for multiple clients at the same location
    function createClusterMarker(group) {
        const center = group.center;
        const clientCount = group.clients.length;
        
        // Create cluster icon
        const clusterIcon = L.divIcon({
            html: `<div class="cluster-marker">
                     <span class="cluster-count">${clientCount}</span>
                     <i class="fas fa-users"></i>
                   </div>`,
            iconSize: [40, 40],
            className: 'custom-cluster-icon'
        });
        
        // Create popup content for cluster
        const clusterPopupContent = createClusterPopupContent(group);
        
        const marker = L.marker([center.lat, center.lng], {
            icon: clusterIcon
        })
            .bindPopup(clusterPopupContent)
            .addTo(map);
            
        return marker;
    }
    
    // Create popup content for cluster markers
    function createClusterPopupContent(group) {
        const clientList = group.clients.map(client => {
            const careTypeLabel = client.care_type === 'in_house' ? 'In-House' : 'After Care';
            return `
                <div class="cluster-client-item">
                    <strong>${client.name}</strong>
                    <span class="client-type">${careTypeLabel}</span>
                    <span class="client-status ${client.status.toLowerCase()}">${client.status}</span>
                </div>
            `;
        }).join('');
        
        return `
            <div class="cluster-popup">
                <h4>${group.clients.length} Clients at this location</h4>
                <div class="cluster-clients">
                    ${clientList}
                </div>
            </div>
        `;
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

    // Get custom marker icon based on client type and status (Google Maps style)
    function getClientMarkerIcon(client) {
        let iconColor = '#4285f4'; // Google Blue
        let iconSymbol = '📍'; // Default pin emoji
        
        // Color and symbol by care type
        if (client.care_type === 'after_care') {
            iconColor = '#fbbc04'; // Google Yellow
            iconSymbol = '🏠'; // House for after care
        } else {
            iconColor = '#34a853'; // Google Green
            iconSymbol = '🏥'; // Hospital for in-house
        }
        
        // Adjust opacity based on status
        const opacity = client.status === 'active' ? 1.0 : 0.7;
        
        return L.divIcon({
            html: `
                <div class="google-style-marker" style="
                    background-color: ${iconColor};
                    opacity: ${opacity};
                    width: 32px;
                    height: 32px;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    border: 3px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    color: white;
                ">
                    <span style="transform: rotate(45deg);">${iconSymbol}</span>
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32],
            className: 'google-marker-icon'
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
        
        // Add offset indicator if coordinates were adjusted
        let offsetIndicator = '';
        if (client.coordinates && client.coordinates.offset_applied) {
            offsetIndicator = '<span class="offset-indicator" title="Location adjusted for map visibility"><i class="fas fa-arrows-alt"></i> Adjusted</span>';
        }
        
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
                    ${offsetIndicator}
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
                map.setView(LAGUNA_CENTER, 10);
                console.log('Map centered on Laguna Province');
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

    // Add show markers only button
    const showMarkersOnlyBtn = document.getElementById('showMarkersOnly');
    if (showMarkersOnlyBtn) {
        showMarkersOnlyBtn.addEventListener('click', () => {
            // Hide heat map and show only markers
            if (map.hasLayer(heatLayer)) {
                map.removeLayer(heatLayer);
                toggleHeatMapBtn.classList.remove('active');
                isHeatMapVisible = false;
            }
            
            // Toggle button state
            showMarkersOnlyBtn.classList.toggle('active');
            
            if (showMarkersOnlyBtn.classList.contains('active')) {
                showMarkersOnlyBtn.title = 'Show Heat Map';
                console.log('Showing markers only');
            } else {
                showMarkersOnlyBtn.title = 'Show Markers Only';
                console.log('Showing both markers and heat map');
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

    // Enhanced map layer switching with online tile layers
    mapLayerBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            mapLayerBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const layer = btn.dataset.layer;
            if (window.tileLayers) {
                // Remove current base layer
                map.removeLayer(baseLayer);
                
                // Switch to new layer
                switch(layer) {
                    case 'satellite':
                        baseLayer = window.tileLayers.satellite;
                        break;
                    case 'cartodb':
                        baseLayer = window.tileLayers.cartodb;
                        break;
                    case 'esri':
                        baseLayer = window.tileLayers.esri;
                        break;
                    default:
                        baseLayer = window.tileLayers.osm;
                }
                
                // Add new layer with error handling
                baseLayer.addTo(map);
                baseLayer.on('tileerror', function(e) {
                    console.warn('Tile loading error for', layer, ':', e);
                    showNotification(`Map layer "${layer}" loading issue. Trying fallback...`, 'warning');
                });
                
                console.log(`Switched to ${layer} view`);
            }
        });
    });

    // Add event listener for update coordinates button
    const updateCoordinatesBtn = document.getElementById('updateCoordinates');
    if (updateCoordinatesBtn) {
        updateCoordinatesBtn.addEventListener('click', updateClientCoordinates);
    }

    // Add refresh button functionality
    const refreshDataBtn = document.getElementById('refreshData');
    if (refreshDataBtn) {
        refreshDataBtn.addEventListener('click', async () => {
            if (!checkNetworkConnectivity()) {
                showNotification('No internet connection. Cannot refresh data.', 'error');
                return;
            }
            
            refreshDataBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            refreshDataBtn.disabled = true;
            
            try {
                await loadClientData();
                showNotification('Map data refreshed successfully', 'success');
            } catch (error) {
                showNotification('Failed to refresh data. Please try again.', 'error');
            } finally {
                refreshDataBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
                refreshDataBtn.disabled = false;
            }
        });
    }

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

    // Add test markers for demonstration
    function addTestMarkers() {
        // Add some test markers in Laguna area
        const testLocations = [
            {
                name: "Test Client 1",
                coordinates: { lat: 14.2500, lng: 121.3000 },
                care_type: "in_house",
                status: "active",
                address: "Santa Rosa, Laguna"
            },
            {
                name: "Test Client 2", 
                coordinates: { lat: 14.2000, lng: 121.2500 },
                care_type: "after_care",
                status: "active",
                address: "Calamba, Laguna"
            },
            {
                name: "Test Client 3",
                coordinates: { lat: 14.3000, lng: 121.3500 },
                care_type: "in_house", 
                status: "inactive",
                address: "San Pablo, Laguna"
            }
        ];
        
        testLocations.forEach(client => {
            const markerIcon = getClientMarkerIcon(client);
            const marker = L.marker([client.coordinates.lat, client.coordinates.lng], {
                icon: markerIcon
            })
            .bindPopup(createPopupContent(client))
            .addTo(map);
            markers.push(marker);
        });
        
        console.log('Added', testLocations.length, 'test markers');
        
        // Fit map to show all test markers
        if (markers.length > 0) {
            const group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    // Initialize map
    console.log('DOM loaded, initializing map...');
    initializeMap();

    // Function to update client coordinates
    async function updateClientCoordinates() {
        try {
            const button = document.getElementById('updateCoordinates');
            const originalText = button.innerHTML;
            
            // Show loading state
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            button.disabled = true;
            
            const response = await fetch('/api/clients/update-coordinates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Show success message
                showNotification(`Successfully updated ${result.updated} client coordinates`, 'success');
                
                // Reload client data to reflect changes
                await loadClientData();
            } else {
                showNotification(`Error updating coordinates: ${result.error}`, 'error');
            }
            
        } catch (error) {
            console.error('Error updating coordinates:', error);
            showNotification('Failed to update coordinates. Please try again.', 'error');
        } finally {
            // Restore button state
            const button = document.getElementById('updateCoordinates');
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    // Function to show notifications
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 5000);
    }

    // Network connectivity monitoring
    function checkNetworkConnectivity() {
        return navigator.onLine;
    }

    // Update network status indicator
    function updateNetworkStatus() {
        const networkStatus = document.getElementById('networkStatus');
        if (networkStatus) {
            if (checkNetworkConnectivity()) {
                networkStatus.className = 'network-status online';
                networkStatus.innerHTML = '<i class="fas fa-wifi"></i>';
                networkStatus.title = 'Online - Connected to internet';
            } else {
                networkStatus.className = 'network-status offline';
                networkStatus.innerHTML = '<i class="fas fa-wifi-slash"></i>';
                networkStatus.title = 'Offline - No internet connection';
            }
        }
    }

    // Handle online/offline events
    window.addEventListener('online', function() {
        console.log('Network connection restored');
        updateNetworkStatus();
        showNotification('Internet connection restored. Refreshing map data...', 'success');
        loadClientData();
    });

    window.addEventListener('offline', function() {
        console.log('Network connection lost');
        updateNetworkStatus();
        showNotification('Internet connection lost. Map may not update properly.', 'warning');
    });

    // Initialize network status
    updateNetworkStatus();

    // Add interactive heat map legend controls
    const toggleLegendBtn = document.getElementById('toggleLegend');
    const refreshHeatMapBtn = document.getElementById('refreshHeatMap');
    const heatMapLegend = document.getElementById('heatMapLegend');

    if (toggleLegendBtn && heatMapLegend) {
        toggleLegendBtn.addEventListener('click', () => {
            heatMapLegend.style.display = heatMapLegend.style.display === 'none' ? 'block' : 'none';
            toggleLegendBtn.classList.toggle('active');
            
            if (heatMapLegend.style.display === 'none') {
                toggleLegendBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
                toggleLegendBtn.title = 'Show Legend';
            } else {
                toggleLegendBtn.innerHTML = '<i class="fas fa-eye"></i>';
                toggleLegendBtn.title = 'Hide Legend';
            }
        });
    }

    if (refreshHeatMapBtn) {
        refreshHeatMapBtn.addEventListener('click', async () => {
            if (!checkNetworkConnectivity()) {
                showNotification('No internet connection. Cannot refresh heat map.', 'error');
                return;
            }
            
            refreshHeatMapBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            refreshHeatMapBtn.disabled = true;
            
            try {
                await loadClientData();
                showNotification('Heat map refreshed successfully', 'success');
            } catch (error) {
                showNotification('Failed to refresh heat map', 'error');
            } finally {
                refreshHeatMapBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
                refreshHeatMapBtn.disabled = false;
            }
        });
    }

    // Enhanced auto-refresh with connectivity check
    setInterval(() => {
        if (!isLoading && document.visibilityState === 'visible' && checkNetworkConnectivity()) {
            console.log('Auto-refreshing client data...');
            loadClientData();
        }
    }, 300000); // 5 minutes

    // Add real-time data updates (every 2 minutes if online)
    setInterval(() => {
        if (!isLoading && document.visibilityState === 'visible' && checkNetworkConnectivity()) {
            console.log('Real-time data update...');
            loadClientData();
        }
    }, 120000); // 2 minutes

    // Add animated heat map updates for online feel
    function animateHeatMap() {
        if (heatLayer && map.hasLayer(heatLayer)) {
            // Slightly adjust heat map intensity for animation effect
            const currentData = heatLayer.getLatLngs();
            if (currentData && currentData.length > 0) {
                const animatedData = currentData.map(point => [
                    point[0], 
                    point[1], 
                    point[2] * (0.8 + Math.random() * 0.4) // Vary intensity slightly
                ]);
                heatLayer.setLatLngs(animatedData);
            }
        }
    }

    // Animate heat map every 5 seconds for online effect
    setInterval(() => {
        if (isHeatMapVisible && checkNetworkConnectivity()) {
            animateHeatMap();
        }
    }, 5000);
}); 