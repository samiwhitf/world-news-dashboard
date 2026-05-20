import express from 'express';
import cors from 'cors';
import Parser from 'rss-parser';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for frontend requests
app.use(cors());
app.use(express.json());

// Initialize RSS Parser with custom fields for Media RSS thumbnails
const parser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }]
    ]
  }
});

// Initialize Cache: 5 minutes TTL (300 seconds), check for expired keys every 60 seconds
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Mapping of continent codes to BBC News RSS Feeds
const CONTINENT_FEEDS = {
  world: 'https://feeds.bbci.co.uk/news/world/rss.xml',
  africa: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml',
  asia: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml',
  europe: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml',
  latin_america: 'https://feeds.bbci.co.uk/news/world/latin_america/rss.xml',
  north_america: 'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml',
  oceania: 'https://feeds.bbci.co.uk/news/world/australia/rss.xml',
  middle_east: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml'
};

// Safe helper to extract article thumbnail from various possible XML structures
function extractThumbnail(item) {
  try {
    // 1. Try custom mediaThumbnail parsed field
    if (item.mediaThumbnail && item.mediaThumbnail.length > 0) {
      const thumb = item.mediaThumbnail[0];
      if (thumb && thumb.$ && thumb.$.url) {
        return thumb.$.url;
      }
    }

    // 2. Try standard enclosure tag
    if (item.enclosure && item.enclosure.url && item.enclosure.type && item.enclosure.type.startsWith('image/')) {
      return item.enclosure.url;
    }

    // 3. Try to regex match image source in description
    if (item.description) {
      const imgMatch = item.description.match(/<img[^>]+src="([^">]+)"/);
      if (imgMatch && imgMatch[1]) {
        return imgMatch[1];
      }
    }
  } catch (err) {
    console.error('Error extracting thumbnail: ', err.message);
  }
  return null;
}

// Helper to strip HTML tags from news descriptions
function cleanDescription(description) {
  if (!description) return '';
  return description.replace(/<[^>]*>/g, '').trim();
}

// API endpoint to fetch news by continent
app.get('/api/news', async (req, res) => {
  const continent = (req.query.continent || 'world').toLowerCase();

  // Validate the continent parameter
  if (!CONTINENT_FEEDS[continent]) {
    return res.status(400).json({
      error: `Invalid continent parameter. Must be one of: ${Object.keys(CONTINENT_FEEDS).join(', ')}`
    });
  }

  // Check cache first
  const cacheKey = `news_${continent}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`[Cache Hit] Serving cached news for: ${continent}`);
    return res.json(cachedData);
  }

  console.log(`[Cache Miss] Fetching RSS feed for: ${continent}`);
  const feedUrl = CONTINENT_FEEDS[continent];

  try {
    const feed = await parser.parseURL(feedUrl);
    
    // Process items into a unified clean schema
    const articles = feed.items.map((item, index) => {
      const imageUrl = extractThumbnail(item);
      return {
        id: `${continent}_${index}_${Date.parse(item.pubDate || new Date())}`,
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        isoDate: item.isoDate,
        description: cleanDescription(item.description || item.contentSnippet),
        source: item.creator || feed.title || 'BBC News',
        imageUrl: imageUrl
      };
    });

    const responseData = {
      continent,
      title: feed.title || `BBC News - ${continent.toUpperCase()}`,
      description: feed.description || `Up to date news for ${continent}`,
      lastBuildDate: feed.lastBuildDate || new Date().toISOString(),
      articles: articles
    };

    // Store in cache
    cache.set(cacheKey, responseData);

    return res.json(responseData);
  } catch (error) {
    console.error(`Error parsing RSS feed for ${continent}:`, error);
    return res.status(500).json({
      error: 'Failed to fetch or parse news feed',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`World News Proxy Backend running on port ${PORT}`);
});
