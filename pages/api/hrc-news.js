const FEEDS = [
  {
    label: 'HRC Steel',
    url: 'https://news.google.com/rss/search?q=hot+rolled+coil+steel+price&hl=en-US&gl=US&ceid=US:en',
  },
  {
    label: 'Steel Market',
    url: 'https://news.google.com/rss/search?q=steel+futures+market+price&hl=en-US&gl=US&ceid=US:en',
  },
  {
    label: 'Tariffs & Trade',
    url: 'https://news.google.com/rss/search?q=steel+tariff+trade+2025&hl=en-US&gl=US&ceid=US:en',
  },
];

function parseItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(block) ||
                   /<title>(.*?)<\/title>/.exec(block) || [])[1] || '';
    const link  = (/<link>(.*?)<\/link>/.exec(block) || [])[1] || '';
    const pubDate = (/<pubDate>(.*?)<\/pubDate>/.exec(block) || [])[1] || '';
    const source = (/<source[^>]*>(.*?)<\/source>/.exec(block) || [])[1] || '';
    const cleanTitle = title.replace(/ - [^-]+$/, '').trim();
    if (cleanTitle && link) {
      items.push({
        title: cleanTitle,
        link,
        source: source.trim(),
        pubDate: pubDate ? new Date(pubDate).toISOString() : null,
      });
    }
  }
  return items;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const results = await Promise.allSettled(
      FEEDS.map((f) =>
        fetch(f.url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
          .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
          .then((xml) => ({ label: f.label, items: parseItems(xml) }))
      )
    );

    const seen = new Set();
    const all = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        for (const item of r.value.items) {
          if (!seen.has(item.link)) {
            seen.add(item.link);
            all.push({ ...item, feed: r.value.label });
          }
        }
      }
    }
    all.sort((a, b) => {
      if (!a.pubDate) return 1;
      if (!b.pubDate) return -1;
      return b.pubDate.localeCompare(a.pubDate);
    });

    return res.status(200).json({ news: all.slice(0, 20), fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('hrc-news error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
