const https = require('https');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' }),
    };
  }

  return new Promise((resolve) => {
    const url =
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,cardano&vs_currencies=usd&include_market_cap=true&include_24hr_change=true';

    https
      .get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsedData = JSON.parse(data);

            // Transform the data into a more usable format
            const cryptoData = {
              bitcoin: {
                name: 'Bitcoin',
                symbol: 'BTC',
                price: parsedData.bitcoin.usd,
                change_24h: parsedData.bitcoin.usd_24h_change,
              },
              ethereum: {
                name: 'Ethereum',
                symbol: 'ETH',
                price: parsedData.ethereum.usd,
                change_24h: parsedData.ethereum.usd_24h_change,
              },
              solana: {
                name: 'Solana',
                symbol: 'SOL',
                price: parsedData.solana.usd,
                change_24h: parsedData.solana.usd_24h_change,
              },
              cardano: {
                name: 'Cardano',
                symbol: 'ADA',
                price: parsedData.cardano.usd,
                change_24h: parsedData.cardano.usd_24h_change,
              },
            };

            resolve({
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                data: cryptoData,
                timestamp: new Date().toISOString(),
              }),
            });
          } catch (error) {
            console.error('JSON Parse Error:', error);
            resolve({
              statusCode: 500,
              headers,
              body: JSON.stringify({
                success: false,
                error: 'Failed to parse API response',
              }),
            });
          }
        });
      })
      .on('error', (error) => {
        console.error('API Request Error:', error);
        resolve({
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Failed to fetch cryptocurrency data',
          }),
        });
      });
  });
};