const YF_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

async function fetchYF(range, interval) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/HRC=F?interval=${interval}&range=${range}`;
  const response = await fetch(url, { headers: YF_HEADERS });
  if (!response.ok) throw new Error(`Yahoo Finance returned ${response.status} for ${range}/${interval}`);
  const json = await response.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error('No data in Yahoo Finance response');

  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];

  return timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      close: closes[i] != null ? Math.round(closes[i] * 100) / 100 : null,
    }))
    .filter((d) => d.close !== null);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // daily (5y) for all standard views; monthly (max) for the Max tab
    const [daily, monthly] = await Promise.all([
      fetchYF('5y', '1d'),
      fetchYF('max', '1mo'),
    ]);

    return res.status(200).json({
      daily,   // ~1260 points, from ~2021 to today
      monthly, // ~179 points, from 2008 to today
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('hrc-data error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
