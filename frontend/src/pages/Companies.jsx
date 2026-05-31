import '../styles/Companies.css'

const COMPANIES = [
  {
    id: 1,
    name: 'Google',
    logo: 'https://logo.clearbit.com/google.com',
    careersUrl: 'https://www.google.com/about/careers/applications/jobs/results',
    searchUrl: 'https://www.google.com/about/careers/applications/jobs/results?q=Software%20Engineer&location=United%20States&hl=en&target_level=EARLY&target_level=MID&degree=BACHELORS&degree=MASTERS&employment_type=FULL_TIME&sort_by=date',
    hq: 'Mountain View, CA',
    desc: 'Search, Cloud, YouTube, Android, and more — building for everyone.',
    accent: '#1a73e8',
    bg: '#e8f4fe',
  },
  {
    id: 2,
    name: 'Meta',
    logo: 'https://logo.clearbit.com/meta.com',
    careersUrl: 'https://www.metacareers.com/jobsearch',
    searchUrl: 'https://www.metacareers.com/jobsearch?teams[0]=Software%20Engineering&teams[1]=University%20Grad%20-%20Engineering%2C%20Tech%20%26%20Design&offices[0]=Austin%2C%20TX&offices[1]=Bellevue%2C%20WA&offices[2]=Boston%2C%20MA&offices[3]=Burlingame%2C%20CA&offices[4]=Chicago%2C%20IL&offices[5]=Washington%2C%20DC&offices[6]=Sunnyvale%2C%20CA&offices[7]=Seattle%2C%20WA&offices[8]=Santa%20Clara%2C%20CA&offices[9]=Irvine%2C%20CA&roles[0]=Full%20time%20employment&sort_by_new=true',
    hq: 'Menlo Park, CA',
    desc: 'Social platforms, VR/AR, and AI connecting billions of people.',
    accent: '#0082fb',
    bg: '#eef6ff',
  },
  {
    id: 3,
    name: 'Amazon',
    logo: 'https://logo.clearbit.com/amazon.com',
    careersUrl: 'https://www.amazon.jobs',
    searchUrl: 'https://www.amazon.jobs/en/search?offset=0&result_limit=10&sort=recent&category[]=software-development&job_type[]=Full-Time&country[]=USA&distanceType=Mi&radius=24km&loc_group_id=seattle-metro&loc_query=Greater+Seattle+Area%2C+WA%2C+United+States&base_query=',
    hq: 'Seattle, WA',
    desc: 'AWS, Marketplace, Alexa, and logistics at global scale.',
    accent: '#e07b00',
    bg: '#fff8eb',
  },
  {
    id: 4,
    name: 'Microsoft',
    logo: 'https://logo.clearbit.com/microsoft.com',
    careersUrl: 'https://apply.careers.microsoft.com/careers',
    searchUrl: 'https://apply.careers.microsoft.com/careers?start=0&location=United+States%2C+Multiple+Locations%2C+Multiple+Locations&sort_by=timestamp&filter_include_remote=1&filter_career_discipline=Software+Engineering%2CData+Science&filter_employment_type=full-time&filter_profession=software+engineering&filter_seniority=Mid-Level%2CEntry',
    hq: 'Redmond, WA',
    desc: 'Azure, Office 365, Xbox, GitHub, and AI across every industry.',
    accent: '#00a4ef',
    bg: '#e5f7fd',
  },
  {
    id: 5,
    name: 'Apple',
    logo: 'https://logo.clearbit.com/apple.com',
    careersUrl: 'https://jobs.apple.com/en-us/search',
    searchUrl: 'https://jobs.apple.com/en-us/search?location=united-states-USA&team=apps-and-frameworks-SFTWR-AF+cloud-and-infrastructure-SFTWR-CLD+information-systems-and-technology-SFTWR-ISTECH&page=1',
    hq: 'Cupertino, CA',
    desc: 'iPhone, Mac, iPad, visionOS — crafting best-in-class hardware and software.',
    accent: '#6e3de8',
    bg: '#f3effe',
  },
]

export default function Companies() {
  return (
    <div className="companies-container">
      <div className="companies-header">
        <div>
          <h1 className="companies-title">Companies</h1>
          <p className="companies-subtitle">
            Tracked career pages
            <span className="companies-count-pill">{COMPANIES.length} configured</span>
          </p>
        </div>
        <span className="companies-admin-badge">⚙ Admin Only</span>
      </div>

      <div className="companies-grid">
        {COMPANIES.map((c) => (
          <div
            key={c.id}
            className="company-card"
            style={{ '--accent': c.accent, '--bg': c.bg }}
          >
            <div className="company-card-top">
              <div className="company-logo-wrap">
                <img
                  src={c.logo}
                  alt={`${c.name} logo`}
                  className="company-logo"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              </div>
              <div className="company-info">
                <h2 className="company-name">{c.name}</h2>
                <span className="company-hq">📍 {c.hq}</span>
              </div>
              <span className="company-id-badge">#{c.id}</span>
            </div>

            <p className="company-desc">{c.desc}</p>

            <div className="company-divider" />

            <div className="company-actions">
              <a
                href={c.careersUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="company-btn company-btn--primary"
              >
                Careers Page ↗
              </a>
              <a
                href={c.searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="company-btn company-btn--secondary"
              >
                Job Search ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
