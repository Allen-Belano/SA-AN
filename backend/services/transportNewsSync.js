const DEFAULT_TRANSPORT_NEWS_FEEDS = [
    {
        url: 'https://news.google.com/rss/search?q=Philippines+public+transport+fare+OR+jeepney+strike+OR+libreng+sakay&hl=en-PH&gl=PH&ceid=PH:en',
        source: 'Google News Philippines',
    },
    {
        url: 'https://news.google.com/rss/search?q=LTFRB+fare+matrix+OR+PUV+modernization+OR+MRT+LRT+advisory&hl=en-PH&gl=PH&ceid=PH:en',
        source: 'Google News PH Transport Watch',
    },
];

const TRANSPORT_KEYWORDS = [
    'fare',
    'libreng sakay',
    'jeepney',
    'strike',
    'mrt',
    'lrt',
    'transport',
    'commute',
    'bus',
    'uv express',
    'rail',
    'terminal',
    'ltfrb',
    'doTr'.toLowerCase(),
    'traffic rerouting',
];

const decodeXmlEntities = (value = '') => value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const extractTag = (itemXml, tagName) => {
    const match = itemXml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
    return decodeXmlEntities(match?.[1] || '');
};

const toIsoDateOrNull = (value) => {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toISOString();
};

const classifyCategory = (text) => {
    const normalized = text.toLowerCase();

    if (/fare|taripa|matrix|libreng sakay|price|pamasahe/.test(normalized)) {
        return 'fare';
    }

    if (/strike|transport holiday|welga/.test(normalized)) {
        return 'strike';
    }

    if (/suspend|service|maintenance|rerout|closure|delay|advisory/.test(normalized)) {
        return 'service';
    }

    return 'advisory';
};

const inferPriority = (title, summary) => {
    const normalized = `${title} ${summary}`.toLowerCase();

    if (/strike|welga|suspend|shutdown|closed/.test(normalized)) {
        return 96;
    }

    if (/libreng sakay|fare|pamasahe|matrix/.test(normalized)) {
        return 90;
    }

    if (/delay|rerout|advisory|maintenance/.test(normalized)) {
        return 78;
    }

    return 65;
};

const isTransportRelated = (title, summary) => {
    const text = `${title} ${summary}`.toLowerCase();
    return TRANSPORT_KEYWORDS.some((keyword) => text.includes(keyword));
};

const parseRssItems = (xmlPayload) => {
    const matches = xmlPayload.match(/<item[\s\S]*?<\/item>/gi) || [];

    return matches.map((itemXml) => {
        const title = extractTag(itemXml, 'title');
        const summary = extractTag(itemXml, 'description');
        const sourceLabel = extractTag(itemXml, 'source');
        const link = extractTag(itemXml, 'link');
        const guid = extractTag(itemXml, 'guid') || link;
        const pubDate = toIsoDateOrNull(extractTag(itemXml, 'pubDate'));

        return {
            title,
            summary,
            link,
            guid,
            sourceLabel,
            pubDate,
        };
    });
};

const syncTransportNews = async (pool, options = {}) => {
    const feeds = options.feeds || DEFAULT_TRANSPORT_NEWS_FEEDS;
    const perFeedLimit = Number.isInteger(options.perFeedLimit)
        ? Math.min(Math.max(options.perFeedLimit, 1), 20)
        : 8;

    let insertedCount = 0;
    let updatedCount = 0;
    let scannedCount = 0;

    for (const feed of feeds) {
        try {
            const response = await fetch(feed.url, {
                headers: {
                    'User-Agent': 'SAAN-TransportNewsBot/1.0',
                    Accept: 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
                },
            });

            if (!response.ok) {
                continue;
            }

            const xmlPayload = await response.text();
            const items = parseRssItems(xmlPayload)
                .filter((item) => item.title && item.guid)
                .filter((item) => isTransportRelated(item.title, item.summary))
                .slice(0, perFeedLimit);

            scannedCount += items.length;

            for (const item of items) {
                const title = item.title.slice(0, 255);
                const details = (item.summary || item.title).slice(0, 1800);
                const category = classifyCategory(`${item.title} ${item.summary}`);
                const priority = inferPriority(item.title, item.summary);
                const sourceLabel = (item.sourceLabel || feed.source || 'External Transit Feed').slice(0, 120);

                const upsertResult = await pool.query(
                    `INSERT INTO TransitNews (
                        title,
                        details,
                        category,
                        source_label,
                        source_url,
                        published_at,
                        external_id,
                        is_active,
                        priority
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8)
                    ON CONFLICT (external_id)
                    DO UPDATE SET
                        title = EXCLUDED.title,
                        details = EXCLUDED.details,
                        category = EXCLUDED.category,
                        source_label = EXCLUDED.source_label,
                        source_url = EXCLUDED.source_url,
                        published_at = EXCLUDED.published_at,
                        priority = GREATEST(TransitNews.priority, EXCLUDED.priority),
                        is_active = TRUE
                    RETURNING (xmax = 0) AS inserted`,
                    [
                        title,
                        details,
                        category,
                        sourceLabel,
                        item.link || null,
                        item.pubDate,
                        item.guid,
                        priority,
                    ]
                );

                if (upsertResult.rows[0]?.inserted) {
                    insertedCount += 1;
                } else {
                    updatedCount += 1;
                }
            }
        } catch {
            // Ignore single-feed failures so other feeds can still sync.
        }
    }

    return {
        feeds: feeds.length,
        scanned: scannedCount,
        inserted: insertedCount,
        updated: updatedCount,
    };
};

const startTransportNewsScheduler = (pool) => {
    const intervalMs = 30 * 60 * 1000;

    const runSync = async () => {
        const result = await syncTransportNews(pool);
        if (result.inserted > 0 || result.updated > 0) {
            console.log(
                `[TransitNews] synced ${result.scanned} items (${result.inserted} inserted, ${result.updated} updated)`
            );
        }
    };

    runSync();
    const timerId = setInterval(runSync, intervalMs);

    return timerId;
};

module.exports = {
    syncTransportNews,
    startTransportNewsScheduler,
    DEFAULT_TRANSPORT_NEWS_FEEDS,
};
