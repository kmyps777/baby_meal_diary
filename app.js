/* ─────────────────────────────────────────
   이유식 플래너 · app.js
   Supabase 익명 인증 + 이메일 백업
───────────────────────────────────────── */

// ════════════════════════════════════════
// ⚡ SUPABASE CONFIG
// ★ 아래 두 값을 본인의 Supabase 프로젝트 값으로 교체하세요
// ════════════════════════════════════════
const SUPABASE_URL  = 'https://ribugvknflyqkanipnlp.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpYnVndmtuZmx5cWthbmlwbmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzYwNjgsImV4cCI6MjA5MDg1MjA2OH0.LZjRy-yZLGBmJtP3NvnLUc7jM83cWyBUXqy5sLKse7E';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

let currentUser = null;
const TODAY = new Date();
TODAY.setHours(0,0,0,0);

// ════════════════════════════════════════
// AUTH — 익명 로그인
// ════════════════════════════════════════
async function initAuth() {
  // 기존 세션 확인
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    showApp();
    return;
  }
  // 익명 로그인 (자동)
  const { data, error } = await sb.auth.signInAnonymously();
  if (error) {
    console.error('익명 로그인 실패:', error);
    showLogin();
    return;
  }
  currentUser = data.user;
  showApp();
}

// 세션 변경 감지
sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
    currentUser = session?.user || null;
    if (currentUser) {
      // 이메일 연결 후 앱 상태 갱신
      updateUserInfo();
    }
  }
  if (event === 'SIGNED_OUT') {
    currentUser = null;
    showLogin();
  }
});

function showLogin() {
  document.getElementById('login-screen').classList.add('active');
  document.getElementById('app-screen').classList.remove('active');
  window.scrollTo(0, 0);
}

function showApp() {
  const login = document.getElementById('login-screen');
  const app   = document.getElementById('app-screen');
  login.classList.remove('active');
  login.style.display = 'none';
  app.classList.add('active');
  app.style.display = 'block';
  window.scrollTo(0, 0);
  updateUserInfo();
  try { initAllTabs(); } catch(e) { console.error('initAllTabs error:', e); }
}

function updateUserInfo() {
  if (!currentUser) return;
  const av = document.getElementById('user-avatar');
  const emailBadge = document.getElementById('user-email-badge');
  // 이메일 연결된 경우 표시
  const email = currentUser.email;
  if (email) {
    if (av) { av.style.display = 'none'; }
    if (emailBadge) { emailBadge.textContent = email; emailBadge.style.display = 'inline'; }
  } else {
    if (av) { av.style.display = 'none'; }
    if (emailBadge) { emailBadge.style.display = 'none'; }
  }
}

// 백업 버튼 이벤트
document.getElementById('btn-backup').addEventListener('click', openBackupModal);

// ════════════════════════════════════════
// DB 헬퍼
// ════════════════════════════════════════
function uid() { return currentUser?.id; }

async function dbGetAll(table) {
  const { data, error } = await sb.from(table)
    .select('*')
    .eq('user_id', uid());
  if (error) { console.error(table, error); return []; }
  return data || [];
}

async function dbInsert(table, obj) {
  const { data, error } = await sb.from(table)
    .insert({ ...obj, user_id: uid() })
    .select().single();
  if (error) throw error;
  return data;
}

async function dbUpdate(table, id, obj) {
  const { error } = await sb.from(table)
    .update(obj)
    .eq('id', id)
    .eq('user_id', uid());
  if (error) throw error;
}

async function dbDelete(table, id) {
  const { error } = await sb.from(table)
    .delete()
    .eq('id', id)
    .eq('user_id', uid());
  if (error) throw error;
}

async function dbUpsert(table, obj) {
  const { error } = await sb.from(table)
    .upsert({ ...obj, user_id: uid() }, { onConflict: 'user_id,key' });
  if (error) throw error;
}

// ════════════════════════════════════════
// TAB NAVIGATION
// ════════════════════════════════════════
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

function initAllTabs() {
  initPlannerTab();
  initMealTab();
  initCubeTab();
}

// ════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════
function toast(msg, duration = 2200) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), duration);
}
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function parseDate(s) {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
}
function korDate(s) {
  const d = parseDate(s);
  return `${d.getMonth()+1}월 ${d.getDate()}일 (${'일월화수목금토'[d.getDay()]})`;
}
function shortDate(s) {
  const d = parseDate(s);
  return `${d.getMonth()+1}월 ${d.getDate()}일`;
}
function addDays(s, n) {
  const d = parseDate(s); d.setDate(d.getDate()+n); return fmtDate(d);
}
function dday(exp) {
  const diff = Math.floor((parseDate(exp) - TODAY) / 86400000);
  if (diff < 0)   return { label: `D+${Math.abs(diff)}`, danger: true };
  if (diff === 0) return { label: 'D-DAY',               danger: true };
  if (diff <= 1)  return { label: `D-${diff}`,            danger: true };
  return           { label: `D-${diff}`,                  danger: false };
}
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.modal));
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay.id); });
});

// ════════════════════════════════════════
// 이메일 백업 모달
// ════════════════════════════════════════
function openBackupModal() {
  const email = currentUser?.email;
  const isLinked = !!email && !currentUser?.is_anonymous;

  const modal = document.getElementById('modal-backup');
  const body  = document.getElementById('backup-modal-body');

  if (isLinked) {
    body.innerHTML = `
      <div class="backup-linked">
        <div class="backup-icon">✅</div>
        <p class="backup-desc">이메일이 연결되어 있어요.</p>
        <div class="backup-email-display">${escHtml(email)}</div>
        <p class="backup-hint">기기를 바꿔도 같은 이메일로 로그인하면<br>데이터를 복원할 수 있어요.</p>
        <button id="btn-logout" class="btn-danger" style="width:100%;margin-top:16px" onclick="logOut()">🚪 로그아웃</button>
      </div>`;
  } else {
    body.innerHTML = `
      <div class="backup-unlinked">
        <div class="backup-icon">☁️</div>
        <p class="backup-desc">이메일을 등록하면 기기를 바꿔도<br>데이터를 복원할 수 있어요.</p>
        <label class="form-label">이메일 주소</label>
        <input id="backup-email-input" class="form-input" type="email" placeholder="example@email.com" />
        <label class="form-label">비밀번호 (6자 이상)</label>
        <input id="backup-password-input" class="form-input" type="password" placeholder="비밀번호 입력" />
        <p class="backup-hint" style="margin-top:10px">⚠️ 이미 등록한 이메일이라면 아래 <b>복원하기</b>를 눌러주세요.</p>
        <button id="btn-backup-restore" class="btn-outline full-width" style="margin-top:8px">📲 기존 데이터 복원하기</button>
      </div>`;
    setTimeout(() => {
      document.getElementById('btn-backup-restore')?.addEventListener('click', restoreBackup);
    }, 50);
  }
  openModal('modal-backup');

  // 저장 버튼
  document.getElementById('btn-backup-save').onclick = isLinked ? null : linkEmail;
  document.getElementById('btn-backup-save').textContent = isLinked ? '확인' : '이메일 연결하기';
  document.getElementById('btn-backup-save').onclick = isLinked
    ? () => closeModal('modal-backup')
    : linkEmail;
}

