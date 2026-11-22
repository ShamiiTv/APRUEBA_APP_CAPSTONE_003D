export function skeletonForPath(path){
 if(path==='/facsimil')return 'form';
 if(path==='/arena')return 'arena';
 if(path==='/')return 'home';
 if(path.startsWith('/plan-estudio'))return 'study-plan';
 if(path==='/plan')return 'plans';
 if(path.startsWith('/practicar'))return 'question';
 if(path.startsWith('/medallas'))return 'medals';
 if(path.startsWith('/grupos'))return 'groups';
 if(path==='/tutores')return 'tutors';
 if(path.startsWith('/tutores/analisis'))return 'analysis';
 if(path.startsWith('/comunidad'))return 'feed';
 if(path.startsWith('/ajustes')||path.startsWith('/onboarding'))return 'form';
 if(path.startsWith('/notificaciones'))return 'notifications';
 return 'cards';
}
