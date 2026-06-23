import { useLocation } from 'react-router-dom';
import KnifeBottomNav from '../../components/KnifeBottomNav';
import { AGENT_NAV_ITEMS, isAgentNavActive } from '../config/navigation';

export default function AgentBottomNav() {
  const location = useLocation();

  return (
    <KnifeBottomNav
      home={{ path: '/agent/dashboard', matchPaths: ['/agent', '/agent/dashboard'], label: 'Home' }}
      items={AGENT_NAV_ITEMS}
      isActive={(item) => isAgentNavActive(location.pathname, item)}
    />
  );
}
