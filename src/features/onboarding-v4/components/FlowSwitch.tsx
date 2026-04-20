import { Link } from 'react-router-dom';

interface Props {
  to: string;
  prefix: string;
  emphasis: string;
}

export function FlowSwitch({ to, prefix, emphasis }: Props) {
  return (
    <Link to={to} className="flow-switch">
      {prefix} <b>{emphasis}</b> →
    </Link>
  );
}
