import time
import re
import ssl
from flask import Flask, request, jsonify
from flask_cors import CORS
import feedparser

# Bypass SSL Verification issues common on macOS
try:
    ssl._create_default_https_context = ssl._create_unverified_context
except AttributeError:
    pass

app = Flask(__name__)
# Enable CORS for frontend requests
CORS(app)

# Simple in-memory cache
# Structure: { continent_code: { "timestamp": float, "data": dict } }
NEWS_CACHE = {}
CACHE_TTL = 300  # 5 minutes in seconds

# Verifiable RSS Feeds by Continent (Aggregated Local & International)
CONTINENT_FEEDS = {
    'world': [
        'https://feeds.bbci.co.uk/news/world/rss.xml',
        'https://rss.dw.com/rdf/rss-en-world'
    ],
    'africa': [
        'https://feeds.bbci.co.uk/news/world/africa/rss.xml',
        'https://www.sabcnews.com/sabcnews/feed/'
    ],
    'asia': [
        'https://feeds.bbci.co.uk/news/world/asia/rss.xml',
        'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?category=6511'
    ],
    'europe': [
        'https://feeds.bbci.co.uk/news/world/europe/rss.xml',
        'https://rss.dw.com/rdf/rss-en-eu'
    ],
    'latin_america': [
        'https://feeds.bbci.co.uk/news/world/latin_america/rss.xml',
        'https://en.mercopress.com/rss/'
    ],
    'north_america': [
        'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml',
        'https://news.google.com/rss/search?q=location:US+OR+location:Canada&hl=en-US&gl=US&ceid=US:en'
    ],
    'oceania': [
        'https://feeds.bbci.co.uk/news/world/australia/rss.xml',
        'https://www.abc.net.au/news/feed/45924/rss.xml'
    ],
    'middle_east': [
        'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
        'https://www.aljazeera.com/xml/rss/all.xml'
    ]
}

# Extract dynamic keywords from title for context-aware fallbacks
def extract_keyword(title, continent):
    title_lower = title.lower()
    
    # 1. Look for strong action/theme keywords
    themes = {
        'war': ['war', 'conflict', 'military', 'army', 'weapons', 'missile', 'bomb', 'defense', 'combat', 'soldiers', 'battle', 'forces', 'invasion'],
        'attack': ['attack', 'shooting', 'blast', 'bombing', 'assault', 'terror', 'violence', 'killed', 'grenade', 'explosion'],
        'protest': ['protest', 'strike', 'riot', 'march', 'demonstration', 'police', 'clash', 'protesters', 'rally'],
        'economy': ['economy', 'inflation', 'stocks', 'market', 'trade', 'finance', 'business', 'tax', 'prices', 'money', 'oil', 'gas'],
        'tech': ['tech', 'ai', 'artificial intelligence', 'silicon', 'robot', 'software', 'google', 'apple', 'startup', 'innovation'],
        'space': ['space', 'nasa', 'rocket', 'moon', 'mars', 'satellite', 'galaxy', 'planet', 'astronaut'],
        'sport': ['sport', 'football', 'soccer', 'cup', 'olympics', 'fifa', 'championship', 'league', 'tennis', 'game', 'stadium', 'cricket'],
        'health': ['health', 'ebola', 'virus', 'pandemic', 'covid', 'medical', 'hospital', 'doctor', 'outbreak', 'vaccine', 'disease']
    }
    
    for theme, words in themes.items():
        if any(w in title_lower for w in words):
            return theme
            
    # 2. Look for country names or continent-specific terms
    countries = {
        'africa': ['nigeria', 'kenya', 'south africa', 'congo', 'uganda', 'sudan', 'ethiopia', 'egypt', 'ghana', 'morocco', 'niger'],
        'asia': ['china', 'japan', 'india', 'taiwan', 'korea', 'singapore', 'vietnam', 'thailand', 'pakistan', 'philippines', 'beijing', 'tokyo'],
        'europe': ['uk', 'london', 'france', 'paris', 'germany', 'berlin', 'italy', 'rome', 'spain', 'russia', 'moscow', 'ukraine', 'kyiv'],
        'latin_america': ['brazil', 'argentina', 'mexico', 'venezuela', 'colombia', 'peru', 'chile', 'cuba'],
        'north_america': ['us', 'usa', 'america', 'canada', 'ottawa', 'washington', 'biden', 'trump', 'new york'],
        'oceania': ['australia', 'sydney', 'melbourne', 'new zealand', 'auckland', 'fiji'],
        'middle_east': ['gaza', 'israel', 'jerusalem', 'iran', 'tehran', 'iraq', 'syria', 'saudi', 'riyadh', 'dubai', 'yemen', 'lebanon']
    }
    
    for word in title.split():
        clean_w = re.sub(r'[^\w]', '', word)
        clean_w_lower = clean_w.lower()
        for region, name_list in countries.items():
            if clean_w_lower in name_list:
                return clean_w_lower
                
    # 3. Fallback to continent or general news keyword
    return continent if continent != 'world' else 'news'

def get_deterministic_seed(text):
    return sum(ord(c) for c in text) % 1000


