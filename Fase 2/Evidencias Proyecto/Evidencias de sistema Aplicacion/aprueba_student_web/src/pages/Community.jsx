import { useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import SocialFeed from '../components/SocialFeed';

export default function Community() {
  const { t } = useTheme();
  const [params] = useSearchParams();
  const questionId = params.get('questionId');
  return <div className="social-page"><h1>{t.community.title}</h1><p>{t.community.subtitle}</p><SocialFeed questionId={questionId} /></div>;
}
