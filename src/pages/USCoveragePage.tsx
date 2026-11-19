import { useEffect, useState } from 'react'

type Filing = { form: string; filedDate: string; items: string[]; sourceUrl: string; accession: string }
type Issuer = { ticker: string; cik: string; companyName: string; filings: Filing[] }
type Coverage = { generatedAt: string; filedSince: string; universe: string; issuers: Issuer[] }

export function USCoveragePage() {
  const [data, setData] = useState<Coverage | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Issuer | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/data/us-filing-coverage.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('US filing coverage is awaiting its first successful refresh.')
        return response.json()
      })
      .then(setData)
      .catch((failure) => { if (!controller.signal.aborted) setError(String(failure.message)) })
    return () => controller.abort()
  }, [])
  const issuers = data?.issuers.filter((issuer) =>
    (issuer.companyName + ' ' + issuer.ticker).toLowerCase().includes(query.toLowerCase())) ?? []
  return (
    <section className="workspace-screen us-coverage">
      <header><h1>US governance research</h1>
        <p>{data ? data.issuers.length + ' issuers · SEC filing discovery · Updated ' + new Date(data.generatedAt).toLocaleDateString('en-GB') : 'Loading filing coverage'}</p>
        <p>Filing candidates await review for current CEO and Chair appointments, effective dates and voting outcomes.</p>
      </header>
      {error && <p role="alert">{error}</p>}
      <label className="radar-select"><span>Find company</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <div className="us-coverage__columns">
        <div className="us-coverage__list" aria-label="US issuers">
          {issuers.map((issuer) => <button type="button" key={issuer.cik} onClick={() => setSelected(issuer)} aria-pressed={selected?.cik === issuer.cik}>
            <strong>{issuer.companyName}</strong><span>{issuer.ticker} · {issuer.filings.length} filing candidates</span>
          </button>)}
        </div>
        <section className="us-coverage__filings" aria-label="SEC filing candidates">
          <h2>{selected?.companyName ?? 'Select a company'}</h2>
          {selected?.filings.map((filing) => <a key={filing.accession} href={filing.sourceUrl} target="_blank" rel="noreferrer">
            {filing.form} · {filing.filedDate} · {filing.items.length ? 'Items ' + filing.items.join(', ') : 'Proxy materials'}
          </a>)}
        </section>
      </div>
    </section>
  )
}
