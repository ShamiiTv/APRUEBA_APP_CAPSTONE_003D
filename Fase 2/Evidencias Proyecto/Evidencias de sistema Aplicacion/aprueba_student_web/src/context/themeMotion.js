let active,generation=0,timer;
export function paintTheme(theme,{animate=false,origin}={}) {
 const root=document.documentElement,body=document.body;
 const previous=body.classList.contains('dark')?'dark':'light';
 const setColors=value=>{body.classList.toggle('dark',value==='dark');root.style.colorScheme=value;};
 const apply=()=>{setColors(theme);localStorage.setItem('theme',theme);};
 const version=++generation;
 active?.skipTransition();clearTimeout(timer);
 root.classList.remove('theme-reveal','theme-color-transition');
 if(!animate || previous===theme || window.matchMedia('(prefers-reduced-motion: reduce)').matches){apply();return;}
 const fade=()=>{
  if(version!==generation)return;
  root.classList.remove('theme-reveal');setColors(previous);
  void root.offsetHeight;
  root.classList.add('theme-color-transition');
  requestAnimationFrame(()=>{if(version===generation){apply();timer=setTimeout(()=>root.classList.remove('theme-color-transition'),550);}});
 };
 if(typeof document.startViewTransition!=='function'){fade();return;}
 const x=origin?.x ?? innerWidth/2,y=origin?.y ?? Math.min(100,innerHeight/2);
 const radius=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
 root.classList.add('theme-reveal');
 try{
  const transition=document.startViewTransition(apply);active=transition;
  transition.ready.then(()=>{
   if(version!==generation)return;
   root.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${radius}px at ${x}px ${y}px)`]}, {duration:720,easing:'cubic-bezier(.4,0,.2,1)',pseudoElement:'::view-transition-new(root)'});
  }).catch(()=>{if(version===generation){transition.skipTransition();fade();}});
  transition.finished.catch(()=>{}).finally(()=>{if(version===generation){active=undefined;root.classList.remove('theme-reveal');}});
 }catch{fade();}
}
