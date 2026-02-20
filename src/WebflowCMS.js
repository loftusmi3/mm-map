// Webflow CMS Integration Service
class WebflowCMS {
  constructor(apiToken = null, siteId = null) {
    this.apiToken = apiToken || window.WEBFLOW_API_TOKEN;
    this.siteId = siteId || window.WEBFLOW_SITE_ID;
    this.baseUrl = 'https://api.webflow.com';
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.pageSize = 100; // Webflow CMS default page limit
  }

  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  // Fetches all pages from a paginated Webflow CMS endpoint.
  // Webflow caps responses at 100 items; this loops with offset
  // until every item has been retrieved.
  async fetchAllPages(baseUrl) {
    const limit = this.pageSize;
    let offset = 0;
    let allItems = [];

    while (true) {
      const separator = baseUrl.includes('?') ? '&' : '?';
      const url = `${baseUrl}${separator}offset=${offset}&limit=${limit}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const items = data.items || data;

      if (!Array.isArray(items) || items.length === 0) {
        break;
      }

      allItems = allItems.concat(items);

      // Stop when response includes a total and we've collected them all
      if (data.total != null && allItems.length >= data.total) {
        break;
      }

      // Fewer items than the limit means we've hit the last page
      if (items.length < limit) {
        break;
      }

      offset += limit;
    }

    console.log(`Fetched ${allItems.length} total items from ${baseUrl}`);
    return allItems;
  }

  async fetchMonuments() {
    const cacheKey = 'monuments';
    const cachedData = this.getCachedData(cacheKey);

    if (cachedData) {
      console.log('Using cached monument data');
      return cachedData;
    }

    const monumentsUrl = 'https://mm1-fe52fb-7bc93d167bfbe6de86cc672332aa.webflow.io/api/api/monuments.json';

    try {
      const items = await this.fetchAllPages(monumentsUrl);

      const processedData = items.map(item => {
        const fieldData = item.fieldData || item;
        return {
          id: item.id || item._id,
          name: fieldData.name || fieldData.Name,
          status: fieldData.status || fieldData.Status,
          location: fieldData.location || fieldData.Location,
          coordinates: this.parseCoordinates(fieldData.locationcoords || fieldData.coordinates || fieldData.Location),
          description: this.stripHtml(fieldData.description || fieldData.Description || ''),
          year: fieldData.year || fieldData.Year,
          height: fieldData.height || fieldData.Height,
          builtBy: fieldData['built-by'] || fieldData['Built By'],
          fundedBy: fieldData['funded-by'] || fieldData['Funded By'],
          conceptualizedBy: fieldData['conceptualized-by'] || fieldData['Conceptualized By'],
          tags: this.parseTags(fieldData.tags || fieldData.Tags),
          link: fieldData['link-2'] || fieldData.link || fieldData.Link
        };
      });

      this.setCachedData(cacheKey, processedData);
      console.log(`Cached ${processedData.length} monuments`);
      return processedData;
    } catch (error) {
      console.error('Error fetching monuments from API:', error);
      return [];
    }
  }

  async fetchEcosystem() {
    const cacheKey = 'ecosystem';
    const cachedData = this.getCachedData(cacheKey);

    if (cachedData) {
      console.log('Using cached ecosystem data');
      return cachedData;
    }

    const ecosystemUrl = 'https://mm1-fe52fb-7bc93d167bfbe6de86cc672332aa.webflow.io/api/api/ecosystem.json';

    try {
      const items = await this.fetchAllPages(ecosystemUrl);

      const processedData = items.map(item => {
        const fieldData = item.fieldData || item;
        const mappedTypes = this.mapTypeAndCategory(fieldData.type, fieldData.category);

        return {
          id: item.id || item._id,
          name: fieldData.name || fieldData.Name,
          type: mappedTypes.type,
          category: mappedTypes.category,
          association: fieldData.association || fieldData.Association,
          location: fieldData.location || fieldData.Location,
          website: fieldData.website || fieldData.Website,
          description: this.stripHtml(fieldData.description || fieldData.Description || fieldData.notes || ''),
          tags: this.parseTags(fieldData.tags || fieldData.Tags)
        };
      });

      this.setCachedData(cacheKey, processedData);
      console.log(`Cached ${processedData.length} ecosystem items`);
      return processedData;
    } catch (error) {
      console.error('Error fetching ecosystem from API:', error);
      return [];
    }
  }

  // Helper method to strip HTML tags from text
  stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim();
  }

  // Helper method to map type and category IDs to readable names
  mapTypeAndCategory(typeId, categoryId) {
    const typeMap = {
      '4366ebc98f6a5310d65de8fa30194fc3': 'Concept',
      '22d312e5d5bdb036a439464ba7db1649': 'Program', 
      '6737f113b6ca753ef687b05fe225fb03': 'Organization',
      '1f06ba3b3460d24d4fc5a9514218ab36': 'Person'
    };

    const categoryMap = {
      '74d298c5fdf925022955774e728ae1f9': 'Concepts',
      '1c06d86c3ae633dbc20c19e1d1c254e4': 'Programs',
      '422c7e052591ecf49dad28dc44a1a4c5': 'Organizations',
      '51843361dbdbe24b3b64462d465f5a9f': 'Patrons',
      '75a13f4fd7c61b3339c61c0a7612c0d3': 'Founders'
    };

    return {
      type: typeMap[typeId] || 'Unknown',
      category: categoryMap[categoryId] || 'Unknown'
    };
  }

  // Helper method to parse coordinates from location string or coordinate field
  parseCoordinates(locationData) {
    if (!locationData) return null;
    
    // If it's already an array of coordinates
    if (Array.isArray(locationData) && locationData.length === 2) {
      return locationData;
    }
    
    // If it's a string with coordinates like "40.6892,-74.0445"
    if (typeof locationData === 'string' && locationData.includes(',')) {
      const coords = locationData.split(',').map(coord => parseFloat(coord.trim()));
      if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        return coords;
      }
    }
    
    // Fallback: try to geocode the location name
    return this.geocodeLocation(locationData);
  }

  // Simple geocoding fallback for common US locations
  geocodeLocation(location) {
    const commonLocations = {
      'New York, NY': [40.7128, -74.0060],
      'Washington, DC': [38.9072, -77.0369],
      'South Dakota': [43.9695, -99.9018],
      'California': [36.7783, -119.4179],
      'Texas': [31.9686, -99.9018],
      'Florida': [27.7663, -82.6404]
    };
    
    return commonLocations[location] || null;
  }

  // Helper method to parse tags (handles both arrays and comma-separated strings)
  parseTags(tags) {
    if (!tags) return [];
    
    if (Array.isArray(tags)) {
      return tags;
    }
    
    if (typeof tags === 'string') {
      return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    
    return [];
  }

}

export default WebflowCMS;