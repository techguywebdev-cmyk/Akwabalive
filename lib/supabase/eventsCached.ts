import { unstable_cache } from 'next/cache';
import { fetchPublishedEvents } from './events';

/**
 * All published events, kept for a minute on the server. Pages that render on every visit still get
 * them instantly; new or edited events show up within 60 seconds.
 */
export const fetchPublishedEventsCached = unstable_cache(() => fetchPublishedEvents(), ['published-events'], { revalidate: 60, tags: ['events'] });