def extract_thumbnail(entry):
    """
    Safely extracts a thumbnail image from a feed entry.
    Handles Media RSS, enclosures, and embedded HTML images.
    """
    # 1. Check Media RSS media_thumbnail (standard for BBC RSS)
    if 'media_thumbnail' in entry and len(entry.media_thumbnail) > 0:
        thumb = entry.media_thumbnail[0]
        if isinstance(thumb, dict) and 'url' in thumb:
            return thumb['url']
            
    # 2. Check Media RSS media_content
    if 'media_content' in entry and len(entry.media_content) > 0:
        for content in entry.media_content:
            if isinstance(content, dict) and 'url' in content and content.get('medium') == 'image':
                return content['url']

    # 3. Check enclosures
    if 'enclosures' in entry and len(entry.enclosures) > 0:
        for enc in entry.enclosures:
            if isinstance(enc, dict) and enc.get('type', '').startswith('image/') and 'href' in enc:
                return enc['href']

    # 4. Check for <img> tag in summary/description
    summary = entry.get('summary', '') or entry.get('description', '')
    if summary:
        img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', summary)
        if img_match:
            return img_match.group(1)

    return None

def clean_summary(summary):
    """
    Strips HTML tags from the article summary.
    """
    if not summary:
        return ''
    # Remove HTML tags
    cleaned = re.sub(r'<[^>]*>', '', summary)
    return cleaned.strip()

@app.route('/api/news', methods=['GET'])
def get_news():
    continent = request.args.get('continent', 'world').lower()

    if continent not in CONTINENT_FEEDS:
        return jsonify({
            'error': f'Invalid continent. Must be one of: {", ".join(CONTINENT_FEEDS.keys())}'
        }), 400

    current_time = time.time()
    
    # Check cache
    if continent in NEWS_CACHE:
        cache_entry = NEWS_CACHE[continent]
        if current_time - cache_entry['timestamp'] < CACHE_TTL:
            print(f"[Cache Hit] Serving news for: {continent}")
            return jsonify(cache_entry['data'])

    print(f"[Cache Miss] Fetching RSS feeds for: {continent}")
    feed_urls = CONTINENT_FEEDS[continent]
    
    try:
        from concurrent.futures import ThreadPoolExecutor
        
        def fetch_and_parse(url):
            try:
                return feedparser.parse(url)
            except Exception as ex:
                print(f"Error parsing feed {url}: {ex}")
                return None

        # Fetch feeds concurrently
        with ThreadPoolExecutor(max_workers=len(feed_urls)) as executor:
            feeds = list(executor.map(fetch_and_parse, feed_urls))
        
        articles = []
        seen_links = set()

        for feed in feeds:
            if not feed:
                continue
            
            for entry in feed.entries:
                link = entry.get('link', '')
                if not link or link in seen_links:
                    continue
                seen_links.add(link)
                
                # Extract image or assign a keyword-based relevant fallback
                image_url = extract_thumbnail(entry)
                if not image_url:
                    title_text = entry.get('title', 'No Title')
                    keyword = extract_keyword(title_text, continent)
                    seed = get_deterministic_seed(title_text)
                    image_url = f"https://loremflickr.com/500/300/{keyword}?lock={seed}"
                
                # Normalize source name
                raw_source = entry.get('author') or feed.feed.get('title', 'Local Press')
                raw_source_lower = raw_source.lower()
                
                if 'bbc' in raw_source_lower:
                    source_name = 'BBC News'
                elif 'dw' in raw_source_lower or 'deutsche welle' in raw_source_lower:
                    source_name = 'Deutsche Welle'
                elif 'sabc' in raw_source_lower:
                    source_name = 'SABC News'
                elif 'channelnewsasia' in raw_source_lower or 'cna' in raw_source_lower:
                    source_name = 'CNA'
                elif 'mercopress' in raw_source_lower:
                    source_name = 'MercoPress'
                elif 'abc' in raw_source_lower:
                    source_name = 'ABC Australia'
                elif 'al jazeera' in raw_source_lower or 'aljazeera' in raw_source_lower:
                    source_name = 'Al Jazeera'
                elif 'google news' in raw_source_lower:
                    source_name = 'Local Press'
                else:
                    # Fallback to trimmed author name
                    source_name = raw_source.split(' - ')[0].split(' | ')[0]
                    if len(source_name) > 20:
                        source_name = source_name[:17] + '...'

                # Parse publication date for reliable sorting
                pub_time_struct = entry.get('published_parsed')
                if pub_time_struct:
                    pub_time = time.mktime(pub_time_struct)
                else:
                    pub_time = time.time()
                
                # Format single article
                article = {
                    'id': f"{continent}_{len(articles)}_{int(pub_time)}",
                    'title': entry.get('title', 'No Title'),
                    'link': link,
                    'pubDate': entry.get('published', '') or time.strftime('%a, %d %b %Y %H:%M:%S GMT', time.localtime(pub_time)),
                    'pubTime': pub_time,
                    'description': clean_summary(entry.get('summary', '') or entry.get('description', '')),
                    'source': source_name,
                    'imageUrl': image_url
                }
                articles.append(article)

        # Sort articles chronologically, newest first
        articles.sort(key=lambda x: x['pubTime'], reverse=True)
        
        # Clean up temporary sorting keys
        for art in articles:
            art.pop('pubTime', None)

        response_data = {
            'continent': continent,
            'title': f'Regional Feeds - {continent.upper()}',
            'description': f'Aggregated local and international news feeds for {continent}',
            'articles': articles
        }

        # Cache the result
        NEWS_CACHE[continent] = {
            'timestamp': current_time,
            'data': response_data
        }

        return jsonify(response_data)

    except Exception as e:
        print(f"Error fetching/parsing feed for {continent}: {str(e)}")
        return jsonify({
            'error': 'Failed to fetch or parse news feed',
            'details': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'timestamp': time.time()})

if __name__ == '__main__':
    app.run(port=3001, debug=True)
