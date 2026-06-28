function App() {
  const releaseUrl = 'https://github.com/youssef67e7/carpooling-app-3/releases';
  const repoUrl = 'https://github.com/youssef67e7/carpooling-app-3';

  return (
    <>
      <Header repoUrl={repoUrl} releaseUrl={releaseUrl} />
      <Hero releaseUrl={releaseUrl} />
      <Features />
      <Download releaseUrl={releaseUrl} repoUrl={repoUrl} />
      <Tech />
      <Footer repoUrl={repoUrl} />
    </>
  );
}

/* ─── Header ─── */
function Header({ repoUrl, releaseUrl }) {
  return (
    <header className="header">
      <div className="container">
        <a href="/" className="logo">
          <span className="logo-mark">W</span>
          WERET
        </a>
        <nav className="header-actions">
          <a href="#features">Features</a>
          <a href="#download">Download</a>
          <a href={releaseUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Get the APK
          </a>
        </nav>
      </div>
    </header>
  );
}

/* ─── Hero ─── */
function Hero({ releaseUrl }) {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          Premium ride-hailing platform
        </div>
        <h1>
          Premium rides.<br /><span>Clear pricing.</span> Simple steps.
        </h1>
        <p>
          WERET connects passengers and drivers with simple booking and live tracking.
          Premium rides and delivery — clear pricing, simple steps.
        </p>
        <div className="hero-actions">
          <a href={releaseUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download APK
          </a>
          <a href="#features" className="btn btn-outline btn-lg">
            Explore features
          </a>
        </div>
        <div className="hero-visual">
          <HeroCard icon="🚗" title="Passenger" desc="Book rides, track live, pay from your wallet." />
          <HeroCard icon="🧑‍✈️" title="Driver" desc="Accept trips, earn fares, manage your schedule." />
          <HeroCard icon="⚙️" title="Admin" desc="Dashboard, moderation, dispute resolution." />
        </div>
      </div>
    </section>
  );
}

function HeroCard({ icon, title, desc }) {
  return (
    <div className="hero-card">
      <div className="hero-card-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}

/* ─── Features ─── */
const features = [
  { icon: '📍', title: 'Live Tracking', desc: 'Real-time GPS tracking for both passengers and drivers with route preview.' },
  { icon: '💳', title: 'Wallet System', desc: 'Deposits, withdrawals, transaction history, and multiple payment methods.' },
  { icon: '🛡️', title: 'Safety Module', desc: 'SOS emergency, trusted contacts, live trip sharing, and driver verification.' },
  { icon: '💬', title: 'In-App Chat', desc: 'Real-time messaging between passengers and drivers during trips.' },
  { icon: '⭐', title: 'Ratings & Reviews', desc: 'Rate your driver after each trip. Driver rating history and professionalism.' },
  { icon: '💰', title: 'Driver Earnings', desc: 'Bonus system, heatmap analytics, earnings summary, and break mode.' },
  { icon: '🚙', title: 'Carpool & Scheduled', desc: 'Find or schedule recurring carpools. Flexible ride options.' },
  { icon: '🏆', title: 'Promotions & Referrals', desc: 'Discount codes, referral rewards, and invite-friend programs.' },
  { icon: '🔧', title: 'Admin Panel', desc: 'User management, dispute resolution, transaction oversight, and audit logs.' },
];

function Features() {
  return (
    <section className="section section-alt" id="features">
      <div className="container">
        <span className="section-label">Everything you need</span>
        <h2>Built for passengers, drivers, and fleet operators</h2>
        <p className="section-sub">
          A full-stack ride-hailing platform with passenger, driver, and admin applications.
        </p>
        <div className="features">
          {features.map((f, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-card-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Download ─── */
function Download({ releaseUrl, repoUrl }) {
  return (
    <section className="section" id="download">
      <div className="container">
        <div className="download-grid">
          <div className="download-info">
            <span className="section-label">Get the app</span>
            <h2>Download WERET</h2>
            <p>
              Download the latest Android APK directly from GitHub Releases.
              iOS build available for development via Flutter.
            </p>
            <div className="download-buttons">
              <a href={releaseUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span className="btn-text">
                  <small>Download</small>
                  WERET APK v1.0.0
                </span>
              </a>
              <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                View on GitHub
              </a>
            </div>
            <p className="release-info">
              Latest release: <a href={releaseUrl} target="_blank" rel="noopener noreferrer">v1.0.0</a>
              {' · '}61 integration tests passing
            </p>
          </div>
          <div className="download-preview">
            <div className="mockup-phone">
              <span className="big">WERET</span>
              <span>Premium rides</span>
              <span style={{ fontSize: '0.8rem' }}>Clear pricing · Simple steps</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Tech Stack ─── */
const techs = ['Flutter', 'React Native', 'Node.js', 'Express', 'MongoDB', 'Firebase', 'Google Maps', 'WebSocket', 'REST API'];

function Tech() {
  return (
    <section className="section section-alt">
      <div className="container" style={{ textAlign: 'center' }}>
        <span className="section-label">Built with</span>
        <h2>Full-stack technology</h2>
        <p className="section-sub" style={{ margin: '0 auto 32px' }}>
          Flutter mobile app with Node.js backend, MongoDB, and real-time features.
        </p>
        <div className="tech-stack" style={{ justifyContent: 'center' }}>
          {techs.map((t, i) => <span className="tech-tag" key={i}>{t}</span>)}
        </div>
        <div className="stats">
          <div className="stat">
            <div className="stat-value">60+</div>
            <div className="stat-label">Integration tests</div>
          </div>
          <div className="stat">
            <div className="stat-value">10</div>
            <div className="stat-label">Screen modules</div>
          </div>
          <div className="stat">
            <div className="stat-value">2</div>
            <div className="stat-label">Platforms (iOS/Android)</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer({ repoUrl }) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <a href="/" className="logo">
            <span className="logo-mark">W</span>
            WERET
          </a>
          <div className="footer-links">
            <a href={repoUrl} target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href={repoUrl + '/releases'} target="_blank" rel="noopener noreferrer">Releases</a>
            <a href={repoUrl + '/issues'} target="_blank" rel="noopener noreferrer">Issues</a>
          </div>
          <p>&copy; {new Date().getFullYear()} WERET. Open source under MIT License.</p>
        </div>
      </div>
    </footer>
  );
}

export default App;
