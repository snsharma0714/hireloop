// Tiny in-memory limiter for public forms (one server instance, so memory is enough)
const hits = new Map()

export const tooManyRequests = (key, limit, windowMs) => {
    const now = Date.now()
    const recent = (hits.get(key) || []).filter(t => now - t < windowMs)
    if (recent.length >= limit) {
        hits.set(key, recent)
        return true
    }
    recent.push(now)
    hits.set(key, recent)
    // forget idle keys now and then so the map can't grow forever
    if (hits.size > 5000) for (const [k, list] of hits) if (!list.some(t => now - t < windowMs)) hits.delete(k)
    return false
}
