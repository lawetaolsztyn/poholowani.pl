document.addEventListener('DOMContentLoaded', function() {
    const offerTransportBtn = document.getElementById('offer-transport-btn');
    const searchTransportBtn = document.getElementById('search-transport-btn');
    const mapContainer = document.getElementById('map-container');
    const transportForm = document.getElementById('transport-form');
    const transportList = document.getElementById('transport-list');

    let mapInitialized = false;

    offerTransportBtn.addEventListener('click', function() {
        mapContainer.style.display = 'block';
        transportForm.classList.remove('hidden');
        transportList.classList.add('hidden');
        if (!mapInitialized) {
            initMap();
            mapInitialized = true;
        }
    });

    searchTransportBtn.addEventListener('click', function() {
        mapContainer.style.display = 'block';
        transportList.classList.remove('hidden');
        transportForm.classList.add('hidden');
        if (!mapInitialized) {
            initMap();
            mapInitialized = true;
        }
    });
});