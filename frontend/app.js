// FRONTEND APPLICATION LOGIC

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001/api'
  : '/api';

// State Management
let state = {
  activeContinent: 'world',
  searchQuery: '',
  activeCategory: 'all',
  sortBy: 'newest',
  articles: [],
  tickerArticles: [],
  bookmarks: JSON.parse(localStorage.getItem('panorama_bookmarks') || '[]'),
  tempUnit: localStorage.getItem('panorama_temp_unit') || 'C'
};

// Exact Population Counter Data (Reference Baseline: Jan 1, 2026 UTC)
const POP_REFERENCE_TIME = Date.UTC(2026, 0, 1, 0, 0, 0);
const POPULATION_BASES = {
  world: { base: 8118830000, rate: 2.42 },
  africa: { base: 1493920000, rate: 1.12 },
  asia: { base: 4785160000, rate: 0.88 },
  europe: { base: 741700000, rate: 0.01 },
  latin_america: { base: 664570000, rate: 0.15 },
  north_america: { base: 607440000, rate: 0.12 },
  oceania: { base: 46120000, rate: 0.01 },
  middle_east: { base: 495300000, rate: 0.22 }
};

function getExactPopulation(continent) {
  const data = POPULATION_BASES[continent];
  if (!data) return null;
  const elapsedSeconds = (Date.now() - POP_REFERENCE_TIME) / 1000;
  return Math.floor(data.base + elapsedSeconds * data.rate);
}

