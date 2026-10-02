import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import type {Project} from '../types';

import styles from './index.module.css';

type Card = {title: string; description: string; to: string};

function Cards({cards}: {cards: Card[]}) {
  return (
    <main className="container margin-vert--xl">
      <div className="row">
        {cards.map((c) => (
          <div key={c.title} className="col col--4 margin-bottom--lg">
            <Link className={styles.card} to={c.to} target={c.to.startsWith('pathname:') ? '_self' : undefined}>
              <Heading as="h3">{c.title}</Heading>
              <p>{c.description}</p>
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const project = siteConfig.customFields!.project as Project;
  const cppApiHref = siteConfig.customFields!.cppApiHref as string | undefined;

  const cards: Card[] = [
    ...(project.landing ?? []).map((l) => ({title: l.title, description: l.description, to: `/${l.doc}`})),
    ...(cppApiHref
      ? [{title: 'C++ API', description: 'Reference documentation generated from the C++ headers.', to: cppApiHref}]
      : []),
    ...(project.typedoc ?? []).map((t) => ({
      title: `TypeScript: ${t.name}`,
      description: `API reference of ${t.dir}.`,
      to: `/ts-api/${t.name}`,
    })),
  ];

  return (
    <Layout title="Documentation" description={siteConfig.tagline}>
      <header className={styles.hero}>
        <div className="container">
          <Heading as="h1" className={styles.title}>
            {siteConfig.title}
          </Heading>
          <p className={styles.tagline}>{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link className="button button--primary button--lg" to={`/${project.startDoc}`}>
              Read the docs
            </Link>
            {cppApiHref && (
              <Link className="button button--secondary button--lg" to={cppApiHref} target="_self">
                C++ API reference
              </Link>
            )}
          </div>
        </div>
      </header>
      {cards.length > 0 && <Cards cards={cards} />}
    </Layout>
  );
}
