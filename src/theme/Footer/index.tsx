import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useThemeConfig} from '@docusaurus/theme-common';
import styles from './styles.module.css';

type FooterLink = {label: string; to?: string; href?: string};
type FooterColumn = {title?: string; items: FooterLink[]};

// Footer links with these labels are shown as icons, as on daisytuner.com.
const socialIcons: Record<string, string> = {
  linkedin: 'img/social/linkedin.svg',
  github: 'img/social/github.svg',
  discord: 'img/social/discord.svg',
};

function SocialIcon({link}: {link: FooterLink}): ReactNode {
  const src = useBaseUrl(socialIcons[link.label.toLowerCase()]);
  return (
    <a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label} title={link.label}>
      <img src={src} alt={link.label} />
    </a>
  );
}

export default function Footer(): ReactNode {
  const {footer, navbar} = useThemeConfig();
  const logoSrc = useBaseUrl(navbar.logo?.src ?? '');
  if (!footer) return null;

  const columns = (footer.links as FooterColumn[]).map((col) => ({
    title: col.title,
    items: col.items.filter((l) => !(l.href && socialIcons[l.label.toLowerCase()])),
  }));
  const social = (footer.links as FooterColumn[])
    .flatMap((col) => col.items)
    .filter((l) => l.href && socialIcons[l.label.toLowerCase()]);

  return (
    <footer className={`footer footer--dark ${styles.footer}`}>
      <div className={styles.row}>
        <div className={styles.brand}>
          <Link to="/" className={styles.logo}>
            {navbar.logo && <img src={logoSrc} alt="" />}
            <span>Daisytuner</span>
          </Link>
          {social.length > 0 && (
            <div className={styles.social}>
              {social.map((l) => (
                <SocialIcon key={l.label} link={l} />
              ))}
            </div>
          )}
          {footer.copyright && (
            <span className={styles.copy} dangerouslySetInnerHTML={{__html: footer.copyright}} />
          )}
        </div>
        {columns
          .filter((col) => col.items.length > 0)
          .map((col) => (
            <nav key={col.title} className={styles.col} aria-label={col.title}>
              {col.title && <strong>{col.title}</strong>}
              {col.items.map((l) =>
                l.href ? (
                  <Link key={l.label} href={l.href}>
                    {l.label}
                  </Link>
                ) : (
                  <Link key={l.label} to={l.to}>
                    {l.label}
                  </Link>
                ),
              )}
            </nav>
          ))}
      </div>
    </footer>
  );
}