async function linkEmail() {
  const email    = document.getElementById('backup-email-input')?.value.trim();
  const password = document.getElementById('backup-password-input')?.value;
  if (!email)    return toast('이메일을 입력해주세요');
  if (!password || password.length < 6) return toast('비밀번호는 6자 이상이어야 해요');

  toast('연결 중...');
  const { error } = await sb.auth.updateUser({ email, password });
  if (error) {
    // 이미 사용 중인 이메일인 경우 안내
    if (error.message.includes('already')) {
      toast('이미 사용 중인 이메일이에요. 복원하기를 이용해주세요.');
    } else {
      toast('연결 실패: ' + error.message);
    }
    return;
  }
  toast('이메일이 연결되었어요 ✅ 인증 메일을 확인해주세요');
  closeModal('modal-backup');
  updateUserInfo();
}

async function restoreBackup() {
  const email    = document.getElementById('backup-email-input')?.value.trim();
  const password = document.getElementById('backup-password-input')?.value;
  if (!email)    return toast('이메일을 입력해주세요');
  if (!password) return toast('비밀번호를 입력해주세요');

  toast('복원 중...');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    toast('복원 실패: 이메일 또는 비밀번호를 확인해주세요');
    return;
  }
  currentUser = data.user;
  localStorage.removeItem('timeLabels');
  closeModal('modal-backup');
  updateUserInfo();
  await loadPlans();
  await loadMealData();
  await loadCubes();
  toast('데이터가 복원되었어요 🎉');
}

async function logOut() {
  if (!confirm('로그아웃 하면 이메일로 다시 로그인해야 데이터를 복원할 수 있어요.\n로그아웃 할까요?')) return;
  closeModal('modal-backup');
  await sb.auth.signOut();
  currentUser = null;
  const { data, error } = await sb.auth.signInAnonymously();
  if (!error) {
    currentUser = data.user;
    updateUserInfo();
  }
  toast('로그아웃 되었어요 👋');
}

// ════════════════════════════════════════
// TAB 1: 재료 플래너
// ════════════════════════════════════════
let planYear, planMonth, planItems = [], editingPlanId = null;
let ingredientProps = {};      // { "당근": { category, preference, allergy } }
let ingFilterCat = 'all', ingFilterPref = 'all', ingFilterAllergy = false;
let ingSort = 'alpha';
let editingIngredientName = null;

function initPlannerTab() {
  const now = new Date();
  planYear = now.getFullYear(); planMonth = now.getMonth();
  loadPlans();
  loadIngredientProps();
  document.getElementById('planner-prev').onclick = () => { planMonth--; if(planMonth<0){planMonth=11;planYear--;} renderPlanCalendar(); };
  document.getElementById('planner-next').onclick = () => { planMonth++; if(planMonth>11){planMonth=0;planYear++;} renderPlanCalendar(); };
  document.getElementById('btn-add-plan').onclick  = () => openPlanModal(null);
  document.getElementById('btn-plan-save').onclick   = savePlan;
  document.getElementById('btn-plan-delete').onclick = deletePlan;
  document.getElementById('btn-ingredient-list').onclick = openIngredientListModal;

  // 카테고리 필터
  document.querySelectorAll('[data-filter-cat]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('[data-filter-cat]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ingFilterCat = btn.dataset.filterCat;
      renderIngredientList();
    };
  });
  // 선호도 필터
  document.querySelectorAll('[data-filter-pref]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('[data-filter-pref]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ingFilterPref = btn.dataset.filterPref;
      renderIngredientList();
    };
  });
  // 정렬
  document.querySelectorAll('[data-sort]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('[data-sort]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ingSort = btn.dataset.sort;
      renderIngredientList();
    };
  });

  // 알러지 필터 토글
  document.querySelector('[data-filter-allergy]').onclick = function() {
    ingFilterAllergy = !ingFilterAllergy;
    this.classList.toggle('active', ingFilterAllergy);
    renderIngredientList();
  };

  // 속성 편집 버튼들 (이벤트 위임)
  document.getElementById('ingredient-edit-panel').addEventListener('click', e => {
    const btn = e.target.closest('.ing-prop-btn');
    if (btn) setIngredientProp(btn.dataset.prop, btn.dataset.val);
  });
}

async function loadIngredientProps() {
  const local = localStorage.getItem('ingredientProps');
  if (local) { try { ingredientProps = JSON.parse(local); } catch(e) {} }
  if (!uid()) return;
  const { data: rows } = await sb.from('settings')
    .select('id, value').eq('user_id', uid()).eq('key', 'ingredientProps');
  if (rows?.length) {
    const serverVal = rows[rows.length - 1].value;
    if (serverVal && Object.keys(serverVal).length > 0) {
      ingredientProps = serverVal;
      localStorage.setItem('ingredientProps', JSON.stringify(ingredientProps));
    }
  }
}

async function saveIngredientProps() {
  localStorage.setItem('ingredientProps', JSON.stringify(ingredientProps));
  if (!uid()) return;
  const { error } = await sb.from('settings')
    .upsert({ user_id: uid(), key: 'ingredientProps', value: ingredientProps }, { onConflict: 'user_id,key' });
  if (error) {
    await sb.from('settings').delete().eq('user_id', uid()).eq('key', 'ingredientProps').catch(() => {});
    await sb.from('settings').insert({ user_id: uid(), key: 'ingredientProps', value: ingredientProps }).catch(() => {});
  }
}

function openIngredientListModal() {
  editingIngredientName = null;
  document.getElementById('ingredient-edit-panel').classList.add('hidden');
  // 필터/정렬 초기화
  ingFilterCat = 'all'; ingFilterPref = 'all'; ingFilterAllergy = false; ingSort = 'alpha';
  document.querySelectorAll('[data-filter-cat]').forEach(b => b.classList.toggle('active', b.dataset.filterCat === 'all'));
  document.querySelectorAll('[data-filter-pref]').forEach(b => b.classList.toggle('active', b.dataset.filterPref === 'all'));
  document.querySelector('[data-filter-allergy]').classList.remove('active');
  document.querySelectorAll('[data-sort]').forEach(b => b.classList.toggle('active', b.dataset.sort === 'alpha'));
  renderIngredientList();
  openModal('modal-ingredient-list');
}

function getTriedIngredients() {
  const today = new Date().toISOString().slice(0, 10);
  const passed = planItems.filter(p => p.date <= today && p.ingredient);
  // 재료별 첫 번째 날짜 기록
  const firstDate = {};
  passed.forEach(p => {
    if (!firstDate[p.ingredient] || p.date < firstDate[p.ingredient]) firstDate[p.ingredient] = p.date;
  });
  const names = [...new Set(passed.map(p => p.ingredient))];
  if (ingSort === 'date') {
    return names.sort((a, b) => firstDate[a].localeCompare(firstDate[b]));
  }
  return names.sort((a, b) => a.localeCompare(b, 'ko'));
}

function renderIngredientList() {
  const catEmoji = { base: '🍚', protein: '🥩', other: '🥦' };
  const prefEmoji = { best: '😆', good: '😊', bad: '😣' };
  const all = getTriedIngredients();

  const filtered = all.filter(name => {
    const p = ingredientProps[name] || {};
    if (ingFilterCat !== 'all') {
      if (ingFilterCat === 'none' && p.category) return false;
      if (ingFilterCat !== 'none' && p.category !== ingFilterCat) return false;
    }
    if (ingFilterPref !== 'all' && p.preference !== ingFilterPref) return false;
    if (ingFilterAllergy && p.allergy !== 'true') return false;
    return true;
  });

  const body = document.getElementById('ingredient-list-body');
  if (!filtered.length) {
    body.innerHTML = '<div class="ing-empty">해당하는 재료가 없어요.</div>';
  } else {
    body.innerHTML = filtered.map(name => {
      const p = ingredientProps[name] || {};
      const isEditing = editingIngredientName === name;
      return `
        <div class="ing-card ${isEditing ? 'editing' : ''}" onclick="openIngredientEdit('${escHtml(name)}')">
          <span class="ing-card-name">${escHtml(name)}</span>
          <div class="ing-card-badges">
            ${p.category ? `<span class="ing-badge cat">${catEmoji[p.category]}</span>` : '<span class="ing-badge empty">미분류</span>'}
            ${p.preference ? `<span class="ing-badge pref">${prefEmoji[p.preference]}</span>` : ''}
            ${p.allergy === 'true' ? '<span class="ing-badge allergy">⚠️</span>' : ''}
            ${p.allergy === 'false' ? '<span class="ing-badge no-allergy">✅</span>' : ''}
          </div>
        </div>`;
    }).join('');
  }

  document.getElementById('ingredient-list-count').textContent = `총 ${filtered.length}가지 / 전체 ${all.length}가지`;
}

