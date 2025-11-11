// This file should be placed at /api/yahoo.ts in your project root
// It creates a Vercel Serverless Function that acts as a proxy to the Yahoo Finance API.

import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  const { ticker, startDate, endDate } = req.query;

  if (!ticker || typeof ticker !== 'string' || !startDate || typeof startDate !== 'string' || !endDate || typeof endDate !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid query parameters: ticker, startDate, endDate are required.' });
  }

  try {
    const period1 = Math.floor(new Date(startDate).getTime() / 1000);
    const period2 = Math.floor(new Date(endDate).getTime() / 1000);

    if (isNaN(period1) || isNaN(period2)) {
      return res.status(400).json({ error: 'Invalid date format provided.' });
    }

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1d`;

    // Fetch data from Yahoo Finance API from the server-side
    const yahooResponse = await fetch(yahooUrl, {
      headers: {
        // Adding a user-agent can sometimes help avoid being blocked
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!yahooResponse.ok) {
      const errorText = await yahooResponse.text();
      console.error(`Yahoo Finance API error for ${ticker}: ${yahooResponse.status} ${errorText}`);
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
