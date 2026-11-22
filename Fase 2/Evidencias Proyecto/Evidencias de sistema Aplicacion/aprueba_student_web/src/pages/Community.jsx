import SectionHeader from '../components/SectionHeader';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import SocialFeed from '../components/SocialFeed';

export default function Community() {
  const { t } = useTheme();
  const [params] = useSearchParams();
  const questionId = params.get('questionId');
  return <div className="social-page"><SectionHeader icon="chat" title={t.community.title}>{t.community.subtitle}</SectionHeader><SocialFeed questionId={questionId} /></div>;
}
