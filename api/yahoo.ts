// This file should be placed at /api/yahoo.ts in your project root
// It creates a Vercel Serverless Function that acts as a proxy to the Yahoo Finance API.

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Cache the crumb and cookie to reuse them across requests (serverless instances might reuse this)
let cachedCrumb: string | null = null;
let cachedCookie: string | null = null;

async function getCrumbAndCookie() {
  if (cachedCrumb && cachedCookie) {
    return { crumb: cachedCrumb, cookie: cachedCookie };
  }

  try {
    // 1. Get a cookie by visiting a Yahoo Finance page
    // Try finance.yahoo.com first as it's more reliable than fc.yahoo.com in some environments
    let cookie: string | null = null;

    const urls = ['https://finance.yahoo.com', 'https://fc.yahoo.com'];

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        cookie = response.headers.get('set-cookie');
        if (cookie) break;
      } catch (e) {
        console.warn(`Failed to fetch cookie from ${url}`, e);
      }
    }

    if (!cookie) {
      console.warn('Failed to fetch cookie from any source. Proceeding without auth.');
      return { crumb: null, cookie: null };
    }

    // 2. Get the crumb using the cookie
    const crumbResponse = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const crumb = await crumbResponse.text();
    if (!crumb) {
      console.warn('Failed to fetch crumb. Proceeding without auth.');
      return { crumb: null, cookie: null };
    }

    cachedCrumb = crumb;
    cachedCookie = cookie;

    return { crumb, cookie };

  } catch (error) {
    console.error('Error fetching crumb/cookie:', error);
    // Return nulls to allow fallback to unauthenticated request
    return { crumb: null, cookie: null };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers to allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { ticker, startDate, endDate, type } = req.query;

  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid query parameter: ticker is required.' });
  }

  try {
    // Get authentication (crumb & cookie)
    const { crumb, cookie } = await getCrumbAndCookie();

    let yahooUrl = '';

    if (type === 'options') {
      // Fetch option chain data
      const dateParam = req.query.date ? `&date=${req.query.date}` : '';
      // Actually, if no crumb, we shouldn't add the param.
      // URL structure: .../options/ticker?crumb=...&date=... OR .../options/ticker?date=...

      const queryParams = [];
      if (crumb) queryParams.push(`crumb=${crumb}`);
      if (req.query.date) queryParams.push(`date=${req.query.date}`);

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      yahooUrl = `https://query1.finance.yahoo.com/v7/finance/options/${ticker}${queryString}`;
    } else {
      // Default to historical data (chart)
      if (!startDate || typeof startDate !== 'string' || !endDate || typeof endDate !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid query parameters: startDate and endDate are required for historical data.' });
      }
      const period1 = Math.floor(new Date(startDate).getTime() / 1000);
      const period2 = Math.floor(new Date(endDate).getTime() / 1000);

      if (isNaN(period1) || isNaN(period2)) {
        return res.status(400).json({ error: 'Invalid date format provided.' });
      }

      const crumbParam = crumb ? `&crumb=${crumb}` : '';
      yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1d&events=history${crumbParam}`;
    }

    // Fetch data from Yahoo Finance API from the server-side
    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const yahooResponse = await fetch(yahooUrl, { headers });

    if (!yahooResponse.ok) {
      const errorText = await yahooResponse.text();
      console.error(`Yahoo Finance API error for ${ticker}: ${yahooResponse.status} ${errorText}`);
      // If unauthorized, maybe clear cache and retry? For now just return error.
      if (yahooResponse.status === 401) {
        cachedCrumb = null;
        cachedCookie = null;
      }
      return res.status(yahooResponse.status).json({ error: `Yahoo Finance API request failed with status: ${yahooResponse.status}`, details: errorText });
    }

    const data = await yahooResponse.json();

    // Send the successful response back to the client
    return res.status(200).json(data);

  } catch (error) {
    console.error(`Internal server error for ticker ${ticker}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ error: 'Internal server error while fetching data from Yahoo Finance.', details: errorMessage });
  }
}