function openIngredientEdit(name) {
  editingIngredientName = name;
  const p = ingredientProps[name] || {};
  document.getElementById('ingredient-edit-name').textContent = name;
  // 현재 선택값 표시
  document.querySelectorAll('.ing-prop-btn').forEach(btn => {
    const val = btn.dataset.val;
    const prop = btn.dataset.prop;
    let current = p[prop];
    btn.classList.toggle('active', current === val);
  });
  document.getElementById('ingredient-edit-panel').classList.remove('hidden');
  renderIngredientList();
}

async function setIngredientProp(prop, val) {
  if (!editingIngredientName) return;
  const p = ingredientProps[editingIngredientName] || {};
  // 같은 값 누르면 해제
  if (p[prop] === val) {
    delete p[prop];
  } else {
    p[prop] = val;
  }
  ingredientProps[editingIngredientName] = p;
  // UI 즉시 갱신
  document.querySelectorAll('.ing-prop-btn').forEach(btn => {
    btn.classList.toggle('active', p[btn.dataset.prop] === btn.dataset.val);
  });
  saveIngredientProps();
  try { renderIngredientList(); } catch(e) { toast('렌더오류: ' + e.message); }
}

async function loadPlans() {
  planItems = await dbGetAll('plans');
  renderPlanCalendar();
}

