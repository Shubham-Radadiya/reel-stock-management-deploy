import React from 'react';
import { Leaf, FlaskConical, Sparkles, Users } from 'lucide-react';
import './LoginAbout.css';

const EXPERTISE = [
  { icon: FlaskConical, label: 'Fermentation-derived actives' },
  { icon: Sparkles, label: 'Multifunctional ingredients' },
  { icon: Leaf, label: 'Performance materials' }
];

const APPLICATIONS = ['Skincare', 'Haircare', 'Wellness', 'Clean beauty'];

const LoginAbout = () => (
  <aside className="login-about" aria-labelledby="login-about-heading">
    <div className="login-about-inner">
      <p className="login-about-kicker">About</p>
      <h2 id="login-about-heading" className="login-about-title">
        Who We Are
      </h2>
      <p className="login-about-tagline">
        Specialists in <span className="login-about-highlight">Sustainable</span> Active Ingredient
        Solutions
      </p>

      <p className="login-about-brand" aria-label="Company name">
        PINEXA
      </p>

      <div className="login-about-copy">
        <p>
          PINEXA is a next-generation ingredient supplier focused on sustainable personal care
          ingredients. We work closely with global product manufacturers, formulation teams, and
          personal care brands to deliver high-purity ingredients backed by technical support and
          reliable supply.
        </p>
        <p>
          Our expertise lies in fermentation-derived actives, multifunctional ingredients, and
          innovative performance materials for skincare, haircare, wellness, and clean beauty
          applications.
        </p>
      </div>

      <ul className="login-about-expertise" aria-label="Areas of expertise">
        {EXPERTISE.map(({ icon: Icon, label }) => (
          <li key={label} className="login-about-expertise-item">
            <span className="login-about-expertise-icon" aria-hidden="true">
              <Icon size={16} strokeWidth={2} />
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ul>

      <div className="login-about-apps" aria-label="Applications">
        {APPLICATIONS.map((app) => (
          <span key={app} className="login-about-app-pill">
            {app}
          </span>
        ))}
      </div>

      <blockquote className="login-about-closing">
        <Users size={18} className="login-about-closing-icon" aria-hidden="true" />
        <p>
          We bridge the gap between advanced ingredient innovation and commercial scalability through
          long-term partnerships.
        </p>
      </blockquote>
    </div>
  </aside>
);

export default LoginAbout;
