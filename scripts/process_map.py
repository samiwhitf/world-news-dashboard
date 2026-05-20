import os
import requests
import xml.etree.ElementTree as ET
from pycountry_convert import country_alpha2_to_continent_code

# URL for a clean, minified, country-level world map SVG
SVG_URL = "https://raw.githubusercontent.com/flekschas/simple-world-map/master/world-map.svg"

# Output folder
OUTPUT_FILE = "/Users/sami2003/.gemini/antigravity/scratch/world-news-dashboard/frontend/world-continents.svg"

def get_continent_id(country_code):
    code = country_code.upper()
    
    # Custom mapping to align with BBC News feeds
    # Latin America covers South America + Central America + Caribbean + Mexico
    latam_countries = {
        # Central America & Mexico
        'MX', 'GT', 'BZ', 'SV', 'HN', 'NI', 'CR', 'PA', 
        # Caribbean
        'CU', 'HT', 'DO', 'JM', 'PR', 'BS', 'BB', 'TT', 'GP', 'MQ', 'KY', 'VI', 'AG', 'DM', 'LC', 'VC', 'GD', 'KN', 'MS', 'TC',
        # South America
        'CO', 'VE', 'GY', 'SR', 'GF', 'EC', 'PE', 'BR', 'BO', 'PY', 'CL', 'UY', 'AR', 'FK', 'GS'
    }
    
    # Middle East countries (geographically in Asia)
    middle_east_countries = {
        'SA', 'IR', 'IQ', 'YE', 'OM', 'AE', 'QA', 'BH', 'KW', 'JO', 'SY', 'LB', 'IL', 'PS', 'CY', 'TR', 'EG'
    }

    if code in latam_countries:
        return 'latin_america'
    if code in middle_east_countries:
        return 'middle_east'

    try:
        cont_code = country_alpha2_to_continent_code(code)
        if cont_code == 'NA':
            return 'north_america'
        elif cont_code == 'SA':
            return 'latin_america'
        elif cont_code == 'AF':
            return 'africa'
        elif cont_code == 'AS':
            return 'asia'
        elif cont_code == 'EU':
            return 'europe'
        elif cont_code == 'OC':
            return 'oceania'
    except Exception:
        # Fallback for unrecognized territories or codes
        pass
        
    return 'world'

def process_map():
    print(f"Downloading SVG from {SVG_URL}...")
    response = requests.get(SVG_URL)
    if response.status_code != 200:
        print("Failed to download world map SVG.")
        return

    # Parse SVG content
    # Register namespaces to prevent prefixes like ns0:
    ET.register_namespace('', "http://www.w3.org/2000/svg")
    
    root = ET.fromstring(response.content)
    
    # Find all path elements in the SVG
    # In simple-world-map, paths are direct children of the root svg element
    paths = root.findall('.//{http://www.w3.org/2000/svg}path')
    print(f"Found {len(paths)} country paths.")

    # Create dictionary to hold elements for each continent
    continent_groups = {
        'world': [],
        'africa': [],
        'asia': [],
        'europe': [],
        'latin_america': [],
        'north_america': [],
        'oceania': [],
        'middle_east': []
    }

    # Build parent map to locate country groups (like <g id="au"> containing paths)
    parent_map = {child: parent for parent in root.iter() for child in parent}

    # Group each path by continent
    for path in paths:
        country_id = path.get('id', '')
        if not country_id:
            # Check if parent is a <g> tag with an id (e.g. country group)
            parent = parent_map.get(path)
            if parent is not None and parent.tag == '{http://www.w3.org/2000/svg}g':
                country_id = parent.get('id', '')
        
        if not country_id:
            # Check class name or other tags if id is not direct
            classes = path.get('class', '').split()
            if classes:
                country_id = classes[0]
                
        if country_id:
            continent = get_continent_id(country_id)
            # Add continent metadata as an attribute for frontend usage
            path.set('data-continent', continent)
            path.set('class', f"country {continent}")
            continent_groups[continent].append(path)
        else:
            continent_groups['world'].append(path)

    # Remove all original country paths from the root
    # Note: simple-world-map SVG structure has paths inside the root svg
    for child in list(root):
        if child.tag == '{http://www.w3.org/2000/svg}path':
            root.remove(child)

    # Re-insert paths wrapped in continent <g> tags
    for continent_id, group_paths in continent_groups.items():
        if not group_paths:
            continue
            
        # Create a new group <g> element for the continent
        g = ET.Element('{http://www.w3.org/2000/svg}g')
        g.set('id', continent_id)
        g.set('class', f"continent-group {continent_id}")
        
        # Add all paths to this group
        for path in group_paths:
            g.append(path)
            
        root.append(g)

    # Write out the new SVG file
    tree = ET.ElementTree(root)
    
    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    tree.write(OUTPUT_FILE, encoding='utf-8', xml_declaration=True)
    print(f"Successfully wrote grouped world map to {OUTPUT_FILE}")

if __name__ == "__main__":
    process_map()