function renderPlanCalendar() {
  document.getElementById('planner-month-title').textContent = `${planYear}년 ${planMonth+1}월`;
  const container = document.getElementById('planner-calendar');
  container.innerHTML = '';

  const monthPlans = planItems.filter(p => {
    const d = parseDate(p.date);
    return d.getFullYear() === planYear && d.getMonth() === planMonth;
  });
  const byDay = {};
  monthPlans.forEach(p => {
    const day = parseDate(p.date).getDate();
    (byDay[day] = byDay[day] || []).push(p);
  });

  const hdr = document.createElement('div');
  hdr.className = 'cal-weekdays-row';
  ['일','월','화','수','목','금','토'].forEach((d) => {
    const el = document.createElement('div');
    el.className = 'cal-weekday-cell';
    el.textContent = d;
    hdr.appendChild(el);
  });
  container.appendChild(hdr);

  const grid = document.createElement('div');
  grid.className = 'plan-cal-days';

  const firstDay    = new Date(planYear, planMonth, 1).getDay();
  const daysInMonth = new Date(planYear, planMonth+1, 0).getDate();
  const daysInPrev  = new Date(planYear, planMonth, 0).getDate();
  const todayStr    = fmtDate(TODAY);

  for (let i = firstDay-1; i >= 0; i--) {
    const cell = makePlanCell(daysInPrev-i, null, true, firstDay-1-i);
    grid.appendChild(cell);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const ds  = `${planYear}-${String(planMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = new Date(planYear, planMonth, d).getDay();
    const cell = makePlanCell(d, ds, false, dow);
    if (ds === todayStr) cell.classList.add('today');
    const ps = byDay[d];
    if (ps && ps.length > 0) {
      cell.classList.add('has-plan');
      const nameEl = document.createElement('div');
      nameEl.className = 'plan-cal-ingredient';
      nameEl.textContent = ps[0].ingredient;
      cell.appendChild(nameEl);
      if (ps.length > 1) {
        const more = document.createElement('div');
        more.className = 'plan-cal-more';
        more.textContent = `+${ps.length-1}`;
        cell.appendChild(more);
      }
    }
    cell.addEventListener('click', () => {
      const plans = planItems.filter(p => p.date === ds);
      if (plans.length === 0) openPlanModal(null, ds);
      else if (plans.length === 1) openPlanModal(plans[0].id);
      else openPlanListModal(plans, ds);
    });
    grid.appendChild(cell);
  }
  const rem = (7 - ((firstDay + daysInMonth) % 7)) % 7;
  for (let d = 1; d <= rem; d++) {
    const cell = makePlanCell(d, null, true, 0);
    grid.appendChild(cell);
  }
  container.appendChild(grid);
}

function makePlanCell(day, ds, other, dow) {
  const cell = document.createElement('div');
  cell.className = 'plan-cal-day' + (other ? ' other-month' : '') +
    (dow === 0 ? ' sunday' : dow === 6 ? ' saturday' : '');
  const num = document.createElement('div');
  num.className = 'plan-cal-day-num';
  num.textContent = day;
  cell.appendChild(num);
  return cell;
}

function openPlanListModal(plans, ds) {
  window._planListDate = ds;
  document.getElementById('modal-plan-list-title').textContent = korDate(ds);
  document.getElementById('modal-plan-list-body').innerHTML = plans.map(p => `
    <div class="plan-list-item" onclick="closeModal('modal-plan-list'); openPlanModal('${p.id}')">
      <div class="plan-list-name">${escHtml(p.ingredient)}</div>
      ${p.memo ? `<div class="plan-list-memo">${escHtml(p.memo)}</div>` : ''}
    </div>`).join('');
  openModal('modal-plan-list');
}

function openPlanModal(id, prefillDate) {
  editingPlanId = id;
  const isEdit = !!id;
  document.getElementById('modal-plan-title').textContent = isEdit ? '계획 수정' : '새 재료 계획';
  document.getElementById('btn-plan-delete').classList.toggle('hidden', !isEdit);
  if (isEdit) {
    const p = planItems.find(x => x.id === id);
    document.getElementById('plan-ingredient').value = p.ingredient;
    document.getElementById('plan-date').value = p.date;
    document.getElementById('plan-memo').value = p.memo || '';
  } else {
    document.getElementById('plan-ingredient').value = '';
    document.getElementById('plan-date').value = prefillDate || fmtDate(new Date());
    document.getElementById('plan-memo').value = '';
  }
  openModal('modal-plan');
}

async function savePlan() {
  const ingredient = document.getElementById('plan-ingredient').value.trim();
  const date       = document.getElementById('plan-date').value;
  const memo       = document.getElementById('plan-memo').value.trim();
  if (!ingredient) return toast('재료 이름을 입력해주세요');
  if (!date)       return toast('날짜를 선택해주세요');
  try {
    if (editingPlanId) {
      await dbUpdate('plans', editingPlanId, { ingredient, date, memo });
      toast('계획이 수정되었어요 ✏️');
    } else {
      await dbInsert('plans', { ingredient, date, memo });
      toast('계획이 추가되었어요 📅');
    }
    await loadPlans();
    closeModal('modal-plan');
  } catch(e) { toast('저장 실패: ' + e.message); }
}

async function deletePlan() {
  if (!editingPlanId) return;
  if (!confirm('이 계획을 삭제할까요?')) return;
  try {
    await dbDelete('plans', editingPlanId);
    toast('삭제되었어요 🗑️');
    await loadPlans();
    closeModal('modal-plan');
  } catch(e) { toast('삭제 실패: ' + e.message); }
}

// ════════════════════════════════════════
// TAB 2: 식단표
// ════════════════════════════════════════
let mealYear, mealMonth, mealData = {}, selectedMealDate = null;
let editingSlotId = null, currentSlotType = 'meal';
let slotCubes = { base: [], protein: [], other: [], snack: [] };
let pickerCat = null, pickerSelected = [];
const DEFAULT_TIME_LABELS = ['오전이유식','오전간식','점심이유식','오후간식','저녁이유식'];
let timeLabels = (() => {
  try { const s = localStorage.getItem('timeLabels'); return s ? JSON.parse(s) : [...DEFAULT_TIME_LABELS]; } catch(e) { return [...DEFAULT_TIME_LABELS]; }
})();

function initMealTab() {
  const now = new Date();
  mealYear = now.getFullYear(); mealMonth = now.getMonth();
  loadMealData();

  document.getElementById('btn-export-excel').onclick = openExportModal;
  document.getElementById('meal-prev').onclick = () => { mealMonth--; if(mealMonth<0){mealMonth=11;mealYear--;} renderMealCalendar(); };
  document.getElementById('meal-next').onclick = () => { mealMonth++; if(mealMonth>11){mealMonth=0;mealYear++;} renderMealCalendar(); };
  document.getElementById('btn-close-meal-panel').onclick = () => {
    document.getElementById('meal-day-panel').classList.add('hidden');
    selectedMealDate = null;
    renderMealCalendar();
  };
  document.getElementById('btn-add-meal-slot').onclick = () => openSlotModal(null);
  document.getElementById('btn-slot-save').onclick   = saveSlot;
  document.getElementById('btn-slot-delete').onclick = deleteSlot;

  document.querySelectorAll('.btn-add-cube-slot').forEach(btn => {
    btn.onclick = () => openCubePicker(btn.dataset.cat);
  });
  document.getElementById('btn-cube-picker-confirm').onclick = confirmCubePick;

  const inp = document.getElementById('slot-time-label');
  inp.addEventListener('input',  () => renderTimeLabelDropdown(inp.value));
  inp.addEventListener('focus',  () => renderTimeLabelDropdown(inp.value));
  inp.addEventListener('blur',   () => setTimeout(() => document.getElementById('time-label-dropdown').classList.add('hidden'), 180));
  document.getElementById('cube-picker-search').addEventListener('input', e => renderCubePickerList(e.target.value));
}

async function saveTimeLabels() {
  localStorage.setItem('timeLabels', JSON.stringify(timeLabels));
  await sb.from('settings').delete().eq('user_id', uid()).eq('key', 'timeLabels').catch(() => {});
  await sb.from('settings').insert({ user_id: uid(), key: 'timeLabels', value: timeLabels }).catch(() => {});
}

async function loadMealData() {
  // 시간이름: localStorage 우선, 없을 때만 Supabase에서 복원
  const localLabels = localStorage.getItem('timeLabels');
  if (!localLabels) {
    const { data: settingRows } = await sb.from('settings')
      .select('id, value').eq('user_id', uid()).eq('key', 'timeLabels');
    if (settingRows?.length) {
      const latest = settingRows[settingRows.length - 1];
      if (latest?.value) {
        timeLabels = latest.value;
        localStorage.setItem('timeLabels', JSON.stringify(timeLabels));
      }
      if (settingRows.length > 1) {
        const keepId = latest.id;
        await sb.from('settings').delete().eq('user_id', uid()).eq('key', 'timeLabels').neq('id', keepId).catch(() => {});
      }
    }
  }

  const meals = await dbGetAll('meals');
  mealData = {};
  meals.forEach(slot => {
    (mealData[slot.date] = mealData[slot.date] || []).push(slot);
  });
  renderMealCalendar();
  if (selectedMealDate) renderMealDayPanel(selectedMealDate);
}

function renderMealCalendar() {
  document.getElementById('meal-month-title').textContent = `${mealYear}년 ${mealMonth+1}월`;
  const container = document.getElementById('meal-calendar');
  container.innerHTML = '';

  const byDay = {};
  Object.entries(mealData).forEach(([ds, slots]) => {
    const d = parseDate(ds);
    if (d.getFullYear() === mealYear && d.getMonth() === mealMonth)
      byDay[d.getDate()] = slots.slice().sort((a,b) => (a.order||0)-(b.order||0));
  });

  const hdr = document.createElement('div');
  hdr.className = 'cal-weekdays-row';
  ['일','월','화','수','목','금','토'].forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-weekday-cell';
    el.textContent = d;
    hdr.appendChild(el);
  });
  container.appendChild(hdr);

  const grid = document.createElement('div');
  grid.className = 'cal-days-grid';

  const firstDay    = new Date(mealYear, mealMonth, 1).getDay();
  const daysInMonth = new Date(mealYear, mealMonth+1, 0).getDate();
  const daysInPrev  = new Date(mealYear, mealMonth, 0).getDate();
  const todayStr    = fmtDate(TODAY);

  for (let i = firstDay-1; i >= 0; i--) grid.appendChild(makeMealCell(daysInPrev-i, null, true, firstDay-1-i));

  for (let d = 1; d <= daysInMonth; d++) {
    const ds  = `${mealYear}-${String(mealMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = new Date(mealYear, mealMonth, d).getDay();
    const cell = makeMealCell(d, ds, false, dow);
    if (ds === todayStr)         cell.classList.add('today');
    if (ds === selectedMealDate) cell.classList.add('selected');
    const slots = byDay[d];
    if (slots && slots.length > 0) {
      const dotWrap = document.createElement('div');
      dotWrap.className = 'cal-dots';
      slots.slice(0, 5).forEach(slot => {
        const dot = document.createElement('div');
        dot.className = 'cal-dot ' + (slot.type === 'meal' ? 'meal' : 'snack');
        dotWrap.appendChild(dot);
      });
      cell.appendChild(dotWrap);
    }
    cell.addEventListener('click', () => {
      selectedMealDate = ds;
      renderMealCalendar();
      renderMealDayPanel(ds);
    });
    grid.appendChild(cell);
  }

  const rem = (7 - ((firstDay + daysInMonth) % 7)) % 7;
  for (let d = 1; d <= rem; d++) grid.appendChild(makeMealCell(d, null, true, 0));
  container.appendChild(grid);
}

function makeMealCell(day, ds, other, dow) {
  const cell = document.createElement('div');
  cell.className = 'cal-day-cell' + (other ? ' other-month' : '') +
    (dow === 0 ? ' sunday' : dow === 6 ? ' saturday' : '');
  const num = document.createElement('div');
  num.className = 'cal-day-num';
  num.textContent = day;
  cell.appendChild(num);
  return cell;
}

function renderMealDayPanel(dateStr) {
  const panel = document.getElementById('meal-day-panel');
  panel.classList.remove('hidden');
  document.getElementById('meal-selected-date').textContent = korDate(dateStr);

  const slots = (mealData[dateStr] || []).slice().sort((a,b) => (a.order||0)-(b.order||0));
  const container = document.getElementById('meal-slots');

  if (slots.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">🍽️</span>아직 기록된 식단이 없어요.</div>`;
    return;
  }

  container.innerHTML = slots.map(slot => {
    if (slot.type === 'snack') {
      const snackTotalG = (slot.cubes||[]).reduce((s,c) => s+(c.g||0), 0);
      const snackCats = [
        { key:'snack', label:'🥞 간식' },
      ];
      const snackCatHtml = snackCats.map(cat => {
        const cs = (slot.cubes||[]).filter(c => c.cat === cat.key);
        if (!cs.length) return '';
        return `<div class="meal-slot-cat">
          <div class="meal-slot-cat-label">${cat.label}</div>
          <div class="meal-slot-chips">${cs.map(c => `<span class="meal-chip ${cat.key}">${escHtml(c.cubeName)} ${c.g}g</span>`).join('')}</div>
        </div>`;
      }).join('');
      const snackBodyHtml = [
        snackCatHtml,
        slot.snack_memo ? `<div class="meal-snack-text">${escHtml(slot.snack_memo)}</div>` : ''
      ].filter(Boolean).join('') || '<div style="color:var(--text3);font-size:13px">등록된 내용 없음</div>';
      return `
        <div class="meal-slot-card">
          <div class="meal-slot-header snack-hdr">
            <span class="meal-slot-time-snack">${escHtml(slot.time_label)}</span>
            ${snackTotalG > 0 ? `<span class="meal-slot-total">총 ${snackTotalG}g</span>` : ''}
            <span class="meal-slot-badge snack">간식</span>
            <button class="btn-icon" onclick="openSlotModal('${slot.id}')">✏️</button>
          </div>
          <div class="meal-slot-body">${snackBodyHtml}</div>
        </div>`;
    }
    const totalG = (slot.cubes||[]).reduce((s,c) => s+(c.g||0), 0);
    const cats = [
      { key:'base',    label:'🍚 베이스죽' },
      { key:'protein', label:'🥩 단백질'   },
      { key:'other',   label:'🥦 기타'     },
    ];
    const catHtml = cats.map(cat => {
      const cs = (slot.cubes||[]).filter(c => c.cat === cat.key);
      if (!cs.length) return '';
      return `<div class="meal-slot-cat">
        <div class="meal-slot-cat-label">${cat.label}</div>
        <div class="meal-slot-chips">${cs.map(c => `<span class="meal-chip ${cat.key}">${escHtml(c.cubeName)} ${c.g}g</span>`).join('')}</div>
      </div>`;
    }).join('');
    const mealBodyHtml = [
      catHtml || '<div style="color:var(--text3);font-size:13px">등록된 큐브 없음</div>',
      slot.snack_memo ? `<div class="meal-snack-text">${escHtml(slot.snack_memo)}</div>` : ''
    ].filter(Boolean).join('');
    return `
      <div class="meal-slot-card">
        <div class="meal-slot-header meal-hdr">
          <span class="meal-slot-time-meal">${escHtml(slot.time_label)}</span>
          <span class="meal-slot-total">총 ${totalG}g</span>
          <span class="meal-slot-badge meal">이유식</span>
          <button class="btn-icon" onclick="openSlotModal('${slot.id}')">✏️</button>
        </div>
        <div class="meal-slot-body">${mealBodyHtml}</div>
      </div>`;
  }).join('');
}

function renderTimeLabelDropdown(val) {
  const dd = document.getElementById('time-label-dropdown');
  const filtered = timeLabels.filter(l => !val || l.includes(val));
  if (!filtered.length) { dd.classList.add('hidden'); return; }
  dd.innerHTML = filtered.map(lbl => `
    <div class="time-dropdown-item">
      <span class="time-dropdown-label" onmousedown="selectTimeLabel('${escHtml(lbl)}')">${escHtml(lbl)}</span>
      <span class="time-dropdown-del" onmousedown="removeTimeLabel('${escHtml(lbl)}')">✕</span>
    </div>`).join('');
  dd.classList.remove('hidden');
}
function selectTimeLabel(lbl) {
  document.getElementById('slot-time-label').value = lbl;
  document.getElementById('time-label-dropdown').classList.add('hidden');
}
async function removeTimeLabel(lbl) {
  timeLabels = timeLabels.filter(l => l !== lbl);
  await saveTimeLabels();
  renderTimeLabelDropdown(document.getElementById('slot-time-label').value);
}

function openSlotModal(id) {
  editingSlotId = id;
  slotCubes = { base: [], protein: [], other: [], snack: [] };
  const isEdit = !!id;
  document.getElementById('modal-slot-title').textContent = isEdit ? '끼니 수정' : '끼니 작성';
  document.getElementById('btn-slot-delete').classList.toggle('hidden', !isEdit);

  if (isEdit) {
    const slots = Object.values(mealData).flat();
    const slot = slots.find(s => s.id === id);
    document.getElementById('slot-time-label').value = slot.time_label || '';
    if (slot.cubes) slot.cubes.forEach(c => { slotCubes[c.cat] = slotCubes[c.cat] || []; slotCubes[c.cat].push({...c}); });
    document.getElementById('slot-snack-memo').value = slot.snack_memo || '';
  } else {
    document.getElementById('slot-time-label').value = '';
    document.getElementById('slot-snack-memo').value = '';
  }

  renderSlotCubes();
  updateTotalG();
  openModal('modal-meal-slot');
}

function renderSlotCubes() {
  ['base','protein','other','snack'].forEach(cat => {
    const row = document.getElementById(`slot-${cat}-cubes`);
    if (!row) return;
    row.innerHTML = slotCubes[cat].map((c, idx) => `
      <div class="slot-cube-chip">
        ${escHtml(c.cubeName)} <span style="opacity:.7;font-size:11px">${c.g}g</span>
        <span class="rm-chip" onclick="removeSlotCube('${cat}',${idx})">✕</span>
      </div>`).join('');
  });
}
function removeSlotCube(cat, idx) {
  slotCubes[cat].splice(idx, 1);
  renderSlotCubes(); updateTotalG();
}
function updateTotalG() {
  const mealTotal = [...(slotCubes.base||[]), ...(slotCubes.protein||[]), ...(slotCubes.other||[])].reduce((s,c) => s+(c.g||0), 0);
  const snackTotal = (slotCubes.snack||[]).reduce((s,c) => s+(c.g||0), 0);
  document.getElementById('slot-total-g').textContent = mealTotal + 'g';
  const snackEl = document.getElementById('slot-total-g-snack');
  if (snackEl) snackEl.textContent = snackTotal + 'g';
}

async function saveSlot() {
  const timeLabel = document.getElementById('slot-time-label').value.trim();
  if (!timeLabel)        return toast('시간 이름을 입력해주세요');
  if (!selectedMealDate) return toast('날짜를 먼저 선택해주세요');

  if (!timeLabels.includes(timeLabel)) {
    timeLabels.push(timeLabel);
    await saveTimeLabels();
  }

  const existing = mealData[selectedMealDate] || [];
  const maxOrder = Math.max(0, ...existing.map(s => s.order||0));
  const newSlot = {
    date: selectedMealDate,
    time_label: timeLabel,
    type: [...(slotCubes.base||[]), ...(slotCubes.protein||[]), ...(slotCubes.other||[])].length > 0 ? 'meal' : 'snack',
    order: editingSlotId ? (existing.find(s=>s.id===editingSlotId)?.order || maxOrder+1) : maxOrder+1,
    cubes: Object.values(slotCubes).flat(),
    snack_memo: document.getElementById('slot-snack-memo').value.trim()
  };

  const oldSlot = editingSlotId ? existing.find(s => s.id === editingSlotId) : null;
  await applyMealCubeDiff(oldSlot, newSlot);

  try {
    if (editingSlotId) {
      await dbUpdate('meals', editingSlotId, newSlot);
      toast('식단이 수정되었어요 ✏️');
    } else {
      await dbInsert('meals', newSlot);
      toast('식단이 저장되었어요 🍽️');
    }
    await loadMealData();
    closeModal('modal-meal-slot');
  } catch(e) { toast('저장 실패: ' + e.message); }
}

function openExportModal() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay  = new Date(now.getFullYear(), now.getMonth()+1, 0);
  document.getElementById('export-start').value = fmtDate(firstDay);
  document.getElementById('export-end').value   = fmtDate(lastDay);

  document.querySelectorAll('.export-quick-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.onclick = () => {
      document.querySelectorAll('.export-quick-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const today = new Date(); today.setHours(0,0,0,0);
      const range = btn.dataset.range;
      if (range === 'this-month') {
        document.getElementById('export-start').value = fmtDate(new Date(today.getFullYear(), today.getMonth(), 1));
        document.getElementById('export-end').value   = fmtDate(new Date(today.getFullYear(), today.getMonth()+1, 0));
      } else if (range === 'last-month') {
        document.getElementById('export-start').value = fmtDate(new Date(today.getFullYear(), today.getMonth()-1, 1));
        document.getElementById('export-end').value   = fmtDate(new Date(today.getFullYear(), today.getMonth(), 0));
      } else if (range === 'last-7') {
        const s = new Date(today); s.setDate(s.getDate()-6);
        document.getElementById('export-start').value = fmtDate(s);
        document.getElementById('export-end').value   = fmtDate(today);
      } else if (range === 'last-30') {
        const s = new Date(today); s.setDate(s.getDate()-29);
        document.getElementById('export-start').value = fmtDate(s);
        document.getElementById('export-end').value   = fmtDate(today);
      }
    };
  });

  document.getElementById('btn-export-confirm').onclick = exportMealExcel;
  openModal('modal-export');
}

