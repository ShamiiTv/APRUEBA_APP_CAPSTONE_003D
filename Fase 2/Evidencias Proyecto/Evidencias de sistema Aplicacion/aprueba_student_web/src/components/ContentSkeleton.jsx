import '../pages/Home.css';
import '../pages/Plan.css';
import '../pages/Tutors.css';
import '../pages/StudyPlan.css';
import {useTheme} from '../context/useTheme';
const Bar = ({height=14,width='100%',className=''}) => <div className={`skeleton-block ${className}`} style={{height,width}}/>;
const Tile = ({height=150,children,className=''}) => <div className={`skeleton-layout-tile ${className}`} style={{minHeight:height}}>{children || <><Bar height={22} width="60%"/><Bar width="85%"/><Bar height={44}/></>}</div>;
export default function ContentSkeleton({kind='question',minHeight}) {
 const {lang}=useTheme();
 let body;
 if(kind==='plans') body=<><Tile height={190}><Bar height={24} width="28%"/><Bar height={24} width="45%"/><Bar height={14} width="80%"/></Tile><div className="home-grid subscription-plans" style={{marginTop:24}}>{['free','uni','all'].map(id=><section key={id} className={`home-panel plan-card plan-card--${id}`}><Bar height={26} width="70%"/><Bar height={48} width="80%"/><Bar height={70}/>{id==='uni' && <Bar height={60}/>}<Bar height={44} className="skeleton-bottom"/></section>)}</div></>;
 else if(kind==='feed') body=<div className="skeleton-list"><Tile height={220}><Bar height={18} width="60%"/><Bar height={84}/><Bar height={40} width="25%"/></Tile>{[0,1].map(i=><Tile key={i} height={180}><Bar height={18} width="35%"/><Bar height={35}/><Bar height={38} width="45%"/></Tile>)}</div>;
 else if(kind==='study-plan') body=<><div className="study-overview"><Tile height={350}/><Tile height={440}/></div><div className="study-task-grid">{[0,1].map(i=><Tile key={i} height={330}/>)}</div></>;
 else if(kind==='analysis') body=<div className="skeleton-list"><Tile height={160}/><div className="home-grid">{[0,1,2].map(i=><Tile key={i} height={200}/>)}</div></div>;
 else if(kind==='notifications') body=<div className="skeleton-list">{[0,1,2].map(i=><Tile key={i} height={140}/>)}</div>;
 else if(kind==='home') body=<><div className="home-grid skeleton-metrics">{[0,1,2,3].map(i=><Tile key={i} height={160}><Bar width="70%"/><Bar height={36} width="40%"/><Bar width="90%"/></Tile>)}</div><div className="home-grid home-section">{[0,1].map(i=><Tile key={i} height={260}/>)}</div><Tile height={130}/><div className="home-section"><Bar height={22} width="40%"/></div><div className="home-grid">{[0,1,2].map(i=><Tile key={i} height={180}/>)}</div></>;
 else if(kind==='medals') body=<><div className="medals-balances">{[0,1,2,3,4].map(i=><div className="medal-card skeleton-medal" key={i}><Bar height={74} width={60}/><Bar height={20} width="70%"/><Bar height={30} width="40%"/><Bar height={14} width="60%"/></div>)}</div><Tile height={300}><Bar height={24} width="55%"/>{[0,1,2,3].map(i=><Bar key={i} height={44}/>)}</Tile></>;
 else if(kind==='question') body=<div className="question-surface"><div className="skeleton-question-top"><Bar height={30} width="35%"/><Bar height={20} width="35%"/></div><div className="question-statement-space"><Bar height={24}/><Bar height={24} width="80%"/><Bar height={24} width="90%"/></div><div className="question-options-space">{[0,1,2,3,4].map(i=><Bar height={63} key={i}/>)}</div><Bar height={48}/></div>;
 else if(kind==='form') body=<Tile height={620}><Bar height={24} width="60%"/>{[0,1,2,3,4].map(i=><div key={i} className="skeleton-field"><Bar width="40%"/><Bar height={48}/></div>)}<Bar height={44}/></Tile>;
 else if(kind==='groups' || kind==='group-detail') body=<div className="skeleton-list">{Array.from({length:kind==='groups'?2:3},(_,i)=><Tile key={i} height={kind==='groups'?156:240}/>)}</div>;
 else if(kind==='tutors') body=<div className="tutors-grid">{[0,1,2,3,4].map(i=><Tile key={i} height={300}><div style={{display:'flex',gap:14}}><Bar height={52} width={52}/><div style={{flex:1,display:'grid',gap:12}}><Bar height={22}/><Bar height={14} width="70%"/></div></div><Bar height={42}/><Bar height={18} width="45%"/><Bar height={44} className="skeleton-bottom"/></Tile>)}</div>;
 else body=<div className="skeleton-list">{[0,1].map(i=><Tile key={i} height={220}><Bar height={22} width="40%"/><Bar height={70}/><Bar height={44}/></Tile>)}</div>;
 return <div className={`content-skeleton skeleton-${kind}`} style={{minHeight}} role="status" aria-label={lang==='en'?'Loading content':'Cargando contenido'}><span className="sr-only">{lang==='en'?'Loading content…':'Cargando contenido…'}</span><div aria-hidden="true">{body}</div></div>;
}
