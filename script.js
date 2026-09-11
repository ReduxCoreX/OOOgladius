document.addEventListener('DOMContentLoaded', async () => {
  const { createClient } = window.supabase;
  const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
  const pages=[...document.querySelectorAll('.page')], tabs=[...document.querySelectorAll('.top-tab')];
  function show(id){
    if(!document.getElementById(id)) id='home';
    pages.forEach(p=>p.classList.toggle('active',p.id===id));
    tabs.forEach(t=>t.classList.toggle('active',t.dataset.open===id));
    history.replaceState(null,'','#'+id);
    window.scrollTo({top:0,behavior:'smooth'});
  }
  document.querySelectorAll('[data-open]').forEach(el=>el.addEventListener('click',e=>{
    e.preventDefault();
    show(el.dataset.open);
  }));
  const initialHash=location.hash.slice(1);
  show(initialHash && document.getElementById(initialHash) ? initialHash : 'home');
  const modal=document.getElementById('authModal'), form=document.getElementById('authForm');
  let authMode='login';
  function updateAuthMode(){
    const reg=authMode==='register'; document.getElementById('authTitle').textContent=reg?'РЕГИСТРАЦИЯ':'ВХОД';
    document.getElementById('authHint').textContent=reg?'Создай аккаунт ReduxCoreX.':'Войди по юзернейму и паролю.';
    document.getElementById('emailLabel').hidden=!reg; document.getElementById('email').required=reg;
    document.getElementById('nameLabel').hidden=!reg; document.getElementById('name').required=reg;
    document.getElementById('username').required=true;
    document.getElementById('authSubmit').textContent=reg?'СОЗДАТЬ АККАУНТ':'ВОЙТИ'; document.getElementById('switchAuth').textContent=reg?'Уже есть аккаунт? Войти':'Нет аккаунта? Регистрация';
  }

  function openAuth(mode='login'){
    authMode=mode;
    updateAuthMode();
    document.getElementById('authMessage').textContent='';
    form.reset();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    setTimeout(()=>document.getElementById(authMode==='register'?'name':'username').focus(),50);
  }
  function closeAuth(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    form.reset();
    document.getElementById('authMessage').textContent='';
  }
  document.getElementById('openLogin').onclick=()=>openAuth('login'); document.getElementById('openRegister').onclick=()=>openAuth('register'); document.getElementById('closeAuth').onclick=closeAuth;
  document.getElementById('switchAuth').onclick=()=>{authMode=authMode==='login'?'register':'login';updateAuthMode();};
  modal.addEventListener('click',e=>{if(e.target===modal)closeAuth();});

  async function ensureProfile(user){
    const {data}=await supabase.from('profiles').select('*').eq('id',user.id).maybeSingle();
    if(!data){
      const username=user.user_metadata?.username || user.email?.split('@')[0] || 'user';
      const display_name=user.user_metadata?.display_name || username;
      await supabase.from('profiles').insert({id:user.id,username,display_name});
      return {username,display_name};
    }
    return data;
  }
  function avatarFallback(name){ return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="100%" height="100%" rx="80" fill="#120811"/><text x="50%" y="57%" text-anchor="middle" fill="#ff2857" font-size="64" font-family="Arial">${(name||'?')[0].toUpperCase()}</text></svg>`); }

  const loggedOut=document.getElementById('loggedOut'), loggedIn=document.getElementById('loggedIn'), accountText=document.getElementById('accountText'), topAvatar=document.getElementById('topAvatar');
  const adminBadge=document.getElementById('adminBadge');
  let topAdminBadge=document.getElementById('topAdminBadge');
  const profileName=document.getElementById('profileName'), profileDisplayName=document.getElementById('profileDisplayName'), profileUsername=document.getElementById('profileUsername'), profileEmail=document.getElementById('profileEmail'), profileAvatar=document.getElementById('profileAvatar'), historyBox=document.getElementById('history');
  const emailToggle=document.getElementById('emailToggle'), usernameToggle=document.getElementById('usernameToggle');

  async function refreshUser(user){
    if(adminBadge) adminBadge.hidden=true;
    if(topAdminBadge) topAdminBadge.hidden=true;
    if(!user){ loggedOut.hidden=false; loggedIn.hidden=true; accountText.textContent='ONLINE'; topAvatar.hidden=true; return; }
    const profile=await ensureProfile(user); const name=profile.display_name || profile.username || user.user_metadata?.display_name || user.user_metadata?.username || 'User';
    loggedOut.hidden=true; loggedIn.hidden=false; accountText.textContent=name.toUpperCase(); profileName.textContent=name; profileDisplayName.textContent=name; profileUsername.textContent=profile.username || ''; profileUsername.classList.add('private-value'); profileUsername.classList.remove('private-visible'); profileEmail.textContent=user.email || ''; profileEmail.classList.add('email-blurred'); profileEmail.classList.remove('email-visible'); emailToggle.textContent='ПОКАЗАТЬ'; usernameToggle.textContent='ПОКАЗАТЬ'; updateAdminBadge(profile.username);
    const avatar=profile.avatar_url || user.user_metadata?.avatar_url || avatarFallback(name); profileAvatar.src=avatar; topAvatar.src=avatar; topAvatar.hidden=false;
    await loadHistory(user.id);
  }
  async function loadHistory(userId){
    const {data,error}=await supabase.from('download_history').select('item_name,category,downloaded_at').eq('user_id',userId).order('downloaded_at',{ascending:false});
    if(error){historyBox.innerHTML='<div class="empty-history">Не удалось загрузить историю.</div>';return;}

    const categories=[
      {key:'REDUX',title:'REDUX',number:'01'},
      {key:'GUN PACK',title:'GUN PACK',number:'02'},
      {key:'BODY ARMOR',title:'BODY ARMOR',number:'03'}
    ];
    const groups={};
    categories.forEach(c=>groups[c.key]={});
    (data||[]).forEach(row=>{
      const category=groups[row.category] ? row.category : 'REDUX';
      const item=row.item_name || 'Без названия';
      if(!groups[category][item]) groups[category][item]={count:0,last:row.downloaded_at};
      groups[category][item].count++;
      if(new Date(row.downloaded_at)>new Date(groups[category][item].last)) groups[category][item].last=row.downloaded_at;
    });

    historyBox.innerHTML='<div class="download-categories">'+categories.map(c=>{
      const items=Object.entries(groups[c.key]);
      return `<section class="download-category"><div class="category-title"><span>${c.number} / ${escapeHtml(c.title)}</span><strong>${items.length ? items.length+' '+(items.length===1?'мод':'мода/модов') : 'ПУСТО'}</strong></div>`+
        (items.length ? items.map(([item,info])=>`<div class="history-row"><div><span>${escapeHtml(c.title)}</span><strong>${escapeHtml(item)}</strong><small>Скачано: <b>${info.count}</b> ${info.count===1?'раз':'раза'}</small></div><time>Последний раз: ${new Date(info.last).toLocaleString('ru-RU')}</time></div>`).join('') : '<div class="empty-category">Пока ничего не скачано.</div>')+
      '</section>';
    }).join('')+'</div>';
  }
  function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

  const nicknameInput=document.getElementById('nicknameInput');
  const saveNickname=document.getElementById('saveNickname');
  const nicknameMessage=document.getElementById('nicknameMessage');

  function updateAdminBadge(name){
    const isAdmin=String(name||'').trim().toLowerCase()==='administrator';
    if(adminBadge) adminBadge.hidden=!isAdmin;
    if(isAdmin){
      if(!topAdminBadge){
        topAdminBadge=document.createElement('span');
        topAdminBadge.className='admin-badge top-admin-badge';
        topAdminBadge.id='topAdminBadge';
        topAdminBadge.textContent='ADMIN';
        const accountChip=document.getElementById('accountChip');
        if(accountChip) accountChip.insertBefore(topAdminBadge,topAvatar);
      }
      topAdminBadge.hidden=false;
    }else if(topAdminBadge){
      topAdminBadge.hidden=true;
    }
  }

  emailToggle.onclick=()=>{
    const visible=profileEmail.classList.toggle('email-visible');
    profileEmail.classList.toggle('email-blurred',!visible);
    emailToggle.textContent=visible?'СКРЫТЬ':'ПОКАЗАТЬ';
  };

  usernameToggle.onclick=()=>{
    const visible=profileUsername.classList.toggle('private-visible');
    profileUsername.classList.toggle('private-value',!visible);
    usernameToggle.textContent=visible?'СКРЫТЬ':'ПОКАЗАТЬ';
  };

  saveNickname.onclick=async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) return;
    const display_name=nicknameInput.value.trim();
    nicknameMessage.textContent='';
    if(display_name.length<2){nicknameMessage.textContent='Имя должно содержать минимум 2 символа.';return;}
    const {error}=await supabase.from('profiles').update({display_name}).eq('id',user.id);
    if(error){nicknameMessage.textContent='Не удалось изменить никнейм: '+error.message;return;}
    nicknameMessage.textContent='Имя изменено.';
    nicknameInput.value='';
    await refreshUser(user);
  };

  const userSearch=document.getElementById('userSearch'), userSearchBtn=document.getElementById('userSearchBtn'), userResults=document.getElementById('userResults');
  const userProfileModal=document.getElementById('userProfileModal'), closeUserProfile=document.getElementById('closeUserProfile');
  const publicProfileAvatar=document.getElementById('publicProfileAvatar'), publicProfileName=document.getElementById('publicProfileName'), publicProfileUsername=document.getElementById('publicProfileUsername'), publicProfileJoined=document.getElementById('publicProfileJoined'), publicAdminBadge=document.getElementById('publicAdminBadge');
  const reportGuest=document.getElementById('reportGuest'), reportComposer=document.getElementById('reportComposer'), reportText=document.getElementById('reportText'), sendReport=document.getElementById('sendReport'), reportMessage=document.getElementById('reportMessage'), reportsList=document.getElementById('reportsList'), reportsTitle=document.getElementById('reportsTitle');
  const reportChatModal=document.getElementById('reportChatModal'), closeReportChat=document.getElementById('closeReportChat'), chatReportInfo=document.getElementById('chatReportInfo'), chatMessages=document.getElementById('chatMessages'), chatInput=document.getElementById('chatInput'), sendChatMessage=document.getElementById('sendChatMessage'), chatMessageStatus=document.getElementById('chatMessageStatus');
  let activeChatReportId=null, chatPollTimer=null;

  async function searchUsers(){
    const q=userSearch.value.trim();
    if(q.length<2){userResults.innerHTML='<div class="empty-history">Введи минимум 2 символа.</div>';return;}
    userResults.innerHTML='<div class="empty-history">Поиск...</div>';
    const {data,error}=await supabase.from('profiles').select('id,username,display_name,avatar_url,created_at').ilike('username','%'+q+'%').order('username').limit(30);
    if(error){userResults.innerHTML='<div class="empty-history">Не удалось выполнить поиск.</div>';return;}
    if(!data?.length){userResults.innerHTML='<div class="empty-history">Участники не найдены.</div>';return;}
    userResults.innerHTML=data.map(u=>{
      const name=u.display_name||u.username||'User';
      const isAdmin=String(u.username||'').trim().toLowerCase()==='administrator';
      const avatar=u.avatar_url||avatarFallback(name);
      return `<div class="user-card" data-user-id="${escapeHtml(u.id)}"><img src="${escapeHtml(avatar)}" alt=""><div class="user-card-info"><strong>${escapeHtml(name)}</strong><span>@${escapeHtml(u.username||'')}</span></div>${isAdmin?'<span class="admin-badge user-card-admin">ADMIN</span>':''}<button class="download secondary small-btn profile-open-btn" type="button" data-user-profile="${escapeHtml(u.id)}">ПРОФИЛЬ</button></div>`;
    }).join('');
  }
  userSearchBtn.onclick=searchUsers;
  const reportLogin=document.getElementById('reportLogin');
  if(reportLogin) reportLogin.onclick=()=>openAuth('login');
  userSearch.addEventListener('keydown',e=>{if(e.key==='Enter')searchUsers();});

  async function openPublicProfile(id){
    const {data,error}=await supabase.from('profiles').select('id,username,display_name,avatar_url,created_at').eq('id',id).maybeSingle();
    if(error||!data)return;
    const name=data.display_name||data.username||'User';
    publicProfileName.textContent=name;
    publicProfileUsername.textContent='@'+(data.username||'');
    publicProfileJoined.textContent=data.created_at?'Участник с '+new Date(data.created_at).toLocaleDateString('ru-RU'):'';
    publicProfileAvatar.src=data.avatar_url||avatarFallback(name);
    publicAdminBadge.hidden=String(data.username||'').trim().toLowerCase()!=='administrator';
    userProfileModal.classList.add('open'); userProfileModal.setAttribute('aria-hidden','false');
  }
  userResults.addEventListener('click',e=>{
    const profileBtn=e.target.closest('[data-user-profile]');
    if(profileBtn){e.stopPropagation();openPublicProfile(profileBtn.dataset.userProfile);return;}
    const card=e.target.closest('[data-user-id]');
    if(card)openPublicProfile(card.dataset.userId);
  });
  closeUserProfile.onclick=()=>{userProfileModal.classList.remove('open');userProfileModal.setAttribute('aria-hidden','true');};
  userProfileModal.addEventListener('click',e=>{if(e.target===userProfileModal)closeUserProfile.onclick();});

  async function getCurrentProfile(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return {user:null,profile:null,isAdmin:false};
    const profile=await ensureProfile(user);
    return {user,profile,isAdmin:String(profile.username||'').trim().toLowerCase()==='administrator'};
  }
  function reportStatusLabel(status){return status==='closed'?'ЗАКРЫТО':status==='in_progress'?'ПРИНЯТО':'НОВОЕ';}
  async function loadReports(){
    const {user,profile,isAdmin}=await getCurrentProfile();
    if(!user){
      reportGuest.hidden=false; reportComposer.hidden=true; reportsTitle.textContent='МОИ ОБРАЩЕНИЯ';
      reportsList.innerHTML='<div class="empty-history">Войди в аккаунт, чтобы увидеть свои обращения.</div>'; return;
    }
    reportGuest.hidden=true; reportComposer.hidden=false; reportsTitle.textContent=isAdmin?'ВСЕ ОБРАЩЕНИЯ':'МОИ ОБРАЩЕНИЯ';
    const {data,error}=await supabase.from('reports').select('id,user_id,reporter_username,message,status,admin_id,admin_username,created_at,updated_at').order('created_at',{ascending:false});
    if(error){reportsList.innerHTML='<div class="empty-history">Не удалось загрузить обращения: '+escapeHtml(error.message||'')+'</div>';return;}
    if(!data?.length){reportsList.innerHTML='<div class="empty-history">Обращений пока нет.</div>';return;}
    reportsList.innerHTML=data.map(r=>{
      const own=r.user_id===user.id;
      const accepted=r.status==='in_progress' && r.admin_id;
      const chatAllowed=accepted && (own || (isAdmin && r.admin_id===user.id));
      const chatButton=chatAllowed?`<button class="download secondary small-btn" type="button" data-report-action="chat" data-report-id="${r.id}">ОТКРЫТЬ ЧАТ</button>`:'';
      const actions=isAdmin&&r.status!=='closed'?`<div class="report-actions">${r.status==='open'?`<button class="download secondary small-btn" type="button" data-report-action="accept" data-report-id="${r.id}">ПРИНЯТЬ</button>`:''}${chatButton}<button class="download small-btn" type="button" data-report-action="close" data-report-id="${r.id}">ЗАКРЫТЬ</button></div>`:
        (chatButton?`<div class="report-actions">${chatButton}</div>`:'');
      return `<article class="report-card"><div class="report-card-top"><div><strong>@${escapeHtml(r.reporter_username||'unknown')}</strong><small>${new Date(r.created_at).toLocaleString('ru-RU')}</small></div><span class="report-status ${escapeHtml(r.status||'open')}">${reportStatusLabel(r.status)}</span></div><div class="report-text">${escapeHtml(r.message||'')}</div><div class="report-meta">${r.admin_username?'Администратор: @'+escapeHtml(r.admin_username):'Администратор ещё не назначен'}${own?' • твоё обращение':''}</div>${actions}</article>`;
    }).join('');
  }

  sendReport.onclick=async()=>{
    const {user,profile}=await getCurrentProfile();
    reportMessage.textContent='';
    if(!user){openAuth('login');return;}
    const message=reportText.value.trim();
    if(message.length<5){reportMessage.textContent='Опиши проблему подробнее.';return;}
    const {error}=await supabase.from('reports').insert({user_id:user.id,message});
    if(error){reportMessage.textContent='Ошибка отправки: '+(error.message||'проверь таблицу reports и RLS в Supabase.');return;}
    reportText.value=''; reportMessage.textContent='Обращение отправлено.'; await loadReports();
  };
  async function openReportChat(reportId){
    const {user}=await getCurrentProfile();
    if(!user)return;
    const {data:report,error:reportError}=await supabase.from('reports').select('id,user_id,reporter_username,message,status,admin_id,admin_username').eq('id',reportId).maybeSingle();
    if(reportError||!report||report.status!=='in_progress'||!report.admin_id||(report.user_id!==user.id&&report.admin_id!==user.id)){
      alert('Чат недоступен.');
      return;
    }
    activeChatReportId=reportId;
    chatReportInfo.textContent='@'+(report.reporter_username||'unknown')+' • '+(report.admin_username?'@'+report.admin_username:'администратор');
    chatMessages.innerHTML='<div class="empty-history">Загрузка...</div>';
    chatMessageStatus.textContent='';
    reportChatModal.classList.add('open'); reportChatModal.setAttribute('aria-hidden','false');
    await loadChatMessages();
    clearInterval(chatPollTimer);
    chatPollTimer=setInterval(loadChatMessages,3000);
    setTimeout(()=>chatInput.focus(),50);
  }
  async function loadChatMessages(){
    if(!activeChatReportId)return;
    const {data,error}=await supabase.from('report_chat_messages').select('id,sender_id,sender_username,message,created_at').eq('report_id',activeChatReportId).order('created_at',{ascending:true});
    if(error){chatMessages.innerHTML='<div class="empty-history">Не удалось загрузить чат: '+escapeHtml(error.message||'')+'</div>';return;}
    if(!data?.length){chatMessages.innerHTML='<div class="empty-history">Сообщений пока нет. Начните диалог.</div>';return;}
    const {data:{user}}=await supabase.auth.getUser();
    chatMessages.innerHTML=data.map(m=>{
      const mine=m.sender_id===user?.id;
      return `<div class="chat-message ${mine?'mine':'theirs'}"><div class="chat-message-head"><strong>${mine?'Вы':'@'+escapeHtml(m.sender_username||'user')}</strong><time>${new Date(m.created_at).toLocaleString('ru-RU')}</time></div><div class="chat-message-body">${escapeHtml(m.message||'')}</div></div>`;
    }).join('');
    chatMessages.scrollTop=chatMessages.scrollHeight;
  }
  function closeReportChatModal(){
    clearInterval(chatPollTimer); chatPollTimer=null; activeChatReportId=null;
    reportChatModal.classList.remove('open'); reportChatModal.setAttribute('aria-hidden','true');
  }
  closeReportChat.onclick=closeReportChatModal;
  reportChatModal.addEventListener('click',e=>{if(e.target===reportChatModal)closeReportChatModal();});
  sendChatMessage.onclick=async()=>{
    if(!activeChatReportId)return;
    const {user}=await getCurrentProfile();
    if(!user)return;
    const message=chatInput.value.trim();
    chatMessageStatus.textContent='';
    if(message.length<1){chatMessageStatus.textContent='Напиши сообщение.';return;}
    sendChatMessage.disabled=true;
    const {error}=await supabase.from('report_chat_messages').insert({report_id:activeChatReportId,sender_id:user.id,message});
    sendChatMessage.disabled=false;
    if(error){chatMessageStatus.textContent='Не удалось отправить сообщение: '+error.message;return;}
    chatInput.value=''; await loadChatMessages();
  };
  chatInput.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChatMessage.click();}});

  reportsList.addEventListener('click',async e=>{
    const btn=e.target.closest('[data-report-action]'); if(!btn)return;
    const {user,profile,isAdmin}=await getCurrentProfile(); if(!user)return;
    const id=btn.dataset.reportId, action=btn.dataset.reportAction;
    if(action==='chat'){await openReportChat(id);return;}
    if(!isAdmin)return;
    const patch=action==='accept'?{status:'in_progress',admin_id:user.id,admin_username:profile.username}:{status:'closed',admin_id:user.id,admin_username:profile.username};
    const {error}=await supabase.from('reports').update(patch).eq('id',id);
    if(error){alert('Не удалось обновить обращение: '+error.message);return;}
    await loadReports();
  });
  document.querySelector('[data-open="reports"]').addEventListener('click',loadReports);

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const password=document.getElementById('password').value;
    const msg=document.getElementById('authMessage'); msg.textContent='';
    const reg=authMode==='register'; let result;
    if(reg){
      const email=document.getElementById('email').value.trim();
      const display_name=document.getElementById('name').value.trim();
      const username=document.getElementById('username').value.trim();
      if(display_name.length<2){msg.textContent='Имя должно содержать минимум 2 символа.';return;}
      if(username.length<3){msg.textContent='Юзернейм должен содержать минимум 3 символа.';return;}
      if(!/^[a-zA-Z0-9_.-]+$/.test(username)){msg.textContent='Юзернейм: только латинские буквы, цифры, _, . и -.';return;}
      const {data:emailByUsername,error:lookupError}=await supabase.rpc('get_email_by_username',{login_username:username});
      if(lookupError){msg.textContent='Не удалось проверить юзернейм. Выполни новый SQL из архива в Supabase.';return;}
      if(emailByUsername){msg.textContent='Этот юзернейм уже занят.';return;}
      result=await supabase.auth.signUp({email,password,options:{data:{username,display_name}}});
    } else {
      const username=document.getElementById('username').value.trim();
      if(username.length<3){msg.textContent='Введи юзернейм.';return;}
      const {data:loginEmail,error:lookupError}=await supabase.rpc('get_email_by_username',{login_username:username});
      if(lookupError){msg.textContent='Не удалось найти юзернейм. Выполни новый SQL из архива в Supabase.';return;}
      if(!loginEmail){msg.textContent='Неправильный юзернейм или пароль.';return;}
      result=await supabase.auth.signInWithPassword({email:loginEmail,password});
    }
    if(result.error){
      const m=result.error.message.toLowerCase();
      if(reg && (m.includes('already registered') || m.includes('already exists') || m.includes('user already'))){msg.textContent='Аккаунт с этой почтой уже существует.';}
      else if(!reg && (m.includes('invalid login credentials') || m.includes('invalid credentials'))){msg.textContent='Неправильный юзернейм или пароль.';}
      else msg.textContent=result.error.message;
      return;
    }
    if(reg && !result.data.session){
      msg.textContent='Регистрация создана, но Supabase всё ещё требует подтверждение email. Отключи Email Confirmations в Authentication → Providers → Email.';
      return;
    }
    closeAuth(); await refreshUser(result.data.user); show('profile');
  });

  document.getElementById('signOut').onclick=async()=>{await supabase.auth.signOut();show('home');await refreshUser(null);};
  document.getElementById('avatarInput').addEventListener('change',async e=>{
    const file=e.target.files?.[0]; if(!file)return; const {data:{user}}=await supabase.auth.getUser(); if(!user)return;
    if(file.size>4*1024*1024){alert('Аватар должен быть меньше 4 МБ.');return;}
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg'; const path=`${user.id}/avatar.${ext}`;
    const {error:upErr}=await supabase.storage.from('avatars').upload(path,file,{upsert:true,contentType:file.type});
    if(upErr){alert('Не удалось загрузить аватар: '+upErr.message);return;}
    const {data:urlData}=supabase.storage.from('avatars').getPublicUrl(path); const url=urlData.publicUrl+'?v='+Date.now();
    const {error:dbErr}=await supabase.from('profiles').update({avatar_url:url}).eq('id',user.id); if(dbErr){alert('Аватар загружен, но профиль не обновился: '+dbErr.message);return;}
    await refreshUser(user);
  });

  document.querySelectorAll('.auth-download').forEach(link=>link.addEventListener('click',async e=>{
    e.preventDefault();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){openAuth('login');return;}
    const category=link.dataset.category,item=link.dataset.item;
    const {error}=await supabase.from('download_history').insert({user_id:user.id,item_name:item,category});
    if(error) console.warn('History error:',error.message);
    window.open(link.href, link.target || '_blank', 'noopener');
  }));

  supabase.auth.onAuthStateChange(async (_event,session)=>{
    await refreshUser(session?.user||null);
    if(document.getElementById('reports')?.classList.contains('active')) await loadReports();
  });
  const {data:{session}}=await supabase.auth.getSession();
  await refreshUser(session?.user||null);
  if(document.getElementById('reports')?.classList.contains('active')) await loadReports();
});
