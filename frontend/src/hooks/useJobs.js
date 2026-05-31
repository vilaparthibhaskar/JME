import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../services/api'

const PER_PAGE = 12

/**
 * Fetches jobs via a single aggregated backend call (GET /api/jobs).
 * The backend fetches from each company's ATS in parallel, merges,
 * filters, and paginates. This hook handles client-side page tracking,
 * result accumulation, and IntersectionObserver for infinite scroll.
 *
 * @param {object}      params
 * @param {Set<number>} params.selectedCompanyIds
 * @param {string}      params.dateFilter   'All' | 'Today' | 'This Week' | 'Custom'
 * @param {string}      params.dateFrom     ISO date string (used when Custom)
 * @param {string}      params.dateTo       ISO date string (used when Custom)
 * @param {string}      params.jobSearch    free-text filter
 *
 * @returns {{ jobs, loading, hasMore, totalCount, sentinelRef }}
 */
export function useJobs({ selectedCompanyIds, dateFilter, dateFrom, dateTo, jobSearch }) {
  const [jobs, setJobs]          = useState([])
  const [loading, setLoading]    = useState(false)   // true only when NO jobs are shown yet
  const [refreshing, setRefreshing] = useState(false) // true when stale cache is shown, fresh in progress
  const [hasMore, setHasMore]    = useState(false)
  const [totalCount, setTotal]   = useState(0)

  const pageRef     = useRef(1)
  const sentinelRef = useRef(null)
  const observerRef = useRef(null)
  // Monotonically-increasing counter — stale responses are discarded
  const fetchIdRef  = useRef(0)

  // Serialize Set → stable string for useEffect dependency comparison
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const companyKey = [...selectedCompanyIds].sort().join(',')

  // ── Core fetch ──────────────────────────────────────────────────────────────
  const fetchPage = useCallback(async (page, append) => {
    if (selectedCompanyIds.size === 0) {
      if (!append) { setJobs([]); setHasMore(false); setTotal(0) }
      return
    }

    if (!append) fetchIdRef.current += 1
    const myId = fetchIdRef.current

    const today   = new Date().toISOString().slice(0, 10)
    const weekAgo = (() => {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      return d.toISOString().slice(0, 10)
    })()

    const resolvedDateFrom =
      dateFilter === 'Today'     ? today   :
      dateFilter === 'This Week' ? weekAgo :
      dateFilter === 'Custom'    ? dateFrom : ''

    const resolvedDateTo =
      dateFilter === 'Today'  ? today   :
      dateFilter === 'Custom' ? dateTo  : ''

    const baseParams = {
      companyIds: [...selectedCompanyIds],
      page,
      perPage:  PER_PAGE,
      search:   jobSearch,
      dateFrom: resolvedDateFrom,
      dateTo:   resolvedDateTo,
    }

    setLoading(true)

    // ── Phase 1: show cached jobs instantly (page-1 fresh fetches only) ──────
    if (!append && page === 1) {
      try {
        const cached = await api.getJobs({ ...baseParams, useCache: true })
        if (myId !== fetchIdRef.current) return  // superseded
        if (cached.jobs.length > 0) {
          setJobs(cached.jobs)
          setHasMore(cached.has_more)
          setTotal(cached.total)
          pageRef.current = page
          setLoading(false)     // hide full-page spinner — cached jobs are visible
          setRefreshing(true)   // show subtle "refreshing" indicator
        }
      } catch (_) { /* cache miss — fall through to loading spinner */ }
    }

    // ── Phase 2: fresh scrape ─────────────────────────────────────────────────
    try {
      // For load-more (append) we still want the cache since the fresh data was
      // already fetched and stored on page 1 of this session.
      const useCache = append
      const data = await api.getJobs({ ...baseParams, useCache })
      if (myId !== fetchIdRef.current) return   // superseded — discard
      setJobs(prev => append ? [...prev, ...data.jobs] : data.jobs)
      setHasMore(data.has_more)
      setTotal(data.total)
      pageRef.current = page
    } catch (e) {
      if (myId !== fetchIdRef.current) return
      console.error('Failed to fetch jobs:', e)
    } finally {
      if (myId === fetchIdRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [selectedCompanyIds, dateFilter, dateFrom, dateTo, jobSearch])

  // ── Refetch on filter / company change ──────────────────────────────────────
  useEffect(() => {
    pageRef.current = 1
    fetchPage(1, false)
  // companyKey is the serialized form of selectedCompanyIds
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyKey, dateFilter, dateFrom, dateTo, jobSearch])

  // ── Load next page ──────────────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchPage(pageRef.current + 1, true)
    }
  }, [loading, hasMore, fetchPage])

  // ── IntersectionObserver: trigger loadMore when sentinel enters viewport ────
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    if (!sentinelRef.current || !hasMore || loading) return

    observerRef.current = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { threshold: 0.1 }
    )
    observerRef.current.observe(sentinelRef.current)

    return () => observerRef.current?.disconnect()
  }, [hasMore, loading, loadMore])

  return { jobs, loading, refreshing, hasMore, totalCount, sentinelRef }
}