function exportMealExcel() {
  const year  = mealYear;
  const month = mealMonth;
  const title = `${year}년 ${month+1}월 이유식 식단표`;
  const rows  = [['날짜', '요일', '끼니/간식', '종류', '베이스죽', '단백질', '기타', '간식', '총g', '메모']];
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const dayNames = ['일','월','화','수','목','금','토'];

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = new Date(year, month, d).getDay();
    const slots = (mealData[ds] || []).slice().sort((a,b) => (a.order||0)-(b.order||0));
    if (slots.length === 0) {
      rows.push([korDate(ds).split(' (')[0], dayNames[dow], '', '', '', '', '', '', '', '']);
    } else {
      slots.forEach((slot, i) => {
        const dateCell = i === 0 ? korDate(ds).split(' (')[0] : '';
        const dowCell  = i === 0 ? dayNames[dow] : '';
        const cubes    = slot.cubes || [];
        if (slot.type === 'snack') {
          const snack   = cubes.filter(c=>c.cat==='snack').map(c=>`${c.cubeName}(${c.g}g)`).join(', ');
          const totalG  = cubes.reduce((s,c)=>s+(c.g||0),0);
          rows.push([dateCell, dowCell, slot.time_label, '간식', '', '', '', snack, totalG > 0 ? totalG+'g' : '', slot.snack_memo||'']);
        } else {
          const base    = cubes.filter(c=>c.cat==='base').map(c=>`${c.cubeName}(${c.g}g)`).join(', ');
          const protein = cubes.filter(c=>c.cat==='protein').map(c=>`${c.cubeName}(${c.g}g)`).join(', ');
          const other   = cubes.filter(c=>c.cat==='other').map(c=>`${c.cubeName}(${c.g}g)`).join(', ');
          const totalG  = cubes.reduce((s,c)=>s+(c.g||0),0);
          rows.push([dateCell, dowCell, slot.time_label, '이유식', base, protein, other, '', totalG+'g', slot.snack_memo||'']);
        }
      });
    }
  }

  const BOM = '\uFEFF';
  const csv = BOM + rows.map(row =>
    row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')
  ).join('\n');

  const fileName = `${title}.csv`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  // Capacitor 앱 (iOS) 이면 공유 시트, 웹이면 다운로드
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      try {
        // Filesystem 플러그인으로 임시 파일 저장
        await Capacitor.Plugins.Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: 'CACHE'
        });
        const uriResult = await Capacitor.Plugins.Filesystem.getUri({
          path: fileName,
          directory: 'CACHE'
        });
        // Share 플러그인으로 공유 시트 열기
        await Capacitor.Plugins.Share.share({
          title: title,
          url: uriResult.uri,
          dialogTitle: '식단표 내보내기'
        });
        toast(`📥 내보내기 완료!`);
      } catch(e) {
        console.error('share error:', e);
        toast('내보내기 실패: ' + e.message);
      }
    };
    reader.readAsDataURL(blob);
  } else {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
    toast(`📥 ${title} 내보내기 완료!`);
  }
}

