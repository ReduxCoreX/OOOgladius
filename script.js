document.addEventListener('DOMContentLoaded', async () => {
  const { createClient } = window.supabase;
  const supabase = createClient(
    window.SUPABASE_URL,
    window.SUPABASE_PUBLISHABLE_KEY
  );

  const pages = [...document.querySelectorAll('.page')];
  const tabs = [...document.querySelectorAll('.top-tab')];

  function show(id) {
    if (!document.getElementById(id)) id = 'home';

    pages.forEach(p => {
      p.classList.toggle('active', p.id === id);
    });

    tabs.forEach(t => {
      t.classList.toggle('active', t.dataset.open === id);
    });

    history.replaceState(null, '', '#' + id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('[data-open]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      show(el.dataset.open);
    });
  });

  const initialHash = location.hash.slice(1);

  show(
    initialHash && document.getElementById(initialHash)
      ? initialHash
      : 'home'
  );

  /* =========================================
     AUTH
  ========================================= */

  const modal = document.getElementById('authModal');
  const form = document.getElementById('authForm');

  let authMode = 'login';

  function updateAuthMode() {
    const reg = authMode === 'register';

    document.getElementById('authTitle').textContent =
      reg ? 'РЕГИСТРАЦИЯ' : 'ВХОД';

    document.getElementById('authHint').textContent =
      reg
        ? 'Создай аккаунт ReduxCoreX.'
        : 'Войди по юзернейму и паролю.';

    document.getElementById('emailLabel').hidden = !reg;
    document.getElementById('email').required = reg;

    document.getElementById('nameLabel').hidden = !reg;
    document.getElementById('name').required = reg;

    document.getElementById('username').required = true;

    document.getElementById('authSubmit').textContent =
      reg ? 'СОЗДАТЬ АККАУНТ' : 'ВОЙТИ';

    document.getElementById('switchAuth').textContent =
      reg
        ? 'Уже есть аккаунт? Войти'
        : 'Нет аккаунта? Регистрация';
  }

  function openAuth(mode = 'login') {
    authMode = mode;

    updateAuthMode();

    document.getElementById('authMessage').textContent = '';

    form.reset();

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');

    setTimeout(() => {
      document
        .getElementById(authMode === 'register' ? 'name' : 'username')
        .focus();
    }, 50);
  }

  function closeAuth() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');

    form.reset();

    document.getElementById('authMessage').textContent = '';
  }

  document.getElementById('openLogin').onclick = () => openAuth('login');

  document.getElementById('openRegister').onclick = () =>
    openAuth('register');

  document.getElementById('closeAuth').onclick = closeAuth;

  document.getElementById('switchAuth').onclick = () => {
    authMode = authMode === 'login' ? 'register' : 'login';
    updateAuthMode();
  };

  modal.addEventListener('click', e => {
    if (e.target === modal) closeAuth();
  });

  /* =========================================
     PROFILE
  ========================================= */

  async function ensureProfile(user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!data) {
      const username =
        user.user_metadata?.username ||
        user.email?.split('@')[0] ||
        'user';

      const display_name =
        user.user_metadata?.display_name ||
        username;

      await supabase.from('profiles').insert({
        id: user.id,
        username,
        display_name
      });

      return {
        username,
        display_name
      };
    }

    return data;
  }

  function avatarFallback(name) {
    return (
      'data:image/svg+xml;charset=UTF-8,' +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg"
             width="160"
             height="160">
          <rect
            width="100%"
            height="100%"
            rx="80"
            fill="#120811"
          />
          <text
            x="50%"
            y="57%"
            text-anchor="middle"
            fill="#ff2857"
            font-size="64"
            font-family="Arial"
          >
            ${(name || '?')[0].toUpperCase()}
          </text>
        </svg>
      `)
    );
  }

  const loggedOut = document.getElementById('loggedOut');
  const loggedIn = document.getElementById('loggedIn');
  const accountText = document.getElementById('accountText');
  const topAvatar = document.getElementById('topAvatar');

  const adminBadge = document.getElementById('adminBadge');

  let topAdminBadge =
    document.getElementById('topAdminBadge');

  const profileName =
    document.getElementById('profileName');

  const profileDisplayName =
    document.getElementById('profileDisplayName');

  const profileUsername =
    document.getElementById('profileUsername');

  const profileEmail =
    document.getElementById('profileEmail');

  const profileAvatar =
    document.getElementById('profileAvatar');

  const historyBox =
    document.getElementById('history');

  const emailToggle =
    document.getElementById('emailToggle');

  const usernameToggle =
    document.getElementById('usernameToggle');

  /* =========================================
     CURRENT USER
  ========================================= */

  async function getCurrentProfile() {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        user: null,
        profile: null,
        isAdmin: false,
        isChief: false,
        isAdministrator: false
      };
    }

    const profile = await ensureProfile(user);

    const username =
      String(profile.username || '')
        .trim()
        .toLowerCase();

    const isAdministrator =
      username === 'administrator';

    const isChief =
      isAdministrator;

    const isAdmin =
      Boolean(profile.is_admin) ||
      isAdministrator;

    return {
      user,
      profile,
      isAdmin,
      isChief,
      isAdministrator
    };
  }

  /* =========================================
     ADMIN BADGE
  ========================================= */

  function updateAdminBadge(
    name,
    dbIsAdmin = false,
    dbIsChief = false
  ) {
    const username =
      String(name || '')
        .trim()
        .toLowerCase();

    const isAdministrator =
      username === 'administrator';

    const isAdmin =
      Boolean(dbIsAdmin) ||
      isAdministrator;

    const isChief =
      isAdministrator;

    if (adminBadge) {
      adminBadge.hidden = !isAdmin;

      adminBadge.textContent =
        isChief
          ? 'CHIEF ADMIN'
          : 'ADMIN';
    }

    if (isAdmin) {
      if (!topAdminBadge) {
        topAdminBadge =
          document.createElement('span');

        topAdminBadge.className =
          'admin-badge top-admin-badge';

        topAdminBadge.id =
          'topAdminBadge';

        const accountChip =
          document.getElementById('accountChip');

        if (accountChip) {
          accountChip.insertBefore(
            topAdminBadge,
            topAvatar
          );
        }
      }

      topAdminBadge.hidden = false;

      topAdminBadge.textContent =
        isChief
          ? 'CHIEF ADMIN'
          : 'ADMIN';

    } else if (topAdminBadge) {
      topAdminBadge.hidden = true;
    }
  }

  /* =========================================
     REFRESH USER
  ========================================= */

  async function refreshUser(user) {
    if (adminBadge) {
      adminBadge.hidden = true;
    }

    if (topAdminBadge) {
      topAdminBadge.hidden = true;
    }

    if (!user) {
      loggedOut.hidden = false;
      loggedIn.hidden = true;

      accountText.textContent = 'ONLINE';

      topAvatar.hidden = true;

      return;
    }

    const profile =
      await ensureProfile(user);

    const name =
      profile.display_name ||
      profile.username ||
      user.user_metadata?.display_name ||
      user.user_metadata?.username ||
      'User';

    loggedOut.hidden = true;
    loggedIn.hidden = false;

    accountText.textContent =
      name.toUpperCase();

    profileName.textContent = name;

    profileDisplayName.textContent =
      name;

    profileUsername.textContent =
      profile.username || '';

    profileUsername.classList.add(
      'private-value'
    );

    profileUsername.classList.remove(
      'private-visible'
    );

    profileEmail.textContent =
      user.email || '';

    profileEmail.classList.add(
      'email-blurred'
    );

    profileEmail.classList.remove(
      'email-visible'
    );

    emailToggle.textContent =
      'ПОКАЗАТЬ';

    usernameToggle.textContent =
      'ПОКАЗАТЬ';

    updateAdminBadge(
      profile.username,
      profile.is_admin,
      profile.is_chief_admin
    );

    const avatar =
      profile.avatar_url ||
      user.user_metadata?.avatar_url ||
      avatarFallback(name);

    profileAvatar.src = avatar;

    topAvatar.src = avatar;
    topAvatar.hidden = false;

    await loadHistory(user.id);
  }

  /* =========================================
     DOWNLOAD HISTORY
  ========================================= */

  async function loadHistory(userId) {
    const {
      data,
      error
    } = await supabase
      .from('download_history')
      .select(
        'item_name,category,downloaded_at'
      )
      .eq('user_id', userId)
      .order(
        'downloaded_at',
        { ascending: false }
      );

    if (error) {
      historyBox.innerHTML =
        '<div class="empty-history">Не удалось загрузить историю.</div>';

      return;
    }

    const categories = [
      {
        key: 'REDUX',
        title: 'REDUX',
        number: '01'
      },
      {
        key: 'GUN PACK',
        title: 'GUN PACK',
        number: '02'
      },
      {
        key: 'BODY ARMOR',
        title: 'BODY ARMOR',
        number: '03'
      }
    ];

    const groups = {};

    categories.forEach(c => {
      groups[c.key] = {};
    });

    (data || []).forEach(row => {
      const category =
        groups[row.category]
          ? row.category
          : 'REDUX';

      const item =
        row.item_name ||
        'Без названия';

      if (!groups[category][item]) {
        groups[category][item] = {
          count: 0,
          last: row.downloaded_at
        };
      }

      groups[category][item].count++;

      if (
        new Date(row.downloaded_at) >
        new Date(groups[category][item].last)
      ) {
        groups[category][item].last =
          row.downloaded_at;
      }
    });

    historyBox.innerHTML =
      '<div class="download-categories">' +
      categories
        .map(c => {
          const items =
            Object.entries(groups[c.key]);

          return `
            <section class="download-category">
              <div class="category-title">
                <span>
                  ${c.number} / ${escapeHtml(c.title)}
                </span>

                <strong>
                  ${
                    items.length
                      ? items.length +
                        ' ' +
                        (
                          items.length === 1
                            ? 'мод'
                            : 'мода/модов'
                        )
                      : 'ПУСТО'
                  }
                </strong>
              </div>

              ${
                items.length
                  ? items
                      .map(
                        ([item, info]) => `
                          <div class="history-row">
                            <div>
                              <span>
                                ${escapeHtml(c.title)}
                              </span>

                              <strong>
                                ${escapeHtml(item)}
                              </strong>

                              <small>
                                Скачано:
                                <b>${info.count}</b>
                                ${
                                  info.count === 1
                                    ? 'раз'
                                    : 'раза'
                                }
                              </small>
                            </div>

                            <time>
                              Последний раз:
                              ${new Date(
                                info.last
                              ).toLocaleString('ru-RU')}
                            </time>
                          </div>
                        `
                      )
                      .join('')
                  : `
                    <div class="empty-category">
                      Пока ничего не скачано.
                    </div>
                  `
              }
            </section>
          `;
        })
        .join('') +
      '</div>';
  }

  function escapeHtml(s) {
    return String(s).replace(
      /[&<>'"]/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[c])
    );
  }

  /* =========================================
     PROFILE EDIT
  ========================================= */

  const nicknameInput =
    document.getElementById('nicknameInput');

  const saveNickname =
    document.getElementById('saveNickname');

  const nicknameMessage =
    document.getElementById('nicknameMessage');

  emailToggle.onclick = () => {
    const visible =
      profileEmail.classList.toggle(
        'email-visible'
      );

    profileEmail.classList.toggle(
      'email-blurred',
      !visible
    );

    emailToggle.textContent =
      visible
        ? 'СКРЫТЬ'
        : 'ПОКАЗАТЬ';
  };

  usernameToggle.onclick = () => {
    const visible =
      profileUsername.classList.toggle(
        'private-visible'
      );

    profileUsername.classList.toggle(
      'private-value',
      !visible
    );

    usernameToggle.textContent =
      visible
        ? 'СКРЫТЬ'
        : 'ПОКАЗАТЬ';
  };

  saveNickname.onclick = async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return;

    const display_name =
      nicknameInput.value.trim();

    nicknameMessage.textContent = '';

    if (display_name.length < 2) {
      nicknameMessage.textContent =
        'Имя должно содержать минимум 2 символа.';

      return;
    }

    const { error } =
      await supabase
        .from('profiles')
        .update({ display_name })
        .eq('id', user.id);

    if (error) {
      nicknameMessage.textContent =
        'Не удалось изменить никнейм: ' +
        error.message;

      return;
    }

    nicknameMessage.textContent =
      'Имя изменено.';

    nicknameInput.value = '';

    await refreshUser(user);
  };

  /* =========================================
     PEOPLE / SEARCH
  ========================================= */

  const userSearch =
    document.getElementById('userSearch');

  const userSearchBtn =
    document.getElementById('userSearchBtn');

  const userResults =
    document.getElementById('userResults');

  const userProfileModal =
    document.getElementById('userProfileModal');

  const closeUserProfile =
    document.getElementById('closeUserProfile');

  const publicProfileAvatar =
    document.getElementById(
      'publicProfileAvatar'
    );

  const publicProfileName =
    document.getElementById(
      'publicProfileName'
    );

  const publicProfileUsername =
    document.getElementById(
      'publicProfileUsername'
    );

  const publicProfileJoined =
    document.getElementById(
      'publicProfileJoined'
    );

  const publicAdminBadge =
    document.getElementById(
      'publicAdminBadge'
    );

  const publicAdminActions =
    document.getElementById(
      'publicAdminActions'
    );

  const toggleUserAdmin =
    document.getElementById(
      'toggleUserAdmin'
    );

  const adminActionStatus =
    document.getElementById(
      'adminActionStatus'
    );

  const reportGuest =
    document.getElementById(
      'reportGuest'
    );

  const reportComposer =
    document.getElementById(
      'reportComposer'
    );

  const reportText =
    document.getElementById(
      'reportText'
    );

  const sendReport =
    document.getElementById(
      'sendReport'
    );

  const reportMessage =
    document.getElementById(
      'reportMessage'
    );

  const reportsList =
    document.getElementById(
      'reportsList'
    );

  const reportsTitle =
    document.getElementById(
      'reportsTitle'
    );

  const reportChatModal =
    document.getElementById(
      'reportChatModal'
    );

  const closeReportChat =
    document.getElementById(
      'closeReportChat'
    );

  const chatReportInfo =
    document.getElementById(
      'chatReportInfo'
    );

  const chatMessages =
    document.getElementById(
      'chatMessages'
    );

  const chatInput =
    document.getElementById(
      'chatInput'
    );

  const sendChatMessage =
    document.getElementById(
      'sendChatMessage'
    );

  const chatMessageStatus =
    document.getElementById(
      'chatMessageStatus'
    );

  let activeChatReportId = null;
  let chatPollTimer = null;

  /* =========================================
     SEARCH USERS
  ========================================= */

  async function searchUsers() {
    const q =
      userSearch.value.trim();

    if (q.length < 2) {
      userResults.innerHTML =
        '<div class="empty-history">Введи минимум 2 символа.</div>';

      return;
    }

    userResults.innerHTML =
      '<div class="empty-history">Поиск...</div>';

    const {
      data,
      error
    } = await supabase
      .from('profiles')
      .select(
        'id,username,display_name,avatar_url,created_at,is_admin,is_chief_admin'
      )
      .ilike(
        'username',
        '%' + q + '%'
      )
      .order('username')
      .limit(30);

    if (error) {
      userResults.innerHTML =
        '<div class="empty-history">Не удалось выполнить поиск.</div>';

      return;
    }

    if (!data?.length) {
      userResults.innerHTML =
        '<div class="empty-history">Участники не найдены.</div>';

      return;
    }

    userResults.innerHTML =
      data
        .map(u => {
          const name =
            u.display_name ||
            u.username ||
            'User';

          const username =
            String(u.username || '')
              .trim()
              .toLowerCase();

          const isAdministrator =
            username === 'administrator';

          const isAdmin =
            Boolean(u.is_admin) ||
            isAdministrator;

          const isChief =
            isAdministrator;

          const avatar =
            u.avatar_url ||
            avatarFallback(name);

          return `
            <div
              class="user-card"
              data-user-id="${escapeHtml(u.id)}"
            >
              <img
                src="${escapeHtml(avatar)}"
                alt=""
              >

              <div class="user-card-info">
                <strong>
                  ${escapeHtml(name)}
                </strong>

                <span>
                  @${escapeHtml(u.username || '')}
                </span>
              </div>

              ${
                isAdmin
                  ? `
                    <span class="admin-badge user-card-admin">
                      ${
                        isChief
                          ? 'CHIEF ADMIN'
                          : 'ADMIN'
                      }
                    </span>
                  `
                  : ''
              }

              <button
                class="download secondary small-btn profile-open-btn"
                type="button"
                data-user-profile="${escapeHtml(u.id)}"
              >
                ПРОФИЛЬ
              </button>
            </div>
          `;
        })
        .join('');
  }

  userSearchBtn.onclick =
    searchUsers;

  const reportLogin =
    document.getElementById(
      'reportLogin'
    );

  if (reportLogin) {
    reportLogin.onclick = () =>
      openAuth('login');
  }

  userSearch.addEventListener(
    'keydown',
    e => {
      if (e.key === 'Enter') {
        searchUsers();
      }
    }
  );

  /* =========================================
     PUBLIC PROFILE
  ========================================= */

  let publicProfileUserId = null;

  async function openPublicProfile(id) {
    const {
      data,
      error
    } = await supabase
      .from('profiles')
      .select(
        'id,username,display_name,avatar_url,created_at,is_admin,is_chief_admin'
      )
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return;

    publicProfileUserId = id;

    const name =
      data.display_name ||
      data.username ||
      'User';

    publicProfileName.textContent =
      name;

    publicProfileUsername.textContent =
      '@' + (data.username || '');

    publicProfileJoined.textContent =
      data.created_at
        ? 'Участник с ' +
          new Date(
            data.created_at
          ).toLocaleDateString('ru-RU')
        : '';

    publicProfileAvatar.src =
      data.avatar_url ||
      avatarFallback(name);

    const targetUsername =
      String(data.username || '')
        .trim()
        .toLowerCase();

    const targetIsAdministrator =
      targetUsername === 'administrator';

    const targetAdmin =
      Boolean(data.is_admin) ||
      targetIsAdministrator;

    publicAdminBadge.hidden =
      !targetAdmin;

    const {
      user,
      profile,
      isAdministrator
    } = await getCurrentProfile();

    /*
      ВАЖНО:
      Кнопка управления ADMIN
      появляется ТОЛЬКО у Administrator.
    */

    const canManage =
      Boolean(user) &&
      Boolean(isAdministrator) &&
      String(profile?.id || '') !==
        String(id);

    publicAdminActions.hidden =
      !canManage;

    adminActionStatus.textContent = '';

    if (canManage) {
      toggleUserAdmin.textContent =
        targetAdmin
          ? 'ЗАБРАТЬ ADMIN'
          : 'ВЫДАТЬ ADMIN';

      toggleUserAdmin.disabled = false;

      toggleUserAdmin.dataset.targetAdmin =
        targetAdmin
          ? 'true'
          : 'false';
    }

    userProfileModal.classList.add(
      'open'
    );

    userProfileModal.setAttribute(
      'aria-hidden',
      'false'
    );
  }

  userResults.addEventListener(
    'click',
    e => {
      const profileBtn =
        e.target.closest(
          '[data-user-profile]'
        );

      if (profileBtn) {
        e.stopPropagation();

        openPublicProfile(
          profileBtn.dataset.userProfile
        );

        return;
      }

      const card =
        e.target.closest(
          '[data-user-id]'
        );

      if (card) {
        openPublicProfile(
          card.dataset.userId
        );
      }
    }
  );

  /* =========================================
     ADMIN MANAGEMENT BUTTON
  ========================================= */

  toggleUserAdmin.onclick = async () => {
    if (!publicProfileUserId) return;

    const {
      user,
      profile,
      isAdministrator
    } = await getCurrentProfile();

    /*
      Жёсткая проверка:
      только аккаунт Administrator.
    */

    const username =
      String(profile?.username || '')
        .trim()
        .toLowerCase();

    if (
      !user ||
      !isAdministrator ||
      username !== 'administrator'
    ) {
      alert('Недостаточно прав.');
      return;
    }

    /*
      Нельзя управлять самим Administrator.
    */

    if (
      String(profile.id) ===
      String(publicProfileUserId)
    ) {
      return;
    }

    const targetAdmin =
      toggleUserAdmin.dataset.targetAdmin ===
      'true';

    toggleUserAdmin.disabled = true;

    adminActionStatus.textContent =
      'Обновление...';

    const {
      error
    } = await supabase.rpc(
      'set_user_admin',
      {
        target_user_id:
          publicProfileUserId,

        make_admin:
          !targetAdmin
      }
    );

    toggleUserAdmin.disabled = false;

    if (error) {
      adminActionStatus.textContent =
        'Ошибка: ' +
        (error.message || '');

      return;
    }

    adminActionStatus.textContent =
      !targetAdmin
        ? 'Админ выдан.'
        : 'Админ забран.';

    await openPublicProfile(
      publicProfileUserId
    );

    await searchUsers();
  };

  closeUserProfile.onclick = () => {
    userProfileModal.classList.remove(
      'open'
    );

    userProfileModal.setAttribute(
      'aria-hidden',
      'true'
    );
  };

  userProfileModal.addEventListener(
    'click',
    e => {
      if (
        e.target ===
        userProfileModal
      ) {
        closeUserProfile.onclick();
      }
    }
  );

  /* =========================================
     REPORTS
  ========================================= */

  function reportStatusLabel(status) {
    if (status === 'closed') {
      return 'ЗАКРЫТО';
    }

    if (status === 'in_progress') {
      return 'ПРИНЯТО';
    }

    return 'НОВОЕ';
  }

  async function loadReports() {
    const {
      user,
      profile,
      isAdmin
    } = await getCurrentProfile();

    if (!user) {
      reportGuest.hidden = false;
      reportComposer.hidden = true;

      reportsTitle.textContent =
        'МОИ ОБРАЩЕНИЯ';

      reportsList.innerHTML =
        '<div class="empty-history">Войди в аккаунт, чтобы увидеть свои обращения.</div>';

      return;
    }

    reportGuest.hidden = true;
    reportComposer.hidden = false;

    reportsTitle.textContent =
      isAdmin
        ? 'ВСЕ ОБРАЩЕНИЯ'
        : 'МОИ ОБРАЩЕНИЯ';

    const {
      data,
      error
    } = await supabase
      .from('reports')
      .select(
        'id,user_id,reporter_username,message,status,admin_id,admin_username,created_at,updated_at'
      )
      .order(
        'created_at',
        { ascending: false }
      );

    if (error) {
      reportsList.innerHTML =
        '<div class="empty-history">Не удалось загрузить обращения: ' +
        escapeHtml(error.message || '') +
        '</div>';

      return;
    }

    if (!data?.length) {
      reportsList.innerHTML =
        '<div class="empty-history">Обращений пока нет.</div>';

      return;
    }

    reportsList.innerHTML =
      data
        .map(r => {
          const own =
            r.user_id === user.id;

          const accepted =
            (
              r.status === 'in_progress' ||
              r.status === 'closed'
            ) &&
            r.admin_id;

          const chatAllowed =
            accepted &&
            (
              own ||
              (
                isAdmin &&
                r.admin_id === user.id
              )
            );

          const chatButton =
            chatAllowed
              ? `
                <button
                  class="download secondary small-btn"
                  type="button"
                  data-report-action="chat"
                  data-report-id="${r.id}"
                >
                  ОТКРЫТЬ ЧАТ
                </button>
              `
              : '';

          const actions =
            isAdmin &&
            r.status !== 'closed'
              ? `
                <div class="report-actions">

                  ${
                    r.status === 'open'
                      ? `
                        <button
                          class="download secondary small-btn"
                          type="button"
                          data-report-action="accept"
                          data-report-id="${r.id}"
                        >
                          ПРИНЯТЬ
                        </button>
                      `
                      : ''
                  }

                  ${chatButton}

                  <button
                    class="download small-btn"
                    type="button"
                    data-report-action="close"
                    data-report-id="${r.id}"
                  >
                    ЗАКРЫТЬ
                  </button>

                </div>
              `
              : chatButton
                ? `
                  <div class="report-actions">
                    ${chatButton}
                  </div>
                `
                : '';

          return `
            <article class="report-card">

              <div class="report-card-top">

                <div>
                  <strong>
                    @${escapeHtml(
                      r.reporter_username ||
                      'unknown'
                    )}
                  </strong>

                  <small>
                    ${new Date(
                      r.created_at
                    ).toLocaleString(
                      'ru-RU'
                    )}
                  </small>
                </div>

                <span
                  class="report-status ${escapeHtml(
                    r.status || 'open'
                  )}"
                >
                  ${reportStatusLabel(
                    r.status
                  )}
                </span>

              </div>

              <div class="report-text">
                ${escapeHtml(
                  r.message || ''
                )}
              </div>

              <div class="report-meta">
                ${
                  r.admin_username
                    ? 'Администратор: @' +
                      escapeHtml(
                        r.admin_username
                      )
                    : 'Администратор ещё не назначен'
                }

                ${
                  own
                    ? ' • твоё обращение'
                    : ''
                }
              </div>

              ${actions}

            </article>
          `;
        })
        .join('');
  }

  /* =========================================
     SEND REPORT
  ========================================= */

  sendReport.onclick = async () => {
    const {
      user
    } = await getCurrentProfile();

    reportMessage.textContent = '';

    if (!user) {
      openAuth('login');
      return;
    }

    const message =
      reportText.value.trim();

    if (message.length < 5) {
      reportMessage.textContent =
        'Опиши проблему подробнее.';

      return;
    }

    const {
      error
    } = await supabase
      .from('reports')
      .insert({
        user_id: user.id,
        message
      });

    if (error) {
      reportMessage.textContent =
        'Ошибка отправки: ' +
        (
          error.message ||
          'проверь таблицу reports и RLS в Supabase.'
        );

      return;
    }

    reportText.value = '';

    reportMessage.textContent =
      'Обращение отправлено.';

    await loadReports();
  };

  /* =========================================
     REPORT CHAT
  ========================================= */

  async function openReportChat(reportId) {
    const {
      user
    } = await getCurrentProfile();

    if (!user) return;

    const {
      data: report,
      error: reportError
    } = await supabase
      .from('reports')
      .select(
        'id,user_id,reporter_username,message,status,admin_id,admin_username'
      )
      .eq('id', reportId)
      .maybeSingle();

    if (
      reportError ||
      !report ||
      ![
        'in_progress',
        'closed'
      ].includes(report.status) ||
      !report.admin_id ||
      (
        report.user_id !== user.id &&
        report.admin_id !== user.id
      )
    ) {
      alert('Чат недоступен.');
      return;
    }

    activeChatReportId =
      reportId;

    chatReportInfo.textContent =
      '@' +
      (
        report.reporter_username ||
        'unknown'
      ) +
      ' • ' +
      (
        report.admin_username
          ? '@' +
            report.admin_username
          : 'администратор'
      ) +
      (
        report.status === 'closed'
          ? ' • CLOSED'
          : ''
      );

    chatInput.disabled =
      report.status === 'closed';

    sendChatMessage.disabled =
      report.status === 'closed';

    chatMessages.innerHTML =
      '<div class="empty-history">Загрузка...</div>';

    chatMessageStatus.textContent = '';

    reportChatModal.classList.add(
      'open'
    );

    reportChatModal.setAttribute(
      'aria-hidden',
      'false'
    );

    await loadChatMessages();

    clearInterval(chatPollTimer);

    chatPollTimer =
      setInterval(
        loadChatMessages,
        3000
      );

    setTimeout(
      () => chatInput.focus(),
      50
    );
  }

  async function loadChatMessages() {
    if (!activeChatReportId) return;

    const {
      data,
      error
    } = await supabase
      .from('report_chat_messages')
      .select(
        'id,sender_id,sender_username,message,created_at'
      )
      .eq(
        'report_id',
        activeChatReportId
      )
      .order(
        'created_at',
        { ascending: true }
      );

    if (error) {
      chatMessages.innerHTML =
        '<div class="empty-history">Не удалось загрузить чат: ' +
        escapeHtml(
          error.message || ''
        ) +
        '</div>';

      return;
    }

    const {
      data: report
    } = await supabase
      .from('reports')
      .select(
        'message,status,reporter_username,created_at'
      )
      .eq(
        'id',
        activeChatReportId
      )
      .maybeSingle();

    const {
      data: {
        user
      }
    } =
      await supabase.auth.getUser();

    const original =
      report
        ? `
          <div class="chat-message theirs report-original">

            <div class="chat-message-head">

              <strong>
                @${escapeHtml(
                  report.reporter_username ||
                  'user'
                )}
                • ОБРАЩЕНИЕ
              </strong>

              <time>
                ${new Date(
                  report.created_at
                ).toLocaleString(
                  'ru-RU'
                )}
              </time>

            </div>

            <div class="chat-message-body">
              ${escapeHtml(
                report.message || ''
              )}
            </div>

          </div>
        `
        : '';

    const history =
      data
        ?.map(m => {
          const mine =
            m.sender_id === user?.id;

          return `
            <div
              class="chat-message ${
                mine
                  ? 'mine'
                  : 'theirs'
              }"
            >

              <div class="chat-message-head">

                <strong>
                  ${
                    mine
                      ? 'Вы'
                      : '@' +
                        escapeHtml(
                          m.sender_username ||
                          'user'
                        )
                  }
                </strong>

                <time>
                  ${new Date(
                    m.created_at
                  ).toLocaleString(
                    'ru-RU'
                  )}
                </time>

              </div>

              <div class="chat-message-body">
                ${escapeHtml(
                  m.message || ''
                )}
              </div>

            </div>
          `;
        })
        .join('') || '';

    chatMessages.innerHTML =
      original +
      (
        history ||
        '<div class="empty-history">История сообщений пока пуста.</div>'
      );

    if (
      report?.status === 'closed'
    ) {
      chatMessageStatus.textContent =
        'Обращение закрыто. История доступна только для просмотра.';
    }

    chatMessages.scrollTop =
      chatMessages.scrollHeight;
  }

  function closeReportChatModal() {
    clearInterval(
      chatPollTimer
    );

    chatPollTimer = null;
    activeChatReportId = null;

    reportChatModal.classList.remove(
      'open'
    );

    reportChatModal.setAttribute(
      'aria-hidden',
      'true'
    );

    chatInput.disabled = false;
    sendChatMessage.disabled = false;

    chatInput.value = '';

    chatMessageStatus.textContent = '';
  }

  closeReportChat.onclick =
    closeReportChatModal;

  reportChatModal.addEventListener(
    'click',
    e => {
      if (
        e.target ===
        reportChatModal
      ) {
        closeReportChatModal();
      }
    }
  );

  sendChatMessage.onclick =
    async () => {
      if (!activeChatReportId) return;

      const {
        user
      } = await getCurrentProfile();

      if (!user) return;

      const message =
        chatInput.value.trim();

      chatMessageStatus.textContent = '';

      if (message.length < 1) {
        chatMessageStatus.textContent =
          'Напиши сообщение.';

        return;
      }

      sendChatMessage.disabled =
        true;

      const {
        error
      } = await supabase
        .from(
          'report_chat_messages'
        )
        .insert({
          report_id:
            activeChatReportId,

          sender_id:
            user.id,

          message
        });

      sendChatMessage.disabled =
        false;

      if (error) {
        chatMessageStatus.textContent =
          'Не удалось отправить сообщение: ' +
          error.message;

        return;
      }

      chatInput.value = '';

      await loadChatMessages();
    };

  chatInput.addEventListener(
    'keydown',
    e => {
      if (
        e.key === 'Enter' &&
        !e.shiftKey
      ) {
        e.preventDefault();
        sendChatMessage.click();
      }
    }
  );

  /* =========================================
     REPORT ACTIONS
  ========================================= */

  reportsList.addEventListener(
    'click',
    async e => {
      const btn =
        e.target.closest(
          '[data-report-action]'
        );

      if (!btn) return;

      const {
        user,
        profile,
        isAdmin
      } = await getCurrentProfile();

      if (!user) return;

      const id =
        btn.dataset.reportId;

      const action =
        btn.dataset.reportAction;

      if (action === 'chat') {
        await openReportChat(id);
        return;
      }

      if (!isAdmin) return;

      const patch =
        action === 'accept'
          ? {
              status:
                'in_progress',
              admin_id:
                user.id,
              admin_username:
                profile.username
            }
          : {
              status:
                'closed',
              admin_id:
                user.id,
              admin_username:
                profile.username
            };

      const {
        error
      } = await supabase
        .from('reports')
        .update(patch)
        .eq('id', id);

      if (error) {
        alert(
          'Не удалось обновить обращение: ' +
          error.message
        );

        return;
      }

      await loadReports();
    }
  );

  const reportsTab =
    document.querySelector(
      '[data-open="reports"]'
    );

  if (reportsTab) {
    reportsTab.addEventListener(
      'click',
      loadReports
    );
  }

  /* =========================================
     AUTH SUBMIT
  ========================================= */

  form.addEventListener(
    'submit',
    async e => {
      e.preventDefault();

      const password =
        document.getElementById(
          'password'
        ).value;

      const msg =
        document.getElementById(
          'authMessage'
        );

      msg.textContent = '';

      const reg =
        authMode === 'register';

      let result;

      if (reg) {
        const email =
          document.getElementById(
            'email'
          ).value.trim();

        const display_name =
          document.getElementById(
            'name'
          ).value.trim();

        const username =
          document.getElementById(
            'username'
          ).value.trim();

        if (
          display_name.length < 2
        ) {
          msg.textContent =
            'Имя должно содержать минимум 2 символа.';

          return;
        }

        if (
          username.length < 3
        ) {
          msg.textContent =
            'Юзернейм должен содержать минимум 3 символа.';

          return;
        }

        if (
          !/^[a-zA-Z0-9_.-]+$/.test(
            username
          )
        ) {
          msg.textContent =
            'Юзернейм: только латинские буквы, цифры, _, . и -.';

          return;
        }

        const {
          data: emailByUsername,
          error: lookupError
        } =
          await supabase.rpc(
            'get_email_by_username',
            {
              login_username:
                username
            }
          );

        if (lookupError) {
          msg.textContent =
            'Не удалось проверить юзернейм. Выполни новый SQL из архива в Supabase.';

          return;
        }

        if (emailByUsername) {
          msg.textContent =
            'Этот юзернейм уже занят.';

          return;
        }

        result =
          await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username,
                display_name
              }
            }
          });

      } else {
        const username =
          document.getElementById(
            'username'
          ).value.trim();

        if (
          username.length < 3
        ) {
          msg.textContent =
            'Введи юзернейм.';

          return;
        }

        const {
          data: loginEmail,
          error: lookupError
        } =
          await supabase.rpc(
            'get_email_by_username',
            {
              login_username:
                username
            }
          );

        if (lookupError) {
          msg.textContent =
            'Не удалось найти юзернейм. Выполни новый SQL из архива в Supabase.';

          return;
        }

        if (!loginEmail) {
          msg.textContent =
            'Неправильный юзернейм или пароль.';

          return;
        }

        result =
          await supabase.auth.signInWithPassword({
            email: loginEmail,
            password
          });
      }

      if (result.error) {
        const m =
          result.error.message.toLowerCase();

        if (
          reg &&
          (
            m.includes(
              'already registered'
            ) ||
            m.includes(
              'already exists'
            ) ||
            m.includes(
              'user already'
            )
          )
        ) {
          msg.textContent =
            'Аккаунт с этой почтой уже существует.';

        } else if (
          !reg &&
          (
            m.includes(
              'invalid login credentials'
            ) ||
            m.includes(
              'invalid credentials'
            )
          )
        ) {
          msg.textContent =
            'Неправильный юзернейм или пароль.';

        } else {
          msg.textContent =
            result.error.message;
        }

        return;
      }

      if (
        reg &&
        !result.data.session
      ) {
        msg.textContent =
          'Регистрация создана, но Supabase всё ещё требует подтверждение email. Отключи Email Confirmations в Authentication → Providers → Email.';

        return;
      }

      closeAuth();

      await refreshUser(
        result.data.user
      );

      show('profile');
    }
  );

  /* =========================================
     SIGN OUT
  ========================================= */

  document.getElementById(
    'signOut'
  ).onclick = async () => {
    await supabase.auth.signOut();

    show('home');

    await refreshUser(null);
  };

  /* =========================================
     AVATAR
  ========================================= */

  document.getElementById(
    'avatarInput'
  ).addEventListener(
    'change',
    async e => {
      const file =
        e.target.files?.[0];

      if (!file) return;

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) return;

      if (
        file.size >
        4 * 1024 * 1024
      ) {
        alert(
          'Аватар должен быть меньше 4 МБ.'
        );

        return;
      }

      const ext =
        (
          file.name
            .split('.')
            .pop() ||
          'jpg'
        )
          .toLowerCase()
          .replace(
            /[^a-z0-9]/g,
            ''
          ) || 'jpg';

      const path =
        `${user.id}/avatar.${ext}`;

      const {
        error: upErr
      } =
        await supabase.storage
          .from('avatars')
          .upload(
            path,
            file,
            {
              upsert: true,
              contentType:
                file.type
            }
          );

      if (upErr) {
        alert(
          'Не удалось загрузить аватар: ' +
          upErr.message
        );

        return;
      }

      const {
        data: urlData
      } =
        supabase.storage
          .from('avatars')
          .getPublicUrl(path);

      const url =
        urlData.publicUrl +
        '?v=' +
        Date.now();

      const {
        error: dbErr
      } =
        await supabase
          .from('profiles')
          .update({
            avatar_url: url
          })
          .eq('id', user.id);

      if (dbErr) {
        alert(
          'Аватар загружен, но профиль не обновился: ' +
          dbErr.message
        );

        return;
      }

      await refreshUser(user);
    }
  );

  /* =========================================
     DOWNLOADS
  ========================================= */

  document
    .querySelectorAll('.auth-download')
    .forEach(link => {
      link.addEventListener(
        'click',
        async e => {
          e.preventDefault();

          const {
            data: { user }
          } =
            await supabase.auth.getUser();

          if (!user) {
            openAuth('login');
            return;
          }

          const category =
            link.dataset.category;

          const item =
            link.dataset.item;

          const {
            error
          } =
            await supabase
              .from(
                'download_history'
              )
              .insert({
                user_id: user.id,
                item_name: item,
                category
              });

          if (error) {
            console.warn(
              'History error:',
              error.message
            );
          }

          window.open(
            link.href,
            link.target || '_blank',
            'noopener'
          );
        }
      );
    });

  /* =========================================
     AUTH STATE
  ========================================= */

  supabase.auth.onAuthStateChange(
    async (_event, session) => {
      await refreshUser(
        session?.user || null
      );

      if (
        document
          .getElementById('reports')
          ?.classList.contains(
            'active'
          )
      ) {
        await loadReports();
      }
    }
  );

  const {
    data: { session }
  } =
    await supabase.auth.getSession();

  await refreshUser(
    session?.user || null
  );

  if (
    document
      .getElementById('reports')
      ?.classList.contains(
        'active'
      )
  ) {
    await loadReports();
  }
});