function startPopulationCounter() {
  const update = () => {
    const pop = getExactPopulation(state.activeContinent);
    if (pop !== null && elements.statPopulation) {
      elements.statPopulation.textContent = pop.toLocaleString();
    }
    requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// Continent Information (Fast Facts, Clocks, Weather Cities)
const CONTINENT_INFO = {
  world: {
    title: 'Global Overview',
    area: '148,940,000 km²',
    population: '8.05 Billion',
    countries: '195',
    clocks: [
      { name: 'London', timezone: 'Europe/London' },
      { name: 'Tokyo', timezone: 'Asia/Tokyo' },
      { name: 'New York', timezone: 'America/New_York' }
    ],
    weather: [
      { name: 'London', icon: '☁️', desc: 'Overcast' },
      { name: 'Tokyo', icon: '☀️', desc: 'Sunny' },
      { name: 'New York', icon: '🌧️', desc: 'Light Rain' }
    ]
  },
  africa: {
    title: 'Africa',
    area: '30,370,000 km²',
    population: '1.43 Billion',
    countries: '54',
    clocks: [
      { name: 'Cairo', timezone: 'Africa/Cairo' },
      { name: 'Johannesburg', timezone: 'Africa/Johannesburg' },
      { name: 'Nairobi', timezone: 'Africa/Nairobi' },
      { name: 'Lagos', timezone: 'Africa/Lagos' }
    ],
    weather: [
      { name: 'Cairo', icon: '☀️', desc: 'Hot & Clear' },
      { name: 'Johannesburg', icon: '⛅', desc: 'Mild Clouds' },
      { name: 'Nairobi', icon: '☀️', desc: 'Pleasant' },
      { name: 'Lagos', icon: '⛈️', desc: 'Thunderstorms' }
    ]
  },
  asia: {
    title: 'Asia',
    area: '44,579,000 km²',
    population: '4.75 Billion',
    countries: '48',
    clocks: [
      { name: 'Tokyo', timezone: 'Asia/Tokyo' },
      { name: 'Beijing', timezone: 'Asia/Shanghai' },
      { name: 'New Delhi', timezone: 'Asia/Kolkata' },
      { name: 'Singapore', timezone: 'Asia/Singapore' }
    ],
    weather: [
      { name: 'Tokyo', icon: '☀️', desc: 'Clear Sky' },
      { name: 'Beijing', icon: '💨', desc: 'Hazy Wind' },
      { name: 'New Delhi', icon: '☀️', desc: 'Very Hot' },
      { name: 'Singapore', icon: '⛈️', desc: 'Humid Rain' }
    ]
  },
  europe: {
    title: 'Europe',
    area: '10,180,000 km²',
    population: '746 Million',
    countries: '44',
    clocks: [
      { name: 'London', timezone: 'Europe/London' },
      { name: 'Paris', timezone: 'Europe/Paris' },
      { name: 'Berlin', timezone: 'Europe/Berlin' },
      { name: 'Rome', timezone: 'Europe/Rome' }
    ],
    weather: [
      { name: 'London', icon: '☁️', desc: 'Overcast' },
      { name: 'Paris', icon: '⛅', desc: 'Partly Cloudy' },
      { name: 'Berlin', icon: '🌧️', desc: 'Showers' },
      { name: 'Rome', icon: '☀️', desc: 'Warm & Sunny' }
    ]
  },
  latin_america: {
    title: 'Latin America',
    area: '17,840,000 km²',
    population: '660 Million',
    countries: '12 (plus territories)',
    clocks: [
      { name: 'Rio de Janeiro', timezone: 'America/Sao_Paulo' },
      { name: 'Buenos Aires', timezone: 'America/Argentina/Buenos_Aires' },
      { name: 'Bogota', timezone: 'America/Bogota' },
      { name: 'Mexico City', timezone: 'America/Mexico_City' }
    ],
    weather: [
      { name: 'Rio de Janeiro', icon: '☀️', desc: 'Tropical Clear' },
      { name: 'Buenos Aires', icon: '⛅', desc: 'Breezy' },
      { name: 'Bogota', icon: '🌧️', desc: 'Rainy Spell' },
      { name: 'Mexico City', icon: '☀️', desc: 'Sunny Afternoon' }
    ]
  },
  north_america: {
    title: 'North America',
    area: '24,709,000 km²',
    population: '592 Million',
    countries: '23',
    clocks: [
      { name: 'Washington D.C.', timezone: 'America/New_York' },
      { name: 'Toronto', timezone: 'America/Toronto' },
      { name: 'Los Angeles', timezone: 'America/Los_Angeles' },
      { name: 'Vancouver', timezone: 'America/Vancouver' }
    ],
    weather: [
      { name: 'Washington D.C.', icon: '⛅', desc: 'Scattered Clouds' },
      { name: 'Toronto', icon: '☁️', desc: 'Cool & Cloudy' },
      { name: 'Los Angeles', icon: '☀️', desc: 'Warm Beach' },
      { name: 'Vancouver', icon: '🌧️', desc: 'Steady Rain' }
    ]
  },
  oceania: {
    title: 'Oceania',
    area: '8,525,989 km²',
    population: '44 Million',
    countries: '14',
    clocks: [
      { name: 'Sydney', timezone: 'Australia/Sydney' },
      { name: 'Canberra', timezone: 'Australia/Canberra' },
      { name: 'Wellington', timezone: 'Pacific/Auckland' },
      { name: 'Suva', timezone: 'Pacific/Fiji' }
    ],
    weather: [
      { name: 'Sydney', icon: '☀️', desc: 'Clear Waves' },
      { name: 'Canberra', icon: '⛅', desc: 'Cool Breeze' },
      { name: 'Wellington', icon: '💨', desc: 'Very Windy' },
      { name: 'Suva', icon: '🌦️', desc: 'Tropical Shower' }
    ]
  },
  middle_east: {
    title: 'Middle East',
    area: '7,200,000 km²',
    population: '411 Million',
    countries: '18',
    clocks: [
      { name: 'Riyadh', timezone: 'Asia/Riyadh' },
      { name: 'Tehran', timezone: 'Asia/Tehran' },
      { name: 'Tel Aviv', timezone: 'Asia/Jerusalem' },
      { name: 'Baghdad', timezone: 'Asia/Baghdad' }
    ],
    weather: [
      { name: 'Riyadh', icon: '☀️', desc: 'Desert Heat' },
      { name: 'Tehran', icon: '☀️', desc: 'Dry & Clear' },
      { name: 'Tel Aviv', icon: '☀️', desc: 'Sunny Coastal' },
      { name: 'Baghdad', icon: '☀️', desc: 'Extremely Hot' }
    ]
  }
};

// Keyword lists for client-side category classification
const CATEGORY_KEYWORDS = {
  politics: [
    'politics', 'election', 'government', 'president', 'prime minister', 'parliament', 'vote',
    'treaty', 'protest', 'war', 'military', 'biden', 'ukraine', 'gaza', 'ceasefire', 'china',
    'strike', 'court', 'state', 'policy', 'leader', 'diplomacy', 'nuclear', 'sanction', 'security'
  ],
  business: [
    'business', 'finance', 'market', 'stock', 'economy', 'company', 'inflation', 'deal', 'bank',
    'oil', 'price', 'billion', 'million', 'trade', 'ceo', 'invest', 'revenue', 'tariff', 'interest rate'
  ],
  tech: [
    'technology', 'science', 'space', 'nasa', 'ai', 'artificial intelligence', 'robot', 'device',
    'climate', 'earth', 'energy', 'digital', 'phone', 'chip', 'dna', 'gene', 'species', 'health',
    'medical', 'cancer', 'research', 'software', 'google', 'apple', 'meta', 'expert'
  ],
  culture: [
    'culture', 'art', 'music', 'film', 'movie', 'museum', 'festival', 'fashion', 'book', 'food',
    'travel', 'history', 'celebrity', 'royal', 'sport', 'football', 'fifa', 'olympics', 'game',
    'actor', 'singer', 'album', 'theatre', 'show', 'entertainment'
  ]
};

// DOM Elements
const elements = {
  mapContainer: document.getElementById('map-container'),
  continentTabs: document.getElementById('continent-tabs'),
  searchInput: document.getElementById('search-input'),
  categoryFilter: document.getElementById('category-filter'),
  sortOrder: document.getElementById('sort-order'),
  newsGrid: document.getElementById('news-grid'),
  tickerFeed: document.getElementById('ticker-feed'),
  sidebarTitle: document.getElementById('sidebar-continent-title'),
  statArea: document.getElementById('stat-area'),
  statPopulation: document.getElementById('stat-population'),
  statCountries: document.getElementById('stat-countries'),
  sidebarClocks: document.getElementById('sidebar-clocks'),
  sidebarWeather: document.getElementById('sidebar-weather'),
  bookmarkBtn: document.getElementById('btn-bookmarks'),
  bookmarkBadge: document.getElementById('bookmark-count'),
  bookmarksDrawer: document.getElementById('bookmarks-drawer'),
  closeDrawerBtn: document.getElementById('btn-close-drawer'),
  drawerOverlay: document.getElementById('drawer-overlay'),
  bookmarksList: document.getElementById('bookmarks-list'),
  clockNY: document.getElementById('clock-ny'),
  clockLon: document.getElementById('clock-lon'),
  clockTok: document.getElementById('clock-tok'),
  tempToggleBtn: document.getElementById('temp-toggle-btn'),
  toggleUnitC: document.getElementById('toggle-unit-c'),
  toggleUnitF: document.getElementById('toggle-unit-f')
};

// INITIALIZATION
async function init() {
  setupHeaderClocks();
  setupEventListeners();
  updateBookmarkBadge();
  updateTempToggleUI();
  startPopulationCounter();
  await loadWorldMap();
  await fetchTickerNews();
  await fetchNews();
}

// 1. SETUP HEADER CLOCKS
function setupHeaderClocks() {
  setInterval(() => {
    const formatClock = (tz) => {
      return new Date().toLocaleTimeString('en-US', {
        timeZone: tz,
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    };
    if (elements.clockNY) elements.clockNY.textContent = formatClock('America/New_York');
    if (elements.clockLon) elements.clockLon.textContent = formatClock('Europe/London');
    if (elements.clockTok) elements.clockTok.textContent = formatClock('Asia/Tokyo');

    // Also update sidebar regional clocks
    updateSidebarClocks();
  }, 1000);
}

// 2. LOAD WORLD MAP SVG
async function loadWorldMap() {
  try {
    const response = await fetch('world-continents.svg');
    if (!response.ok) throw new Error('Failed to load world map asset.');
    const svgText = await response.text();
    elements.mapContainer.innerHTML = svgText;

    // Add interactivity to SVG
    setupMapInteractivity();
  } catch (error) {
    console.error('Error loading world map:', error);
    elements.mapContainer.innerHTML = `
      <div class="empty-container">
        <span class="empty-icon">⚠️</span>
        <p>Interactive map could not load. Use continent tabs to navigate.</p>
      </div>
    `;
  }
}

// 3. SVG MAP INTERACTIVITY
function setupMapInteractivity() {
  const continentGroups = document.querySelectorAll('.continent-group');
  
  // Set glow hover variables in CSS based on continent colors
  continentGroups.forEach(group => {
    const continentId = group.id;
    const hoverColor = getComputedStyle(document.documentElement).getPropertyValue(`--color-${continentId}`).trim();
    group.style.setProperty('--hover-color', hoverColor);
    
    // Add Click listener
    group.addEventListener('click', () => {
      selectContinent(continentId);
    });
  });
  
  updateMapHighlight();
}

function updateMapHighlight() {
  const continentGroups = document.querySelectorAll('.continent-group');
  continentGroups.forEach(group => {
    if (group.id === state.activeContinent) {
      group.classList.add('active');
    } else {
      group.classList.remove('active');
    }
  });
}

// 4. CHOOSE CONTINENT
function selectContinent(continentId) {
  if (state.activeContinent === continentId) return;

  state.activeContinent = continentId;

  // Set active CSS Accent Variables
  const root = document.documentElement;
  const colorVal = getComputedStyle(root).getPropertyValue(`--color-${continentId}`).trim();
  root.style.setProperty('--accent-color', colorVal);
  root.style.setProperty('--accent-glow', `${colorVal}26`); // 15% opacity in hex is 26

  // Update tabs active state
  const tabs = document.querySelectorAll('.tab-pill');
  tabs.forEach(tab => {
    if (tab.dataset.continent === continentId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Update map SVG highlight
  updateMapHighlight();

  // Update sidebar widgets
  updateSidebarInfo();

  // Reset category filters and searches for fresh view
  state.searchQuery = '';
  elements.searchInput.value = '';
  state.activeCategory = 'all';
  elements.categoryFilter.value = 'all';

  // Fetch news
  fetchNews();
}

// 5. FETCH GLOBAL TICKER NEWS
async function fetchTickerNews() {
  try {
    const response = await fetch(`${API_BASE_URL}/news?continent=world`);
    if (!response.ok) throw new Error();
    const data = await response.json();
    state.tickerArticles = data.articles.slice(0, 15);
    renderTicker();
  } catch (error) {
    console.error('Failed to load ticker news:', error);
    elements.tickerFeed.innerHTML = '<span class="ticker-item">AURA NEWS | Gathering global news updates...</span>';
  }
}

function renderTicker() {
  if (!state.tickerArticles || state.tickerArticles.length === 0) return;
  
  // Duplicate stories to make infinite scrolling seamless
  const list = [...state.tickerArticles, ...state.tickerArticles];
  elements.tickerFeed.innerHTML = list.map(art => `
    <a href="${art.link}" target="_blank" class="ticker-item">${art.title}</a>
  `).join('');
}

// 6. FETCH FEED NEWS BY SELECTED REGION
async function fetchNews() {
  renderLoading();
  try {
    const response = await fetch(`${API_BASE_URL}/news?continent=${state.activeContinent}`);
    if (!response.ok) throw new Error('API server returned error.');
    const data = await response.json();
    
    state.articles = data.articles;
    renderArticles();
  } catch (error) {
    console.error('Error fetching articles:', error);
    renderError();
  }
}

// 7. RENDER FUNCTIONS
function renderLoading() {
  elements.newsGrid.innerHTML = `
    <div class="loading-container" style="grid-column: 1 / -1;">
      <div class="spinner"></div>
      <p>Gathering regional press files...</p>
    </div>
  `;
}

function renderError() {
  elements.newsGrid.innerHTML = `
    <div class="empty-container" style="grid-column: 1 / -1;">
      <span class="empty-icon">⚠️</span>
      <h3>Failed to load regional feeds</h3>
      <p style="margin-top: 10px; font-size: 0.9rem; color: var(--text-muted);">Ensure the Flask backend service is running locally on port 3001.</p>
      <button class="btn-read-more" style="margin-top: 20px; cursor: pointer;" onclick="window.location.reload()">Retry Connection</button>
    </div>
  `;
}

function renderArticles() {
  // Apply category and search filters client-side
  let filtered = filterArticles(state.articles);
  
  // Sort articles
  filtered = sortArticles(filtered);

  if (filtered.length === 0) {
    elements.newsGrid.innerHTML = `
      <div class="empty-container" style="grid-column: 1 / -1;">
        <span class="empty-icon">🔍</span>
        <h3>No matching stories found</h3>
        <p>Try refining your search text or changing categories.</p>
      </div>
    `;
    return;
  }

  elements.newsGrid.innerHTML = filtered.map(art => {
    const isSaved = state.bookmarks.some(b => b.link === art.link);
    const dateStr = formatRelativeTime(art.pubDate);
    const category = classifyArticle(art);
    
    return `
      <article class="news-card">
        <div class="card-image-wrap">
          ${art.imageUrl ? 
            `<img class="card-img" src="${art.imageUrl}" alt="${art.title}" loading="lazy">` : 
            `<div class="card-image-placeholder">
              <div class="card-image-placeholder-pattern"></div>
              <span class="placeholder-icon">✦</span>
             </div>`
          }
          <div class="card-badges">
            <span class="badge badge-continent">${state.activeContinent}</span>
            <span class="badge badge-source">${art.source}</span>
          </div>
        </div>
        <div class="card-body">
          <div class="card-date">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            ${dateStr}
          </div>
          <h3 class="card-title">${art.title}</h3>
          <p class="card-desc">${art.description || 'No description available for this headline.'}</p>
          <div class="card-footer">
            <div class="card-actions">
              <!-- Bookmark action -->
              <button class="btn-card-action ${isSaved ? 'active' : ''}" 
                      title="Save article" 
                      onclick="window.toggleBookmark('${encodeURIComponent(JSON.stringify(art))}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
              </button>
              <!-- Share action -->
              <button class="btn-card-action" 
                      title="Share link" 
                      onclick="window.shareLink('${art.link}', '${art.title.replace(/'/g, "\\'")}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
              </button>
            </div>
            <a href="${art.link}" target="_blank" class="btn-read-more">
              Read More 
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </a>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// 8. HELPERS: ARTICLE CLASSIFIER, FILTERS, SORTS
function classifyArticle(art) {
  const text = `${art.title} ${art.description}`.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return category;
    }
  }
  return 'culture'; // fallback
}

function filterArticles(articles) {
  return articles.filter(art => {
    // 1. Text filter
    const matchesSearch = !state.searchQuery || 
      art.title.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
      art.description.toLowerCase().includes(state.searchQuery.toLowerCase());
      
    // 2. Category filter
    const cat = classifyArticle(art);
    const matchesCategory = state.activeCategory === 'all' || cat === state.activeCategory;
    
    return matchesSearch && matchesCategory;
  });
}

function sortArticles(articles) {
  const list = [...articles];
  if (state.sortBy === 'newest') {
    return list.sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate));
  }
  if (state.sortBy === 'oldest') {
    return list.sort((a, b) => Date.parse(a.pubDate) - Date.parse(b.pubDate));
  }
  if (state.sortBy === 'alphabetical') {
    return list.sort((a, b) => a.title.localeCompare(b.title));
  }
  return list;
}

function formatRelativeTime(dateStr) {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 600);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(diffMins / 60);
    if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (err) {
    return dateStr;
  }
}

// 9. SIDEBAR DETAILS
function updateSidebarInfo() {
  const info = CONTINENT_INFO[state.activeContinent];
  if (!info) return;

  elements.sidebarTitle.textContent = info.title;
  elements.statArea.textContent = info.area;
  elements.statCountries.textContent = info.countries;

  updateSidebarClocks();
  updateSidebarWeather();
}

function updateSidebarClocks() {
  const info = CONTINENT_INFO[state.activeContinent];
  if (!info || !info.clocks) return;

  elements.sidebarClocks.innerHTML = info.clocks.map(clk => {
    const formatted = new Date().toLocaleTimeString('en-US', {
      timeZone: clk.timezone,
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    return `
      <div class="city-clock-row">
        <span class="city-name">${clk.name}</span>
        <span class="city-time">${formatted}</span>
      </div>
    `;
  }).join('');
}

function updateSidebarWeather() {
  const info = CONTINENT_INFO[state.activeContinent];
  if (!info || !info.weather) return;

  // Generate a seed based on local time so weather temperatures change slightly/realistically
  const seed = new Date().getMinutes();

  elements.sidebarWeather.innerHTML = info.weather.map((w, idx) => {
    // Generate a reasonable temperature (e.g. 15°C to 35°C based on city)
    const baseTempC = 18 + ((seed + idx * 7) % 18);
    
    let displayTemp = `${baseTempC}°C`;
    if (state.tempUnit === 'F') {
      const tempF = Math.round((baseTempC * 9) / 5 + 32);
      displayTemp = `${tempF}°F`;
    }

    return `
      <div class="weather-row">
        <div class="weather-city">
          <span class="w-name">${w.name}</span>
          <span class="w-desc">${w.desc}</span>
        </div>
        <div class="weather-info">
          <span class="w-icon">${w.icon}</span>
          <span class="w-temp">${displayTemp}</span>
        </div>
      </div>
    `;
  }).join('');
}

function updateTempToggleUI() {
  if (!elements.toggleUnitC || !elements.toggleUnitF) return;
  if (state.tempUnit === 'C') {
    elements.toggleUnitC.style.background = 'var(--accent-color)';
    elements.toggleUnitC.style.color = 'var(--bg-primary)';
    elements.toggleUnitF.style.background = 'transparent';
    elements.toggleUnitF.style.color = 'var(--text-muted)';
  } else {
    elements.toggleUnitC.style.background = 'transparent';
    elements.toggleUnitC.style.color = 'var(--text-muted)';
    elements.toggleUnitF.style.background = 'var(--accent-color)';
    elements.toggleUnitF.style.color = 'var(--bg-primary)';
  }
}

// 10. BOOKMARKS LOGIC
window.toggleBookmark = function(encodedArt) {
  const art = JSON.parse(decodeURIComponent(encodedArt));
  const idx = state.bookmarks.findIndex(b => b.link === art.link);

  if (idx > -1) {
    // Remove
    state.bookmarks.splice(idx, 1);
  } else {
    // Add
    state.bookmarks.push(art);
  }

  localStorage.setItem('panorama_bookmarks', JSON.stringify(state.bookmarks));
  updateBookmarkBadge();
  renderArticles();
  renderBookmarksList();
};

window.removeBookmark = function(link) {
  state.bookmarks = state.bookmarks.filter(b => b.link !== link);
  localStorage.setItem('panorama_bookmarks', JSON.stringify(state.bookmarks));
  updateBookmarkBadge();
  renderArticles();
  renderBookmarksList();
};

function updateBookmarkBadge() {
  const count = state.bookmarks.length;
  elements.bookmarkBadge.textContent = count;
  elements.bookmarkBadge.style.display = count > 0 ? 'inline-block' : 'none';
}

function renderBookmarksList() {
  if (state.bookmarks.length === 0) {
    elements.bookmarksList.innerHTML = `
      <div class="empty-container" style="min-height: auto;">
        <span class="empty-icon" style="font-size: 2rem;">📌</span>
        <p style="font-size: 0.85rem;">No saved articles yet.</p>
      </div>
    `;
    return;
  }

  elements.bookmarksList.innerHTML = state.bookmarks.map(art => `
    <div class="bookmark-item">
      ${art.imageUrl ? `<img class="bookmark-thumb" src="${art.imageUrl}" alt="">` : `<div class="bookmark-thumb" style="background: linear-gradient(135deg, #1e293b, #0f172a); display: flex; align-items:center; justify-content:center; color:var(--accent-color); font-weight:bold;">✦</div>`}
      <div class="bookmark-details">
        <a href="${art.link}" target="_blank" class="bookmark-item-title">${art.title}</a>
        <div class="bookmark-item-meta">
          <span>${art.source}</span>
          <button class="btn-bookmark-remove" onclick="window.removeBookmark('${art.link}')" title="Delete bookmark">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// 11. SHARE LOGIC
window.shareLink = function(link, title) {
  if (navigator.share) {
    navigator.share({
      title: title,
      url: link
    }).catch(err => console.log('Share error:', err));
  } else {
    // Copy to clipboard fallback
    navigator.clipboard.writeText(link).then(() => {
      alert('Article link copied to clipboard!');
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  }
};

// 12. EVENT LISTENERS
function setupEventListeners() {
  // Tabs click listeners
  const tabs = document.querySelectorAll('.tab-pill');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      selectContinent(tab.dataset.continent);
    });
  });

  // Search input change listener (debounce/instant filter)
  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    renderArticles();
  });

  // Category select change
  elements.categoryFilter.addEventListener('change', (e) => {
    state.activeCategory = e.target.value;
    renderArticles();
  });

  // Sort select change
  elements.sortOrder.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderArticles();
  });

  // Bookmark drawer open/close
  elements.bookmarkBtn.addEventListener('click', () => {
    renderBookmarksList();
    elements.bookmarksDrawer.classList.add('open');
    elements.drawerOverlay.classList.add('active');
  });

  elements.closeDrawerBtn.addEventListener('click', () => {
    elements.bookmarksDrawer.classList.remove('open');
    elements.drawerOverlay.classList.remove('active');
  });

  elements.drawerOverlay.addEventListener('click', () => {
    elements.bookmarksDrawer.classList.remove('open');
    elements.drawerOverlay.classList.remove('active');
  });

  // Temperature Unit Toggle
  if (elements.tempToggleBtn) {
    elements.tempToggleBtn.addEventListener('click', () => {
      state.tempUnit = state.tempUnit === 'C' ? 'F' : 'C';
      localStorage.setItem('panorama_temp_unit', state.tempUnit);
      updateTempToggleUI();
      updateSidebarWeather();
    });
  }
}

// Trigger initial setup
init();