async function deleteSlot() {
  if (!editingSlotId) return;
  if (!confirm('이 끼니를 삭제할까요?')) return;
  const existing = mealData[selectedMealDate] || [];
  const oldSlot  = existing.find(s => s.id === editingSlotId);
  await applyMealCubeDiff(oldSlot, null);
  try {
    await dbDelete('meals', editingSlotId);
    toast('삭제되었어요 🗑️');
    await loadMealData();
    closeModal('modal-meal-slot');
  } catch(e) { toast('삭제 실패: ' + e.message); }
}

async function applyMealCubeDiff(oldSlot, newSlot) {
  const delta = {};
  const tally = (cubeList, sign) => (cubeList||[]).forEach(c => { delta[c.cubeId] = (delta[c.cubeId]||0) + sign; });
  if (oldSlot) tally(oldSlot.cubes, -1);
  if (newSlot) tally(newSlot.cubes,  1);
  let changed = false;
  for (const [cubeId, diff] of Object.entries(delta)) {
    if (!diff) continue;
    const cube = cubeItems.find(c => c.id === cubeId);
    if (!cube) continue;
    const newUsed = Math.max(0, Math.min(cube.count, (cube.used_count||0) + diff));
    await dbUpdate('cubes', cubeId, {
      used_count: newUsed,
      status: newUsed >= cube.count ? 'done' : 'active'
    }).catch(() => {});
    changed = true;
  }
  if (changed) await loadCubes();
}

