import logo from '@/assests/logo.png';
import './HeroPanel.scss';

function HeroPanel({ logoSrc = logo, logoAlt = 'PeoplePay360 Logo', title, subtitle }) {
    return (
        <aside className="hero-panel" aria-label="Brand introduction">
            <div className="hero-content">
                <div className="hero-logo-wrapper">
                    <img src={logoSrc} alt={logoAlt} className="hero-logo" />
                </div>
                {title && <h2 className="hero-title">{title}</h2>}
                {subtitle && <p className="hero-subtitle">{subtitle}</p>}
            </div>
        </aside>
    );
}

export default HeroPanel;
