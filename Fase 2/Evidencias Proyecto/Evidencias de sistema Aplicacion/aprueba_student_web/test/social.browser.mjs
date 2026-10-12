// Isolated browser fixtures: no publications are sent to a real community.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const { chromium }=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addInitScript(()=>localStorage.setItem('token','fixture'));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const user={uid:'fixture',name:'Estudiante fixture',onboardingCompleted:true,selectedTests:['m1'],difficulty:'d2',theme:'light',locale:'es',quota:{used:0,max:20,unlimited:false},medals:{bronze:1},streak:0};
  const question={id:'fixture-question',testId:'m1',statement:'¿Cuánto es 1 + 1?',options:[{id:'A',text:'1'},{id:'B',text:'2'},{id:'C',text:'3'},{id:'D',text:'4'}]};
  const group={id:'fixture-group-complete-code',name:'Grupo fixture',subjectTestId:'m1',memberCount:1,ownerId:'fixture',role:'owner'};
  let joined=false,failGroups=true,failPosts=false,loseCreate=true,losePost=false,loseComment=false,loseLike=false;
  const writes=[],completed=new Map();
  let publicPosts=[{id:'fixture-public',author:{name:'Otra estudiante'},text:'Publicación inicial',likeCount:0,userLiked:false,commentCount:0,createdAt:'2026-10-09T15:00:00Z',question:null}];
  const groupPosts=[],comments=new Map();
  const postRows=id=>id==='group'?groupPosts:publicPosts;
  const allPosts=()=>[...publicPosts,...groupPosts];
  await page.route('http://localhost:4000/api/v1/**',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname;
    const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
    const reply=(data,status=200,meta=null)=>route.fulfill({headers,status,json:status<400?{data,error:null,meta}:{data:null,error:{message:status===403?'Solo los miembros pueden ver este grupo':'Error fixture'},meta:null}});
    if(req.method()==='OPTIONS')return route.fulfill({headers,status:204});
    if(path.endsWith('/auth/me'))return reply(user);
    if(path.endsWith('/tutors')) {
      const test=url.searchParams.get('testId') || 'all';
      if(test==='m1')await new Promise(resolve=>setTimeout(resolve,600));
      return reply([{id:'tutor-'+test,name:'Tutor '+test,university:'Universidad fixture',subjectLabel:test,specialty:'Especialidad fixture',rating:5,reviewsCount:1,hourlyRate:1000}]);
    }
    if(path.endsWith('/practice/next'))return reply({question,user});
    if(path.endsWith('/practice/answers'))return reply({isCorrect:true,selectedOption:'B',correctAnswer:'B',explanation:'Una explicación verificada.',bronzeEarned:1,user});
    if(path.endsWith('/groups/join')){
      const body=req.postDataJSON();writes.push({path,body});
      if(body.groupId!==group.id)return reply(null,404);
      joined=true;return reply({id:group.id,alreadyMember:false});
    }
    if(path.endsWith('/groups') && req.method()==='POST'){
      const body=req.postDataJSON();writes.push({path,body});
      joined=true;
      if(!completed.has(body.requestId))completed.set(body.requestId,{id:group.id});
      if(loseCreate){loseCreate=false;return route.abort('failed');}
      return reply(completed.get(body.requestId));
    }
    if(path.endsWith('/groups'))return failGroups?reply(null,503):reply(joined?[group]:[],200,{groupLimit:1});
    if(path.includes('/groups/') && path.endsWith('/leave')){joined=false;return reply({left:true});}
    if(path.includes('/groups/')){
      const id=path.split('/').at(-1);
      if(id!==group.id || !joined)return reply(null,403);
      return reply({...group,members:[{uid:'fixture',name:user.name,role:'owner',answered:2,correct:1,accuracy:50}],statistics:{answered:2,correct:1,accuracy:50,myAccuracy:50}});
    }
    if(path.endsWith('/like')){
      const body=req.postDataJSON(),id=path.split('/').at(-2),post=allPosts().find(row=>row.id===id);
      writes.push({path,body});
      post.userLiked=body.liked;post.likeCount=body.liked?1:0;
      if(loseLike){loseLike=false;return route.abort('failed');}
      return reply({liked:body.liked,likeCount:post.likeCount});
    }
    if(path.endsWith('/comments')){
      const id=path.split('/').at(-2),post=allPosts().find(row=>row.id===id);
      if(req.method()==='GET'){
        const stored=comments.get(id)||[];
        if(url.searchParams.has('cursor'))return reply([{id:'old-comment',author:{name:'Comentarista anterior'},text:'Comentario anterior',createdAt:'2026-10-08T15:00:00Z'}]);
        return reply(stored,200,{nextCursor:'older-comments'});
      }
      const body=req.postDataJSON();writes.push({path,body});
      if(!completed.has(body.requestId)){
        const comment={id:'comment-'+body.requestId,author:{name:user.name},text:body.text,createdAt:'2026-10-09T15:00:00Z'};
        completed.set(body.requestId,comment);comments.set(id,[comment,...(comments.get(id)||[])]);post.commentCount++;
      }
      if(loseComment){loseComment=false;return route.abort('failed');}
      return reply(completed.get(body.requestId),200,{commentCount:post.commentCount});
    }
    if(path.endsWith('/posts') && req.method()==='POST'){
      const body=req.postDataJSON();writes.push({path,body});
      if(!completed.has(body.requestId)){
        const post={id:'post-'+body.requestId,author:{name:user.name},text:body.text,likeCount:0,commentCount:0,userLiked:false,createdAt:'2026-10-09T15:00:00Z',question:body.questionId?question:null};
        completed.set(body.requestId,post);postRows(body.groupId?'group':'public').unshift(post);
      }
      if(losePost){losePost=false;return route.abort('failed');}
      return reply(completed.get(body.requestId));
    }
    if(path.endsWith('/posts')){
      if(failPosts)return reply(null,503);
      if(url.searchParams.has('groupId'))return reply(groupPosts);
      if(url.searchParams.has('cursor'))return reply([{id:'older-post',author:{name:'Autor anterior'},text:'Publicación anterior',createdAt:'2026-10-08T15:00:00Z',likeCount:0,commentCount:0,userLiked:false}]);
      return reply(publicPosts,200,{nextCursor:'older-posts'});
    }
    return reply({});
  });
  const root='http://127.0.0.1:5173';
  await page.goto(root+'/grupos');
  await page.getByText('Error fixture',{exact:true}).waitFor();
  assert.equal(await page.getByText('Aún no perteneces a ningún grupo.',{exact:false}).count(),0);
  failGroups=false;await page.getByRole('button',{name:'Actualizar grupos',exact:true}).click();
  await page.getByText('Aún no perteneces a ningún grupo.',{exact:false}).waitFor();
  console.log('PASS: load failure is distinct from an empty group list and retries recover');
  await page.getByRole('button',{name:'Crear grupo',exact:true}).click();
  await page.getByLabel('Nombre del grupo',{exact:true}).fill('Grupo fixture');
  await page.getByRole('button',{name:'Crear e invitar',exact:true}).click();
  await page.getByRole('button',{name:'Reintentar creación',exact:true}).waitFor();
  await page.reload();
  await page.getByRole('button',{name:'Reintentar creación',exact:true}).click();
  await page.getByRole('heading',{name:'Estadísticas de práctica',exact:true}).waitFor();
  const createWrites=writes.filter(row=>row.path.endsWith('/groups'));
  assert.equal(createWrites.length,2);assert.equal(createWrites[0].body.requestId,createWrites[1].body.requestId);
  assert.equal(await page.getByText(group.id,{exact:true}).count(),1);
  assert.equal(await page.getByText('50%',{exact:true}).count(),3);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  console.log('PASS: create retry survives reload, full invitation code and actual statistics fit mobile');
  const privateForm=page.locator('.social-feed').getByRole('textbox');
  await privateForm.fill('Una duda privada');
  await page.locator('.social-feed').getByRole('button',{name:'Publicar',exact:true}).click();
  await page.getByText('Una duda privada',{exact:true}).waitFor();
  assert.equal(writes.filter(row=>row.path.endsWith('/posts')).at(-1).body.groupId,group.id);
  await page.getByRole('button',{name:'Salir del grupo',exact:true}).click();
  await page.getByRole('button',{name:'Cancelar salida',exact:true}).click();
  assert.equal(joined,true);
  await page.getByRole('button',{name:'Salir del grupo',exact:true}).click();
  await page.getByRole('button',{name:'Confirmar salida',exact:true}).click();
  await page.getByText('Saliste del grupo.',{exact:true}).waitFor();assert.equal(joined,false);
  console.log('PASS: private group publishing and explicit leave confirmation');
  await page.getByRole('button',{name:'Unirse con código',exact:true}).click();
  await page.getByLabel('Código completo del grupo',{exact:true}).fill('wrong-code');
  await page.getByRole('button',{name:'Unirse al grupo',exact:true}).click();
  await page.getByText('Error fixture',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('Código completo del grupo',{exact:true}).inputValue(),'wrong-code');
  await page.getByLabel('Código completo del grupo',{exact:true}).fill(group.id);
  await page.getByRole('button',{name:'Unirse al grupo',exact:true}).click();
  await page.getByRole('heading',{name:'Estadísticas de práctica',exact:true}).waitFor();
  console.log('PASS: failed join preserves code and a complete invitation opens the group');
  await page.goto(root+'/grupos?groupId=outsider');
  await page.getByText('Solo los miembros pueden ver este grupo',{exact:true}).waitFor();
  assert.equal(await page.locator('.social-feed').count(),0);
  console.log('PASS: denied group detail never shows private conversation');
  failPosts=true;await page.goto(root+'/comunidad');await page.getByText('Error fixture',{exact:true}).waitFor();
  failPosts=false;await page.getByRole('button',{name:'Actualizar publicaciones',exact:true}).click();
  await page.getByText('Publicación inicial',{exact:true}).waitFor();
  losePost=true;await page.locator('.social-feed > form').getByRole('textbox').fill('Publicación nueva');
  await page.getByRole('button',{name:'Publicar',exact:true}).click();
  await page.getByRole('button',{name:'Reintentar publicación',exact:true}).waitFor();
  await page.reload();await page.getByRole('button',{name:'Reintentar publicación',exact:true}).click();
  await page.getByText('Publicación registrada.',{exact:true}).waitFor();
  const postWrites=writes.filter(row=>row.path.endsWith('/posts')&&!row.body.groupId);
  assert.equal(postWrites[0].body.requestId,postWrites[1].body.requestId);
  assert.equal(await page.getByText('Publicación nueva',{exact:true}).count(),1);
  console.log('PASS: community failure retries and uncertain publication cannot duplicate after reload');
  const card=page.locator('.social-post').filter({has:page.getByText('Publicación nueva',{exact:true})});
  loseLike=true;await card.getByRole('button',{name:'Me gusta · 0',exact:true}).click();
  await card.getByRole('alert').waitFor();
  await card.getByRole('button',{name:'Me gusta · 0',exact:true}).click();
  await card.getByRole('button',{name:'Quitar Me gusta · 1',exact:true}).waitFor();
  assert.equal(writes.filter(row=>row.path.endsWith('/like')).at(-1).body.liked,true);
  console.log('PASS: lost reaction response repeats desired state rather than toggling again');
  await card.getByRole('button',{name:'Comentarios · 0',exact:true}).click();
  await card.getByLabel('Escribe un comentario',{exact:true}).fill('Mi comentario');
  loseComment=true;await card.getByRole('button',{name:'Enviar comentario',exact:true}).click();
  await card.getByRole('button',{name:'Reintentar comentario',exact:true}).waitFor();
  await page.reload();
  const refreshed=page.locator('.social-post').filter({has:page.getByText('Publicación nueva',{exact:true})});
  await refreshed.getByRole('button',{name:'Comentarios · 1',exact:true}).click();
  await refreshed.getByRole('button',{name:'Reintentar comentario',exact:true}).click();
  await refreshed.getByText('Comentario publicado.',{exact:true}).waitFor();
  assert.equal(await refreshed.getByText('Mi comentario',{exact:true}).count(),1);
  const commentWrites=writes.filter(row=>row.path.endsWith('/comments'));
  assert.equal(commentWrites[0].body.requestId,commentWrites[1].body.requestId);
  await refreshed.getByRole('button',{name:'Ver comentarios anteriores',exact:true}).click();
  await refreshed.getByText('Comentario anterior',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Ver publicaciones anteriores',exact:true}).click();
  await page.getByText('Publicación anterior',{exact:true}).waitFor();
  console.log('PASS: comment retry preserves counts and both cursors expose older content');
  await page.goto(root+'/practicar');
  await page.getByRole('button',{name:/^B\s+2$/}).click();
  await page.getByRole('button',{name:'Comprobar Respuesta',exact:true}).click();
  await page.getByRole('button',{name:'Compartir al grupo',exact:true}).click();
  await page.waitForURL('**/grupos?questionId=fixture-question&testId=m1');
  await page.getByRole('button',{name:'Abrir Grupo fixture',exact:true}).click();
  await page.getByLabel('Adjuntar la pregunta de práctica',{exact:true}).waitFor();
  await page.locator('.social-feed > form').getByRole('textbox').fill('Duda sobre esta pregunta');
  await page.getByRole('button',{name:'Publicar',exact:true}).click();
  await page.getByText('Duda sobre esta pregunta',{exact:true}).waitFor();
  const shared=writes.filter(row=>row.path.endsWith('/posts')).at(-1).body;
  assert.equal(shared.questionId,question.id);assert.equal(shared.groupId,group.id);
  assert.equal(shared.question,undefined);
  console.log('PASS: practice shares the question identifier to the selected private group');
  await page.goto(root+'/tutores');
  await page.getByRole('heading',{name:'Tutor all',exact:true}).waitFor();
  await page.getByRole('button',{name:'Matemática (M1)',exact:true}).click();
  await page.getByRole('button',{name:'Lectora',exact:true}).click();
  await page.getByRole('heading',{name:'Tutor lectora',exact:true}).waitFor();
  await page.waitForTimeout(750);
  assert.equal(await page.getByRole('heading',{name:'Tutor m1',exact:true}).count(),0);
  console.log('PASS: a delayed tutor filter response cannot replace the latest subject');
  assert.deepEqual(errors,[]);
} finally {await browser.close();}