function openCubePicker(cat) {
  pickerCat = cat;
  pickerSelected = [];
  document.getElementById('cube-picker-search').value = '';
  document.getElementById('modal-picker-title').textContent = `큐브 선택 — ${{base:'🍚 베이스죽',protein:'🥩 단백질',other:'🥦 기타',snack:'🥞 간식'}[cat]}`;
  closeCubePickerCustomView();
  renderCubePickerList('');
  updatePickerBtn();
  openModal('modal-cube-picker');
}
function openCubePickerCustomView() {
  document.getElementById('cube-picker-view-list').style.display = 'none';
  document.getElementById('cube-picker-view-custom').style.display = 'flex';
  document.getElementById('picker-footer-list').style.display = 'none';
  document.getElementById('picker-footer-custom').style.display = 'block';
  document.getElementById('btn-picker-back').style.display = '';
  document.getElementById('modal-picker-title').textContent = '직접 추가';
  document.getElementById('cube-picker-custom-name').value = '';
  document.getElementById('cube-picker-custom-g').value = '';
  document.getElementById('cube-picker-custom-name').focus();
}
function closeCubePickerCustomView() {
  document.getElementById('cube-picker-view-list').style.display = '';
  document.getElementById('cube-picker-view-custom').style.display = 'none';
  document.getElementById('picker-footer-list').style.display = 'contents';
  document.getElementById('picker-footer-custom').style.display = 'none';
  document.getElementById('btn-picker-back').style.display = 'none';
  document.getElementById('modal-picker-title').textContent = `큐브 선택 — ${{base:'🍚 베이스죽',protein:'🥩 단백질',other:'🥦 기타',snack:'🥞 간식'}[pickerCat]}`;
}
function confirmCustomIngredient() {
  const name = document.getElementById('cube-picker-custom-name').value.trim();
  const g = parseFloat(document.getElementById('cube-picker-custom-g').value) || 0;
  if (!name) return toast('재료 이름을 입력해주세요');
  if (g <= 0) return toast('용량을 입력해주세요');
  slotCubes[pickerCat] = slotCubes[pickerCat] || [];
  slotCubes[pickerCat].push({ cubeId: null, cubeName: name, g, cat: pickerCat, custom: true });
  renderSlotCubes();
  updateTotalG();
  closeModal('modal-cube-picker');
  toast(`${name} ${g}g 추가 완료`);
}
function renderCubePickerList(search) {
  const list = document.getElementById('cube-picker-list');
  const catOrder = { base:0, protein:1, other:2, snack:3 };
  const active = cubeItems
    .filter(c => c.status === 'active')
    .slice().sort((a,b) => {
      const catDiff = (catOrder[a.category]||0) - (catOrder[b.category]||0);
      if (catDiff !== 0) return catDiff;
      const expA = addDays(a.made_date, a.expire_days||14);
      const expB = addDays(b.made_date, b.expire_days||14);
      return expA.localeCompare(expB);
    });
  const catFiltered = active.filter(c => c.category === pickerCat);
  const filtered = search ? catFiltered.filter(c => c.name.includes(search)) : catFiltered;
  if (!filtered.length) { list.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:10px">큐브가 없어요.</div>'; return; }
  list.innerHTML = filtered.map(c => {
    const sel = pickerSelected.find(x => x.cubeId === c.id);
    const rem = (c.count||0) - (c.used_count||0);
    const expStr = addDays(c.made_date, c.expire_days||7);
    const dd = dday(expStr);
    return `
      <div class="cube-picker-item ${sel ? 'selected' : ''}" onclick="togglePickerCube('${c.id}')">
        <div>
          <div class="cube-picker-item-name">${escHtml(c.name)}</div>
          <div class="cube-picker-item-sub">${{base:'🍚 베이스죽',protein:'🥩 단백질',other:'🥦 기타',snack:'🥞 간식'}[c.category]||''} · ${c.g}g/큐브 · <span class="${dd.danger ? 'picker-dday-danger' : ''}">${dd.label}</span></div>
        </div>
        <div>
          <div class="cube-picker-item-rem">잔여 ${rem}개</div>
          ${sel ? '<div style="font-size:10px;color:rgba(255,255,255,.8);text-align:right">✓ 선택됨</div>' : ''}
        </div>
      </div>`;
  }).join('');
}
function togglePickerCube(cubeId) {
  const cube = cubeItems.find(c => c.id === cubeId);
  if (!cube) return;
  const idx = pickerSelected.findIndex(x => x.cubeId === cubeId);
  if (idx >= 0) pickerSelected.splice(idx, 1);
  else pickerSelected.push({ cubeId: cube.id, cubeName: cube.name, g: cube.g, cat: pickerCat });
  renderCubePickerList(document.getElementById('cube-picker-search').value);
  updatePickerBtn();
  const info = document.getElementById('cube-picker-selected-info');
  if (pickerSelected.length > 0) {
    info.textContent = '선택: ' + pickerSelected.map(x => x.cubeName).join(', ');
    info.classList.remove('hidden');
  } else { info.classList.add('hidden'); }
}
function updatePickerBtn() {
  document.getElementById('btn-cube-picker-confirm').textContent = `추가 (${pickerSelected.length}개)`;
}
function confirmCubePick() {
  if (!pickerSelected.length) return toast('큐브를 선택해주세요');
  pickerSelected.forEach(c => {
    slotCubes[pickerCat] = slotCubes[pickerCat] || [];
    slotCubes[pickerCat].push({...c});
  });
  renderSlotCubes(); updateTotalG();
  closeModal('modal-cube-picker');
  toast(`${pickerSelected.length}개 큐브 추가 완료 🧊`);
}

// ════════════════════════════════════════
// TAB 3: 큐브 관리
// ════════════════════════════════════════
let cubeItems = [], activeCubeTab = 'active', editingCubeId = null;
let editIngredients = [], cubeNameManual = false;
let cubeSortBy = 'expire';
let cubeCatFilter = 'all';

function initCubeTab() {
  loadCubes();
  document.querySelectorAll('.cube-tab-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.cube-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCubeTab = btn.dataset.ctab;
      document.getElementById('cube-list-active').classList.toggle('hidden', activeCubeTab !== 'active');
      document.getElementById('cube-list-done').classList.toggle('hidden',   activeCubeTab !== 'done');
      document.getElementById('cube-done-header').classList.toggle('hidden', activeCubeTab !== 'done');
    };
  });
  document.getElementById('btn-add-cube').onclick = () => openCubeModal(null);
  document.getElementById('btn-cube-save').onclick   = saveCube;
  document.getElementById('btn-cube-delete').onclick = deleteCube;
  document.getElementById('btn-delete-all-done').onclick = deleteAllDoneCubes;
  document.getElementById('btn-add-ingredient').onclick = addIngredient;
  document.getElementById('cube-ingredient-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addIngredient(); }
  });
  document.getElementById('cube-name').addEventListener('input', () => { cubeNameManual = true; });

  document.querySelectorAll('.cube-sort-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.cube-sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      cubeSortBy = btn.dataset.sort;
      renderCubeList();
    };
  });
  document.querySelectorAll('.cube-cat-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.cube-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      cubeCatFilter = btn.dataset.cat;
      renderCubeList();
    };
  });
}

async function loadCubes() {
  cubeItems = await dbGetAll('cubes');
  renderCubeList();
}

function renderCubeList() {
  const catOrder = { base:0, protein:1, other:2, snack:3 };
  function sortCubes(list) {
    if (cubeSortBy === 'expire') {
      return list.slice().sort((a, b) => {
        const expA = addDays(a.made_date, a.expire_days||14);
        const expB = addDays(b.made_date, b.expire_days||14);
        if (expA !== expB) return expA.localeCompare(expB);
        return (a.id||'').localeCompare(b.id||'');
      });
    } else {
      return list.slice().sort((a, b) => {
        const catDiff = (catOrder[a.category]||0) - (catOrder[b.category]||0);
        if (catDiff !== 0) return catDiff;
        if (a.made_date !== b.made_date) return a.made_date.localeCompare(b.made_date);
        return (a.id||'').localeCompare(b.id||'');
      });
    }
  }

  let active = cubeItems.filter(c => c.status !== 'done');
  let done   = cubeItems.filter(c => c.status === 'done');
  if (cubeCatFilter !== 'all') {
    active = active.filter(c => c.category === cubeCatFilter);
    done   = done.filter(c => c.category === cubeCatFilter);
  }
  active = sortCubes(active);
  done   = done.slice().sort((a,b) => b.made_date.localeCompare(a.made_date));

  const activeList = document.getElementById('cube-list-active');
  const doneList   = document.getElementById('cube-list-done');
  activeList.innerHTML = active.length === 0
    ? `<div class="empty-state"><span class="empty-icon">🧊</span>등록된 큐브가 없어요.<br>+ 큐브 등록으로 추가해주세요!</div>`
    : active.map(cubeCardHtml).join('');
  doneList.innerHTML = done.length === 0
    ? `<div class="empty-state"><span class="empty-icon">✅</span>소진된 큐브가 없어요.</div>`
    : done.map(cubeCardHtml).join('');
}

