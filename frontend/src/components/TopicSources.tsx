import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import { loadResources, resourcesForTopic } from '../lib/knowledge';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';
import { useTopicCopy } from '../i18n/topicPage';
import { Section, List, ListRow } from '../ui/index';
import type { Topic } from '../types/domain';

/**
 * The two or three things worth reading next about this topic, at the foot of
 * the topic page. The catalogue is a static JSON file, so a topic nobody wrote
 * about renders nothing at all rather than an apology.
 */
export default function TopicSources({ topic }: { topic: Topic }) {
  const { lang } = useLang();
  const t = useT(lang);
  const c = useTopicCopy(lang);

  const { data } = useQuery({
    queryKey: ['resources'],
    queryFn: loadResources,
    staleTime: Infinity,
  });

  const picks = useMemo(
    () => (data ? resourcesForTopic(data.resources, topic) : []),
    [data, topic],
  );

  if (!picks.length) return null;

  return (
    <Section
      title={t.nav.sources}
      actions={
        <Link to="/knowledge" className="text-brand hover:underline">
          {c.allSources}
        </Link>
      }
    >
      <List>
        {picks.map((r) => (
          <ListRow
            key={r.id}
            // `relative` + the anchor's stretched ::before makes the whole row
            // the link's hit area while the href stays a real anchor.
            className="relative transition-colors hover:bg-rule/4"
            title={
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="before:absolute before:inset-0 hover:underline"
              >
                {(lang === 'ru' && r.title_ru) || r.title_en}
              </a>
            }
            meta={[r.source, r.media_type].filter(Boolean).join(' · ')}
            trailing={<ArrowUpRight className="h-4 w-4 text-muted-2" aria-hidden />}
            chevron={false}
          />
        ))}
      </List>
    </Section>
  );
}
