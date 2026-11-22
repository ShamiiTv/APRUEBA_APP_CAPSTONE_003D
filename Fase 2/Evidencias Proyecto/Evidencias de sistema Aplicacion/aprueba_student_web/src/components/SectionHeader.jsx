import ApruebaIcon from './ApruebaIcon';
import './SectionHeader.css';

export default function SectionHeader({ icon, title, children, detail }) {
  return <header className={'section-header section-header--' + icon}>
    <span className="section-symbol"><ApruebaIcon name={icon} size={30} /></span>
    <div><h1>{title}</h1>{children && <p>{children}</p>}</div>
    {detail && <span className="section-detail">{detail}</span>}
  </header>;
}