function cubeCardHtml(c) {
  const expStr = addDays(c.made_date, c.expire_days||7);
  const dd     = dday(expStr);
  const rem    = (c.count||0) - (c.used_count||0);
  const isDone = c.status === 'done';
  return `
    <div class="cube-card ${c.category||''}">
      <div class="cube-card-name">
        ${escHtml(c.name)}
        ${isDone ? '<span class="cube-done-badge">소진</span>' : ''}
      </div>
      <div class="cube-card-right">
        <button class="cube-edit-btn" onclick="openCubeModal('${c.id}')">수정</button>
        <div class="cube-card-rem">${rem}<span>/${c.count}개</span></div>
      </div>
      <div class="cube-card-meta">
        <span class="cube-badge">${shortDate(c.made_date)}</span>
        <span class="cube-badge">${c.g}g/큐브</span>
        <span class="cube-badge ${dd.danger ? 'danger' : 'ok'}">${expStr} (${dd.label})</span>
      </div>
    </div>`;
}

async function consumeOne(id) {
  const cube = cubeItems.find(c => c.id === id);
  if (!cube) return;
  const rem = (cube.count||0) - (cube.used_count||0);
  if (rem <= 0) return toast('남은 큐브가 없어요');
  const newUsed = (cube.used_count||0) + 1;
  const newStatus = newUsed >= cube.count ? 'done' : 'active';
  try {
    await dbUpdate('cubes', id, { used_count: newUsed, status: newStatus });
    closeModal('modal-cube');
    await loadCubes();
    toast(`${cube.name} 1개 소진 완료`);
  } catch(e) { toast('오류: ' + e.message); }
}

async function consumeAll(id) {
  const cube = cubeItems.find(c => c.id === id);
  if (!cube) return;
  if (!confirm(`${cube.name} 전량 소진할까요?`)) return;
  try {
    await dbUpdate('cubes', id, { used_count: cube.count, status: 'done' });
    closeModal('modal-cube');
    await loadCubes();
    toast(`${cube.name} 전량 소진 완료 ✅`);
  } catch(e) { toast('오류: ' + e.message); }
}

function openCubeModal(id) {
  editingCubeId = id;
  editIngredients = [];
  cubeNameManual = !!id;
  const isEdit = !!id;
  document.getElementById('modal-cube-title').textContent = isEdit ? '큐브 수정' : '큐브 등록';
  document.getElementById('btn-cube-delete').classList.toggle('hidden', !isEdit);
  // 소진 버튼 표시 (수정 모드이고 아직 소진 안 된 경우)
  const c = isEdit ? cubeItems.find(x => x.id === id) : null;
  const consumeRow = document.getElementById('cube-consume-row');
  if (consumeRow) {
    if (isEdit && c && c.status !== 'done') {
      const rem = (c.count||0) - (c.used_count||0);
      consumeRow.classList.remove('hidden');
      document.getElementById('btn-consume-one').disabled = rem <= 0;
      document.getElementById('btn-consume-one').textContent = `－ 낱개 소진 (잔여 ${rem}개)`;
    } else {
      consumeRow.classList.add('hidden');
    }
  }
  if (isEdit) {
    const c = cubeItems.find(x => x.id === id);
    document.getElementById('cube-name').value = c.name;
    document.getElementById('cube-category').value = c.category || 'base';
    document.getElementById('cube-g').value = c.g || '';
    document.getElementById('cube-count').value = c.count || '';
    document.getElementById('cube-made-date').value = c.made_date;
    document.getElementById('cube-expire-days').value = c.expire_days || '';
    editIngredients = [...(c.ingredients||[])];
  } else {
    document.getElementById('cube-name').value = '';
    document.getElementById('cube-category').value = 'base';
    document.getElementById('cube-g').value = '';
    document.getElementById('cube-count').value = '';
    document.getElementById('cube-made-date').value = fmtDate(new Date());
    document.getElementById('cube-expire-days').value = 14;
    editIngredients = [];
  }
  document.getElementById('cube-ingredient-input').value = '';
  renderIngredientTags();
  openModal('modal-cube');
}

function addIngredient() {
  const val = document.getElementById('cube-ingredient-input').value.trim();
  if (!val) return;
  if (!editIngredients.includes(val)) editIngredients.push(val);
  if (!cubeNameManual) document.getElementById('cube-name').value = editIngredients.join(' ');
  renderIngredientTags();
  document.getElementById('cube-ingredient-input').value = '';
}
function removeIngredient(ing) {
  editIngredients = editIngredients.filter(i => i !== ing);
  if (!cubeNameManual) document.getElementById('cube-name').value = editIngredients.join(' ');
  renderIngredientTags();
}
function renderIngredientTags() {
  document.getElementById('cube-ingredients-list').innerHTML = editIngredients.map(ing => `
    <span class="ingredient-tag">
      ${escHtml(ing)}
      <span class="rm-ing" onclick="removeIngredient('${escHtml(ing)}')">✕</span>
    </span>`).join('');
}

async function saveCube() {
  const name        = document.getElementById('cube-name').value.trim();
  const category    = document.getElementById('cube-category').value;
  const g           = parseInt(document.getElementById('cube-g').value) || 0;
  const count       = parseInt(document.getElementById('cube-count').value) || 0;
  const made_date   = document.getElementById('cube-made-date').value;
  const expire_days = parseInt(document.getElementById('cube-expire-days').value) || 7;
  if (!name)      return toast('큐브 이름을 입력해주세요');
  if (!made_date) return toast('제조일을 선택해주세요');
  const data = { name, category, g, count, made_date, expire_days, ingredients: editIngredients, status: 'active' };
  try {
    if (editingCubeId) {
      const existing = cubeItems.find(c => c.id === editingCubeId);
      data.used_count = existing?.used_count || 0;
      await dbUpdate('cubes', editingCubeId, data);
      toast('큐브가 수정되었어요 ✏️');
    } else {
      data.used_count = 0;
      await dbInsert('cubes', data);
      toast('큐브가 등록되었어요 🧊');
    }
    await loadCubes();
    closeModal('modal-cube');
  } catch(e) { toast('저장 실패: ' + e.message); }
}

async function deleteCube() {
  if (!editingCubeId) return;
  if (!confirm('이 큐브를 삭제할까요?')) return;
  try {
    await dbDelete('cubes', editingCubeId);
    toast('삭제되었어요 🗑️');
    await loadCubes();
    closeModal('modal-cube');
  } catch(e) { toast('삭제 실패: ' + e.message); }
}

async function deleteAllDoneCubes() {
  let targets = cubeItems.filter(c => c.status === 'done');
  if (cubeCatFilter !== 'all') targets = targets.filter(c => c.category === cubeCatFilter);
  if (targets.length === 0) return toast('삭제할 소진된 큐브가 없어요');
  if (!confirm(`소진된 큐브 ${targets.length}개를 모두 삭제할까요?\n삭제 후 복구할 수 없어요.`)) return;
  try {
    await Promise.all(targets.map(c => dbDelete('cubes', c.id)));
    toast(`소진된 큐브 ${targets.length}개 삭제 완료 🗑️`);
    await loadCubes();
  } catch(e) { toast('삭제 실패: ' + e.message); }
}

// ════════════════════════════════════════
// PWA
// ════════════════════════════════════════
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    }).catch(() => {});
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
}

// ════════════════════════════════════════
// START
// ════════════════════════════════════════
initAuth();
