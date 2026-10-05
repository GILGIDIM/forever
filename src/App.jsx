import React, { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { poolLabel } from './format.js';
import PoolView from './components/PoolView.jsx';
import NewPoolForm from './components/NewPoolForm.jsx';

// Routes: "/"            your pools (signed in) or the sign-in page
//         "/u/<handle>"  someone's public pools, read-only
//         "?pool=<id>"   which pool tab is open on either page
function useRoute() {
  const read = () => {
    const m = window.location.pathname.match(/^\/u\/([^/]+)/);
    const pool = new URLSearchParams(window.location.search).get('pool');
    return { handle: m ? decodeURIComponent(m[1]) : null, pool: pool ? Number(pool) : null };
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);
  const go = useCallback((path) => { window.history.pushState(null, '', path); setRoute(read()); }, []);
  return [route, go];
}

const SIGNIN_ERRORS = {
  cancelled: 'Sign-in was cancelled.',
  expired: 'That sign-in link expired. Try again.',
  token: "Battle.net didn't accept the sign-in. Try again.",
  userinfo: "Battle.net didn't return your BattleTag. Try again.",
};

function Header({ me, onSignOut, go }) {
  return (
    <header className="site-head">
      <a className="brand" href="/" onClick={(e) => { e.preventDefault(); go('/'); }}>
        <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
          <path d="M16 3l10 5.5v8.5c0 5.6-4.3 10-10 12-5.7-2-10-6.4-10-12V8.5z" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M11 11h10M11 11v11M11 16h7" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
        <span>Forever Tracker</span>
      </a>
      <div className="site-user">
        {me?.user ? (
          <>
            <span className="battletag">{me.user.battletag}</span>
            <button type="button" className="btn ghost small" onClick={onSignOut}>Sign out</button>
          </>
        ) : me ? (
          <a className="btn small" href="/api/auth/login">Sign in with Battle.net</a>
        ) : null}
      </div>
    </header>
  );
}

function PoolTabs({ pools, activeId, onPick, onNew }) {
  return (
    <nav className="pool-tabs" aria-label="Character pools">
      {pools.map((p) => (
        <button type="button" key={p.id} className={`tab ${p.id === activeId ? 'on' : ''}`}
          aria-current={p.id === activeId ? 'page' : undefined} onClick={() => onPick(p.id)}>
          {poolLabel(p)} <span className="tab-count">{p.characterCount}</span>
        </button>
      ))}
      {onNew && <button type="button" className="tab tab-new" onClick={onNew}>New pool</button>}
    </nav>
  );
}

function Landing({ me }) {
  const signinError = new URLSearchParams(window.location.search).get('signin');
  return (
    <main className="landing">
      <h1>Plan your characters for World of Warcraft: Forever.</h1>
      <p>Keep every character you mean to level in one list: faction, race and class, names, levels and professions, with your main at the top.
        Your brothers get a read-only link; they sign in to keep their own.</p>
      {signinError && <p className="status status-error" role="alert">{SIGNIN_ERRORS[signinError] || 'Sign-in failed. Try again.'}</p>}
      <a className="btn primary large" href="/api/auth/login">Sign in with Battle.net</a>
      {me.devLogin && (
        <p className="hint">Local development: <a href="/api/auth/dev?as=Gilgidim%231234">sign in as a test user</a>.</p>
      )}
    </main>
  );
}

function MyPools({ me, route, go }) {
  const [pools, setPools] = useState(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.myPools().then((d) => setPools(d.pools)); }, []);

  if (!pools) return <p className="hint pad">Loading…</p>;

  const create = async (region, ruleset) => {
    setBusy(true);
    try {
      const { pool } = await api.createPool(region, ruleset);
      setPools((prev) => (prev.some((p) => p.id === pool.id) ? prev : [...prev, pool]));
      setCreating(false);
      go(`/?pool=${pool.id}`);
    } finally { setBusy(false); }
  };

  if (pools.length === 0 || creating) {
    return (
      <main className="start">
        <h1>{pools.length === 0 ? 'Where will you be playing?' : 'New character pool'}</h1>
        <p className="muted">Each region and ruleset gets its own pool, so you can plan a Hardcore set separately from your PvP characters.</p>
        <NewPoolForm existing={pools} onCreate={create} busy={busy} onCancel={pools.length ? () => setCreating(false) : null} />
      </main>
    );
  }

  const active = pools.find((p) => p.id === route.pool) || pools[0];
  return (
    <main>
      <PoolTabs pools={pools} activeId={active.id} onPick={(id) => go(`/?pool=${id}`)} onNew={() => setCreating(true)} />
      <PoolView key={active.id} poolId={active.id} me={me} apiAvailable={me.apiAvailable} />
    </main>
  );
}

function SharedPools({ handle, route, go, me }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { api.userPools(handle).then(setData).catch(setError); }, [handle]);

  if (error) return <main className="landing"><p className="status status-error">{error.message}</p></main>;
  if (!data) return <p className="hint pad">Loading…</p>;
  if (data.pools.length === 0) {
    return <main className="landing"><p>{data.owner.battletag.split('#')[0]} hasn't shared any character pools.</p></main>;
  }
  const active = data.pools.find((p) => p.id === route.pool) || data.pools[0];
  return (
    <main>
      <PoolTabs pools={data.pools} activeId={active.id}
        onPick={(id) => go(`/u/${encodeURIComponent(handle)}?pool=${id}`)} />
      <PoolView key={active.id} poolId={active.id} me={me} apiAvailable={me.apiAvailable} />
      {!me.user && (
        <p className="hint pad">Want your own list? <a href="/api/auth/login">Sign in with Battle.net</a>.</p>
      )}
    </main>
  );
}

export default function App() {
  const [route, go] = useRoute();
  const [me, setMe] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { api.me().then(setMe).catch(setError); }, []);

  const signOut = async () => { await api.logout(); window.location.href = '/'; };

  let body;
  if (error) body = <main className="landing"><p className="status status-error">Couldn't reach the server: {error.message}</p></main>;
  else if (!me) body = <p className="hint pad">Loading…</p>;
  else if (route.handle) body = <SharedPools handle={route.handle} route={route} go={go} me={me} />;
  else if (!me.user) body = <Landing me={me} />;
  else body = <MyPools me={me} route={route} go={go} />;

  return (
    <div className="app">
      <Header me={me} onSignOut={signOut} go={go} />
      {body}
      <footer className="site-foot">
        <p>Fan-made planner. World of Warcraft and Blizzard are trademarks of Blizzard Entertainment.</p>
      </footer>
    </div>
  );
}
