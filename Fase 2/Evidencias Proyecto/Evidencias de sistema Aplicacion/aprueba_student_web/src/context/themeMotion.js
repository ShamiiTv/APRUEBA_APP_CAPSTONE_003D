let active, generation=0, timer;
export function paintTheme(theme,{animate=false,origin}={}) {
 const root=document.documentElement,body=document.body;
 const apply=()=>{body.classList.toggle('dark',theme==='dark');root.style.colorScheme=theme;localStorage.setItem('theme',theme);};
 const version=++generation;
 active?.skipTransition();clearTimeout(timer);
 root.classList.remove('theme-reveal','theme-color-transition');
 if(!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches){apply();return;}
 if(typeof document.startViewTransition!=='function'){
  root.classList.add('theme-color-transition');apply();
  timer=setTimeout(()=>root.classList.remove('theme-color-transition'),400);return;
 }
 const x=origin?.x ?? innerWidth/2,y=origin?.y ?? Math.min(100,innerHeight/2);
 const radius=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
 root.classList.add('theme-reveal');
 try {
  const transition=document.startViewTransition(apply);active=transition;
  transition.ready.then(()=>{
   if(version!==generation)return;
   root.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${radius}px at ${x}px ${y}px)`]}, {duration:480,easing:'cubic-bezier(.22,1,.36,1)',pseudoElement:'::view-transition-new(root)'});
  }).catch(()=>{});
  transition.finished.catch(()=>{}).finally(()=>{if(version===generation){active=undefined;root.classList.remove('theme-reveal');}});
 }catch{root.classList.remove('theme-reveal');apply();}
}
