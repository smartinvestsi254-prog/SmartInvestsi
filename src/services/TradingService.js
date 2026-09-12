export async function executeSpotTrade(symbol, side, amount, userToken) {
  try {
    const response = await fetch('/.netlify/functions/spot-trade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        symbol,
        side,
        amount,
        type: 'MARKET'
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Trade failed');
    }

    return result;
  } catch (error) {
    console.error('Trade error:', error.message);
    throw error; // Re-throw so your UI component can show errors gracefully
  }
}
