console.log('🏁 votes.js carregando...');
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const getSession = () => {
  try {
    let s = localStorage.getItem('va_session');
    if (!s) { s = uid(); localStorage.setItem('va_session', s); }
    return s;
  } catch (e) {
    console.warn("localStorage bloqueado:", e);
    return uid();
  }
};
const SESSION = getSession();
// Conexão segura com Supabase (via supabase.js)
const sb = () => window.sb();

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function timeAgo(ts) {
  const d = Date.now() - Number(ts);
  if (d < 60000) return 'agora';
  if (d < 3600000) return Math.floor(d / 60000) + 'min atrás';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h atrás';
  return Math.floor(d / 86400000) + 'd atrás';
}

function fmtNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function toast(msg, dur = 3000) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), dur);
}

/* ═══════════════════════════════════════════════
   PALETA DE CORES
═══════════════════════════════════════════════ */
const PALETTE = [
  { main: '#EF4444', grad: 'linear-gradient(135deg,#EF4444,#DC2626)', bg: 'rgba(239,68,68,0.12)' },
  { main: '#06B6D4', grad: 'linear-gradient(135deg,#06B6D4,#0891B2)', bg: 'rgba(6,182,212,0.12)' },
  { main: '#F59E0B', grad: 'linear-gradient(135deg,#F59E0B,#D97706)', bg: 'rgba(245,158,11,0.12)' },
  { main: '#A78BFA', grad: 'linear-gradient(135deg,#A78BFA,#7C3AED)', bg: 'rgba(167,139,250,0.12)' },
  { main: '#10B981', grad: 'linear-gradient(135deg,#10B981,#059669)', bg: 'rgba(16,185,129,0.12)' },
  { main: '#EC4899', grad: 'linear-gradient(135deg,#EC4899,#DB2777)', bg: 'rgba(236,72,153,0.12)' },
  { main: '#60A5FA', grad: 'linear-gradient(135deg,#60A5FA,#2563EB)', bg: 'rgba(96,165,250,0.12)' },
  { main: '#F97316', grad: 'linear-gradient(135deg,#F97316,#EA580C)', bg: 'rgba(249,115,22,0.12)' },
];

const EMOJIS_PARTICIPANTES = ['🎯', '🌊', '⭐', '🔥', '💎', '🌙', '🎪', '🎭'];

/* ═══════════════════════════════════════════════
   TABS / NAVEGAÇÃO
═══════════════════════════════════════════════ */
let currentTab = 'bbb';

function switchTab(name, desktopNavId, mobileNavId) {
  currentTab = name;

  // Desktop nav
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (desktopNavId) document.getElementById(desktopNavId)?.classList.add('active');

  // Mobile nav
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
  if (mobileNavId) document.getElementById(mobileNavId)?.classList.add('active');
  else {
    // Auto detect mobile nav
    const mMap = { bbb: 'mnav-bbb', polls: 'mnav-polls', shorts: 'mnav-shorts', videos: 'mnav-videos' };
    if (mMap[name]) document.getElementById(mMap[name])?.classList.add('active');
  }

  // Tabs
  ['bbb', 'polls', 'shorts', 'videos'].forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) el.style.display = t === name ? '' : 'none';
  });

  // Lazy load
  if (name === 'polls') { renderPolls(); renderRanking(); }
  if (name === 'shorts') renderShorts();
  if (name === 'videos') renderVideos();
}
window.switchTab = switchTab;

function switchSub(name, btn) {
  document.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  ['parciais', 'fontes', 'votar', 'grafico'].forEach(s => {
    const el = document.getElementById('sub-' + s);
    if (el) el.style.display = s === name ? '' : 'none';
  });
  if (name === 'votar') renderBBBVote();
  if (name === 'grafico') renderChart();
}
window.switchSub = switchSub;

function switchToVote() {
  switchSub('votar', null);
  // Activate the 3rd sub-tab manually
  const tabs = document.querySelectorAll('.sub-tab');
  tabs.forEach(t => t.classList.remove('active'));
  if (tabs[2]) tabs[2].classList.add('active');
  window.scrollTo({ top: 400, behavior: 'smooth' });
}
window.switchToVote = switchToVote;

/* ═══════════════════════════════════════════════
   BBB 26 — CONFIGURAÇÃO DO PAREDÃO
   Edite aqui para cada novo paredão!
═══════════════════════════════════════════════ */
const BBB_CONFIG = {
  edicao: 'BBB 26',
  paredaoNum: 6,
  candidatos: [
    { nome: 'Milena', chave: 'milena', emoji: '🔴' },
    { nome: 'Maxiane', chave: 'maxiane', emoji: '🔵' },
    { nome: 'Chaiany', chave: 'chaiany', emoji: '🟡' },
  ],
  // Data/hora do próximo paredão (domingo às 22h30)
  proximoParedao: (() => {
    const now = new Date();
    // Próximo domingo às 22:30
    const next = new Date(now);
    const dom = (7 - now.getDay()) % 7 || 7;
    next.setDate(now.getDate() + dom);
    next.setHours(22, 30, 0, 0);
    return next;
  })(),
};

// Dados de fontes externas (atualize manualmente ou via API)
const FONTES_DATA = {
  nomes: ['Milena', 'Maxiane', 'Chaiany'],
  uol: [50.85, 48.67, 0.48],
  nsc: [56.10, 42.80, 1.00],
  ntv: [48.16, 50.61, 1.23],
  vot: [27.10, 68.17, 4.73],
};

const HISTORICO = [
  { hora: '09h (NSC)', vals: [56.1, 42.8, 1.0] },
  { hora: '10h (Notícias)', vals: [48.16, 50.61, 1.23] },
  { hora: '15h (Votalhada)', vals: [27.1, 68.17, 4.73] },
  { hora: '18h (UOL)', vals: [50.85, 48.67, 0.48] },
];

/* ═══════════════════════════════════════════════
   COUNTDOWN
═══════════════════════════════════════════════ */
function updateCountdown() {
  const diff = BBB_CONFIG.proximoParedao - new Date();
  if (diff <= 0) {
    document.getElementById('cd-horas').textContent = '00';
    document.getElementById('cd-min').textContent = '00';
    document.getElementById('cd-seg').textContent = '00';
    return;
  }
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  document.getElementById('cd-horas').textContent = String(h).padStart(2, '0');
  document.getElementById('cd-min').textContent = String(m).padStart(2, '0');
  document.getElementById('cd-seg').textContent = String(s).padStart(2, '0');
}
setInterval(updateCountdown, 1000);
updateCountdown();

/* ═══════════════════════════════════════════════
   BBB VOTES — SUPABASE
═══════════════════════════════════════════════ */
let bbbCounts = {};
let bbbTotal = 0;

async function loadBBBVotes() {
  window.loadBBBVotes = loadBBBVotes; // Retrocompatibilidade explicita
  const btn = document.getElementById('btn-reload');
  if (btn) btn.textContent = '⏳ Carregando...';

  try {
    console.log('📡 Buscando votos do Supabase...');
    const { data, error } = await sb().from('votos_paredao').select('participante');

    if (error) {
      console.error('❌ Erro na consulta Supabase:', error);
      throw error;
    }

    console.log(`✅ ${data?.length || 0} votos recebidos.`);

    const counts = {};
    BBB_CONFIG.candidatos.forEach(c => counts[c.chave] = 0);

    (data || []).forEach(row => {
      const p = (row.participante || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      BBB_CONFIG.candidatos.forEach(c => {
        if (p.includes(c.chave.toLowerCase())) counts[c.chave]++;
      });
    });

    bbbCounts = counts;
    bbbTotal = Object.values(counts).reduce((a, b) => a + b, 0);

    renderBBBCards();
    renderVerdict();

    const heroVotesEl = document.getElementById('hero-total-votes');
    if (heroVotesEl) {
      // Usa a função de animação se existir no votes.js (v4 layout)
      if (typeof updateHeroVoteCounter === 'function') {
        updateHeroVoteCounter(bbbTotal);
      } else {
        heroVotesEl.textContent = fmtNum(bbbTotal);
      }
    }

    const lastUpdateEl = document.getElementById('last-update');
    if (lastUpdateEl) lastUpdateEl.textContent = new Date().toLocaleTimeString('pt-BR');

    // Atualiza indicadores e tendência se as funções existirem (v4 layout)
    if (typeof updateHeroIndicators === 'function') updateHeroIndicators(bbbTotal);
    if (typeof updateTrendingCard === 'function') updateTrendingCard(BBB_CONFIG.candidatos.map(c => ({ name: c.nome, pct: bbbTotal > 0 ? (counts[c.chave] / bbbTotal * 100) : 0 })));

  } catch (e) {
    console.error('❌ Erro crítico ao carregar votos:', e);
    toast('⚠️ Falha ao atualizar dados. Verifique sua conexão.');
  } finally {
    if (btn) btn.textContent = '🔄 Atualizar parcial';
  }
}

function renderBBBCards() {
  const grid = document.getElementById('candidates-grid');
  if (!grid) return;

  const sorted = BBB_CONFIG.candidatos
    .map((c, i) => ({
      ...c,
      count: bbbCounts[c.chave] || 0,
      pct: bbbTotal > 0 ? ((bbbCounts[c.chave] || 0) / bbbTotal * 100).toFixed(1) : '0.0',
      pal: PALETTE[i % PALETTE.length],
      emoji_char: EMOJIS_PARTICIPANTES[i],
    }))
    .sort((a, b) => b.count - a.count);

  const leadIdx = 0; // após sort

  grid.innerHTML = sorted.map((c, i) => `
      <div class="candidate-card ${i === 0 ? 'leading' : ''} fade-up"
           style="--cand-color:${c.pal.main};--cand-bg:${c.pal.bg}">
        ${i === 0 ? '<div class="leading-badge"></div>' : ''}
        <div style="display:flex;align-items:flex-start;gap:12px">
          <div class="cand-avatar-wrap">
            <div class="cand-avatar">
              ${getCandPhoto(c.chave) ? `<img src="${getCandPhoto(c.chave)}" alt="${escAttr(c.nome)}">` : c.emoji}
            </div>
            <div class="cand-avatar-edit" onclick="promptCandPhoto('${c.chave}')" title="Trocar foto">✏️</div>
          </div>
          <div style="flex:1;min-width:0">
            <div class="cand-name" style="color:${c.pal.main}">${escHtml(c.nome)}</div>
            <div class="cand-pct">${c.pct}%</div>
          </div>
        </div>
        ${i === 0 ? `<div class="cand-trend trend-${c.pct > 50 ? 'up' : 'down'}">${c.pct > 50 ? '▲ Liderando' : '▼ Perseguindo'}</div>` : ''}
        <div class="cand-bar-wrap">
          <div class="cand-bar-fill" style="width:${c.pct}%"></div>
        </div>
        <div class="cand-votes">
          ${fmtNum(c.count)} votos
          <span style="float:right;opacity:0.6">#${i + 1}</span>
        </div>
      </div>
    `).join('');

  // Atualiza fontes externas com os nomes corretos
  updateFontesNomes();
  updateFontesData();
}

function updateFontesNomes() {
  const nomes = BBB_CONFIG.candidatos.map(c => c.nome);
  const ids = ['src-h1', 'src-h2', 'src-h3'];
  const colors = ['#EF4444', '#06B6D4', '#F59E0B'];
  nomes.forEach((n, i) => {
    const el = document.getElementById(ids[i]);
    if (el) { el.textContent = n; el.style.color = colors[i]; }
  });
  // Legend no gráfico
  nomes.forEach((n, i) => {
    const el = document.getElementById(`legend-${i + 1}`);
    if (el) el.textContent = n;
  });
}

function updateFontesData() {
  const ids = [['uol', 'nsc', 'ntv', 'vot'], ['1', '2', '3']];
  ['uol', 'nsc', 'ntv', 'vot'].forEach(src => {
    const vals = FONTES_DATA[src];
    vals.forEach((v, i) => {
      const el = document.getElementById(`${src}-${i + 1}`);
      if (el) el.textContent = v + '%';
    });
  });
}

function renderVerdict() {
  if (!bbbTotal) return;
  const sorted = BBB_CONFIG.candidatos
    .map(c => ({ ...c, pct: bbbTotal > 0 ? (bbbCounts[c.chave] || 0) / bbbTotal * 100 : 0 }))
    .sort((a, b) => b.pct - a.pct);

  const leader = sorted[0];
  const gap = (sorted[0].pct - sorted[1].pct).toFixed(1);

  document.getElementById('verdict-title').textContent =
    `${leader.emoji} ${leader.nome} na frente com ${leader.pct.toFixed(1)}%`;
  document.getElementById('verdict-text').textContent =
    `${gap}% de vantagem sobre ${sorted[1].nome}. ` +
    (leader.pct > 50 ? `Tendência de eliminação: ${leader.nome}.` : 'Disputa muito acirrada!');
}

/* ═══════════════════════════════════════════════
   BBB VOTE (VOTAR AQUI)
═══════════════════════════════════════════════ */
async function renderBBBVote() {
  const area = document.getElementById('bbb-vote-area');
  if (!area) return;

  const voted = localStorage.getItem('va_bbb_voted');
  const votedFor = localStorage.getItem('va_bbb_voted_for');

  if (!bbbTotal) await loadBBBVotes();

  const opts = BBB_CONFIG.candidatos.map((c, i) => ({
    ...c,
    count: bbbCounts[c.chave] || 0,
    pct: bbbTotal > 0 ? ((bbbCounts[c.chave] || 0) / bbbTotal * 100) : 0,
    pal: PALETTE[i % PALETTE.length],
  }));

  area.innerHTML = `
      <div class="card" style="border-color:rgba(124,58,237,0.2)">
        <div class="section-eyebrow">PAREDÃO ${BBB_CONFIG.paredaoNum}</div>
        <div style="font-family:var(--font-head);font-size:18px;font-weight:800;margin-bottom:6px">
          Quem deve ser eliminado?
        </div>
        <div style="font-size:12px;color:var(--muted2);margin-bottom:18px">
          Vote e veja a parcial em tempo real • ${fmtNum(bbbTotal)} votos
        </div>

        <div id="bbb-opts">
          ${opts.map(c => `
            <div class="opt-row ${voted ? 'voted' : ''} ${voted && votedFor === c.chave ? 'selected' : ''}"
                 id="bbb-opt-${c.chave}"
                 onclick="voteBBB('${c.chave}')"
                 style="--opt-color:${c.pal.main};--opt-grad:${c.pal.grad};margin-bottom:8px">
              <div class="opt-fill" style="width:${voted ? c.pct : 0}%"></div>
              <div class="opt-inner">
                <div class="opt-left">
                  <div class="opt-check ${voted && votedFor === c.chave ? 'checked' : ''}"></div>
                  ${getCandPhoto(c.chave)
      ? `<img src="${getCandPhoto(c.chave)}" style="width:28px;height:28px;border-radius:8px;object-fit:cover;border:1px solid ${c.pal.main}">`
      : `<span style="font-size:22px">${c.emoji}</span>`}
                  <span class="opt-label">${escHtml(c.nome)}</span>
                </div>
                <span class="opt-pct">${voted ? c.pct.toFixed(1) + '%' : ''}</span>
              </div>
            </div>
          `).join('')}
        </div>

        ${voted ? `
          <div style="text-align:center;margin-top:12px;font-size:12px;color:var(--green2);font-weight:600">
            ✅ Você votou em <strong>${votedFor}</strong>
          </div>
        ` : ''}

        <div style="margin-top:16px;padding:12px 14px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:10px;font-size:11px;color:var(--muted2);line-height:1.8;text-align:center">
          ℹ️ Esta é uma enquete de termômetro. Vote oficialmente em
          <a href="https://gshow.globo.com" target="_blank" rel="noopener" style="color:var(--accent3)">gshow.globo.com</a>
        </div>
      </div>
    `;
}

async function voteBBB(chave) {
  if (localStorage.getItem('va_bbb_voted')) {
    toast('Você já votou neste paredão!');
    return;
  }

  try {
    const { error } = await sb().from('votos_paredao').insert({
      participante: chave,
      session_id: SESSION,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    localStorage.setItem('va_bbb_voted', '1');
    localStorage.setItem('va_bbb_voted_for', chave);

    toast(`🗳 Voto computado! Você votou em ${chave.charAt(0).toUpperCase() + chave.slice(1)}`);
    launchConfete();

    await loadBBBVotes();
    renderBBBVote();
  } catch (e) {
    console.error('Erro ao votar:', e);
    toast('⚠️ Erro ao registrar voto. Tente novamente.');
  }
}

/* ═══════════════════════════════════════════════
   GRÁFICO HISTÓRICO
═══════════════════════════════════════════════ */
function renderChart() {
  const wrap = document.getElementById('chart-wrap');
  const labelsWrap = document.getElementById('chart-labels');
  if (!wrap) return;

  const colors = ['#EF4444', '#06B6D4', '#F59E0B'];
  const nomes = BBB_CONFIG.candidatos.map(c => c.nome);

  const inner = wrap.querySelector('div');
  if (!inner) return;

  // Máximo para normalizar
  const allVals = HISTORICO.flatMap(h => h.vals);
  const maxVal = Math.max(...allVals);

  inner.innerHTML = HISTORICO.map(h => `
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;height:100%;justify-content:flex-end">
        <div style="display:flex;gap:3px;align-items:flex-end;width:100%;justify-content:center">
          ${h.vals.map((v, i) => `
            <div style="
              width:${100 / h.vals.length - 3}%;
              height:${Math.max(4, (v / maxVal) * 100)}%;
              background:${colors[i]};
              border-radius:4px 4px 0 0;
              position:relative;
              min-height:4px;
              transition: height 0.8s cubic-bezier(0.4,0,0.2,1);
            " title="${nomes[i]}: ${v}%">
              <div style="position:absolute;top:-16px;left:50%;transform:translateX(-50%);font-size:8px;font-weight:700;color:${colors[i]};white-space:nowrap">
                ${v}%
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

  if (labelsWrap) {
    labelsWrap.innerHTML = HISTORICO.map(h => `
        <div style="text-align:center;font-size:9px;color:var(--muted2)">${h.hora}</div>
      `).join('');
  }

  // Timeline textual
  const timeline = document.getElementById('timeline-list');
  if (timeline) {
    timeline.innerHTML = HISTORICO.map((h, idx) => `
        <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:16px">
          <div style="width:4px;align-self:stretch;border-radius:4px;background:linear-gradient(to bottom, var(--accent), transparent);margin-top:4px;flex-shrink:0"></div>
          <div style="flex:1">
            <div style="font-size:11px;color:var(--muted2);margin-bottom:6px;font-weight:700">${h.hora}</div>
            <div style="display:flex;gap:2px;border-radius:6px;overflow:hidden;margin-bottom:4px">
              ${h.vals.map((v, i) => `
                <div style="flex:${v};height:22px;background:${colors[i]};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:rgba(0,0,0,0.75);min-width:${v > 5 ? 'auto' : '0px'}">
                  ${v > 8 ? v + '%' : ''}
                </div>
              `).join('')}
            </div>
            <div style="display:flex;gap:12px">
              ${nomes.map((n, i) => `
                <span style="font-size:10px;color:${colors[i]};font-weight:700">${n}: ${h.vals[i]}%</span>
              `).join('')}
            </div>
          </div>
        </div>
      `).join('');
  }
}

/* ═══════════════════════════════════════════════
   ENQUETES (POLLS) — SUPABASE
═══════════════════════════════════════════════ */
async function renderPolls() {
  window.renderPolls = renderPolls; // Retrocompatibilidade explicitamente no window
  const list = document.getElementById('polls-list');
  const countEl = document.getElementById('polls-count');
  if (!list) return;

  list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted2)">⏳ Carregando enquetes ativas...</div>`;

  let polls = [];

  try {
    // Busca enquetes e suas respectivas opções
    const { data: pollsData, error: pollsError } = await sb()
      .from('polls')
      .select('*, poll_options(*)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50);

    if (pollsError) throw pollsError;
    if (pollsData) polls = pollsData;
  } catch (e) {
    console.warn("Erro ao carregar do Supabase:", e.message);
  }

  // Merge com localStorage caso algo não tenha carregado e o Supabase tenha falhado
  if (!polls.length) {
    polls = JSON.parse(localStorage.getItem('va_polls_local') || '[]');
  }

  if (countEl) countEl.textContent = `${polls.length} enquete${polls.length !== 1 ? 's' : ''} ativa${polls.length !== 1 ? 's' : ''}`;

  if (!polls.length) {
    list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <div class="empty-title">Nenhuma enquete ainda</div>
          <div class="empty-desc">Em breve a equipe do VotaAí lançará novas votações exclusivas!</div>
        </div>`;
    return;
  }

  list.innerHTML = polls.map((poll, pi) => {
    // poll_options do Supabase
    const opts = poll.poll_options || [];
    opts.sort((a, b) => a.id.localeCompare(b.id)); // manter a ordem coerente
    const totalVotes = opts.reduce((s, o) => s + (o.vote_count || 0), 0) || 0;
    const votedKey = `va_voted_${poll.id}`;
    const voted = localStorage.getItem(votedKey);
    const ago = timeAgo(poll.created_at ? new Date(poll.created_at).getTime() : Date.now());
    const cat = 'bbb'; // fallback caso DB não tenha categoria
    const commentsKey = `va_comments_${poll.id}`;
    const comments = JSON.parse(localStorage.getItem(commentsKey) || '[]');

    return `
        <div class="card fade-up" id="poll-${poll.id}">
          <!-- Header da enquete -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;gap:8px">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
                <span style="font-size:11px">📊 <span style="color:var(--muted2)">${cat.toUpperCase()}</span></span>
                ${pi === 0 ? '<span class="badge badge-hot">🔥 Novo</span>' : ''}
                ${totalVotes > 100 ? '<span class="badge badge-live">⚡ Popular</span>' : ''}
              </div>
              <h3 style="font-family:var(--font-head);font-size:16px;font-weight:800;line-height:1.3;margin-bottom:0">${escHtml(poll.question)}</h3>
            </div>
            <button class="btn-icon" onclick="openShareModal('${escAttr(poll.question)}','Vote nesta enquete no VotaAí!')" title="Compartilhar">🔗</button>
          </div>

          <!-- Opções -->
          <div id="poll-opts-${poll.id}">
            ${renderPollOptions(poll, voted)}
          </div>

          <!-- Rodapé -->
          <div class="poll-footer">
            <div class="poll-meta">
              <span>🗳 ${fmtNum(totalVotes)} voto${totalVotes !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>💬 ${comments.length}</span>
              <span>·</span>
              <span>${ago}</span>
            </div>
            <button class="btn-ghost" onclick="toggleComments('${poll.id}')" style="font-size:11px">
              💬 Comentários
            </button>
          </div>

          <!-- Área de comentários (colapsada) -->
          <div id="comments-${poll.id}" style="display:none">
            ${renderCommentsSection(poll.id)}
          </div>
        </div>
      `;
  }).join('');
}

function renderPollOptions(poll, voted) {
  const opts = poll.poll_options || [];
  const totalVotes = opts.reduce((s, o) => s + (o.vote_count || 0), 0) || 0;

  return opts.map((opt, i) => {
    const pal = PALETTE[i % PALETTE.length];
    const color = pal.main;
    const pct = totalVotes > 0 ? ((opt.vote_count || 0) / totalVotes * 100).toFixed(1) : '0.0';

    return `
        <div class="opt-row ${voted ? 'voted' : ''}"
             id="opt-${opt.id}"
             onclick="votePoll('${poll.id}', '${opt.id}')"
             style="--opt-color:${color};--opt-grad:linear-gradient(135deg,${color},${color + '88'})">
          <div class="opt-fill" style="width:${voted ? pct : 0}%"></div>
          <div class="opt-inner">
            <div class="opt-left">
              <div class="opt-check ${voted && voted === opt.id ? 'checked' : ''}"></div>
              <span class="opt-label">${escHtml(opt.option_text)}</span>
            </div>
            <span class="opt-pct">${voted ? pct + '%' : ''}</span>
          </div>
        </div>
      `;
  }).join('');
}

async function votePoll(pollId, optionId) {
  const votedKey = `va_voted_${pollId}`;
  if (localStorage.getItem(votedKey)) { toast('Você já votou nesta enquete!'); return; }

  // Atualiza localmente primeiro (optimistic)
  localStorage.setItem(votedKey, optionId);

  try {
    // Faz login em conta anônima do Supabase se necessário para votar (garantia de RLS) ou só usa o user logado (Guest Session real)
    const { data: { session } } = await sb().auth.getSession();

    if (!session) {
      // Se RLS requer auth, como pedido pelo cliente, podemos usar SignInAnonymously
      const { error: anonError } = await sb().auth.signInAnonymously();
      if (anonError) {
        console.warn("Autenticação anônima falhou, tentando inserir sem auth: ", anonError);
      }
    }

    // Insere voto na tabela votes (a trigger no bd vai somar aos poll_options)
    const { error: insertError } = await sb().from('votes').insert({
      poll_id: pollId,
      option_id: optionId
    });

    if (insertError) throw insertError;

    toast(`✅ Voto computado!`);
  } catch (e) {
    console.error('Erro de voto no Supabase:', e.message);
  }

  // Re-renderiza apenas essa enquete
  renderPolls();
  renderRanking();
}

/* ═══════════════════════════════════════════════
   RANKING
═══════════════════════════════════════════════ */
async function renderRanking() {
  const listEl = document.getElementById('ranking-list');
  if (!listEl) return;

  let polls = [];
  try {
    const { data } = await sb().from('polls').select('id, question, poll_options(vote_count)').eq('status', 'active');
    if (data) polls = data;
  } catch (e) { }

  polls = polls
    .map(p => ({
      title: p.question,
      votes: (p.poll_options || []).reduce((s, o) => s + (o.vote_count || 0), 0)
    }))
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 5);

  if (!polls.length) {
    listEl.innerHTML = `<div style="color:var(--muted2);font-size:13px;text-align:center;padding:20px">Nenhuma enquete ainda</div>`;
    return;
  }

  listEl.innerHTML = polls.map((p, i) => `
      <div class="ranking-item fade-up" onclick="switchTab('polls','nav-polls')">
        <div class="rank-num ${i < 3 ? 'top' : ''}">${i + 1}</div>
        <div class="rank-info">
          <div class="rank-title">${escHtml(p.title)}</div>
          <div class="rank-meta">🗳 ${fmtNum(p.votes)} votos</div>
        </div>
        <div class="rank-votes">${fmtNum(p.votes)}</div>
      </div>
    `).join('');
}

/* ═══════════════════════════════════════════════
   COMENTÁRIOS
═══════════════════════════════════════════════ */
let commentSort = {}; // pollId -> 'recent' | 'likes'

function renderCommentsSection(pollId) {
  const sort = commentSort[pollId] || 'recent';
  return `
      <div class="comments-section">
        <div class="comments-header">
          <div class="comments-title">💬 Comentários</div>
          <div class="comments-sort">
            <button class="sort-btn ${sort === 'recent' ? 'active' : ''}" onclick="setCommentSort('${pollId}','recent')">Recentes</button>
            <button class="sort-btn ${sort === 'likes' ? 'active' : ''}" onclick="setCommentSort('${pollId}','likes')">Mais curtidos</button>
          </div>
        </div>
        <div class="comment-input-wrap">
          <textarea class="comment-input" id="comment-inp-${pollId}" placeholder="Escreva um comentário anônimo..." rows="1"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();postComment('${pollId}');}"></textarea>
          <button class="btn-comment-send" onclick="postComment('${pollId}')">Enviar</button>
        </div>
        <div class="comment-list" id="comment-list-${pollId}">
          ${renderCommentsList(pollId, sort)}
        </div>
      </div>
    `;
}

function renderCommentsList(pollId, sort = 'recent') {
  const key = `va_comments_${pollId}`;
  let comments = JSON.parse(localStorage.getItem(key) || '[]');
  const likedKey = `va_liked_comments_${pollId}`;
  const liked = JSON.parse(localStorage.getItem(likedKey) || '[]');

  if (sort === 'likes') comments = [...comments].sort((a, b) => b.likes - a.likes);

  if (!comments.length) return `<div style="color:var(--muted2);font-size:12px;text-align:center;padding:16px">Seja o primeiro a comentar!</div>`;

  return comments.map((c, ci) => `
      <div class="comment-item" id="comment-${pollId}-${ci}">
        <div class="comment-meta">
          <span class="comment-author">${c.author || 'Anônimo #' + String(c.id || ci).slice(-4)}</span>
          <span class="comment-time">${timeAgo(c.ts || Date.now())}</span>
        </div>
        <div class="comment-text">${escHtml(c.text)}</div>
        <div class="comment-actions">
          <button class="btn-like-comment ${liked.includes(ci) ? 'liked' : ''}"
                  onclick="likeComment('${pollId}',${ci})">
            ♥ <span id="cl-${pollId}-${ci}">${c.likes || 0}</span>
          </button>
        </div>
      </div>
    `).join('');
}

function toggleComments(pollId) {
  const el = document.getElementById(`comments-${pollId}`);
  if (!el) return;
  const isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : '';
  if (!isOpen) el.innerHTML = renderCommentsSection(pollId);
}

function setCommentSort(pollId, sort) {
  commentSort[pollId] = sort;
  const listEl = document.getElementById(`comment-list-${pollId}`);
  if (listEl) listEl.innerHTML = renderCommentsList(pollId, sort);
  // Atualiza botões
  const section = document.getElementById(`comments-${pollId}`);
  if (section) section.querySelectorAll('.sort-btn').forEach((b, i) => {
    b.classList.toggle('active', (i === 0 && sort === 'recent') || (i === 1 && sort === 'likes'));
  });
}

function postComment(pollId) {
  const inp = document.getElementById(`comment-inp-${pollId}`);
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) { toast('Escreva um comentário'); return; }
  if (text.length > 500) { toast('Comentário muito longo!'); return; }

  const key = `va_comments_${pollId}`;
  const comments = JSON.parse(localStorage.getItem(key) || '[]');
  comments.unshift({ id: uid(), text, author: 'Anônimo', ts: Date.now(), likes: 0 });
  localStorage.setItem(key, JSON.stringify(comments));

  inp.value = '';
  toast('💬 Comentário publicado!');

  const listEl = document.getElementById(`comment-list-${pollId}`);
  if (listEl) listEl.innerHTML = renderCommentsList(pollId, commentSort[pollId] || 'recent');
}

function likeComment(pollId, idx) {
  const key = `va_comments_${pollId}`;
  const likedKey = `va_liked_comments_${pollId}`;
  const comments = JSON.parse(localStorage.getItem(key) || '[]');
  const liked = JSON.parse(localStorage.getItem(likedKey) || '[]');

  if (liked.includes(idx)) { toast('Você já curtiu este comentário!'); return; }

  comments[idx] = { ...comments[idx], likes: (comments[idx].likes || 0) + 1 };
  liked.push(idx);
  localStorage.setItem(key, JSON.stringify(comments));
  localStorage.setItem(likedKey, JSON.stringify(liked));

  const countEl = document.getElementById(`cl-${pollId}-${idx}`);
  if (countEl) countEl.textContent = comments[idx].likes;

  const btn = countEl?.closest('.btn-like-comment');
  if (btn) btn.classList.add('liked');
}

/* ═══════════════════════════════════════════════
   SHORTS — TIKTOK STYLE
═══════════════════════════════════════════════ */
let shortsFilter = 'todos';
let shortsObserver = null;

window.filterShorts = function (cat, btn) {
  shortsFilter = cat;
  document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderShorts();
}

window.showShortForm = function () {
  document.getElementById('short-form').style.display = '';
  window.scrollTo({ top: 300, behavior: 'smooth' });
}
window.hideShortForm = function () {
  document.getElementById('short-form').style.display = 'none';
}

let currentShortSrc = 'youtube';
function switchShortSrc(src, btn) {
  currentShortSrc = src;
  // Atualiza botões ativos
  document.querySelectorAll('[id^="short-src-"]').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const hints = {
    youtube: 'Link do YouTube Shorts. Ex: https://youtube.com/shorts/...',
    facebook: 'URL pública do vídeo no Facebook. Ex: https://www.facebook.com/watch?v=...',
    tiktok: 'URL do vídeo no TikTok. Ex: https://www.tiktok.com/@usuario/video/...',
    x: 'URL do tweet com vídeo. Ex: https://x.com/usuario/status/...',
    mp4: 'URL direta de arquivo MP4. Ex: https://exemplo.com/video.mp4',
  };
  const placeholders = {
    youtube: 'https://youtube.com/shorts/...',
    facebook: 'https://www.facebook.com/watch?v=...',
    tiktok: 'https://www.tiktok.com/@usuario/video/...',
    x: 'https://x.com/usuario/status/...',
    mp4: 'https://exemplo.com/video.mp4',
  };

  const urlInp = document.getElementById('short-url');
  const hint = document.getElementById('short-src-hint');
  if (urlInp) urlInp.placeholder = placeholders[src] || 'Cole o link...';
  if (hint) hint.textContent = hints[src] || '';
  urlInp?.dispatchEvent(new Event('input')); // atualiza preview
}

window.previewShort = function () {
  const url = document.getElementById('short-url').value.trim();
  const preview = document.getElementById('short-preview');
  if (!preview) return;

  const ytId = extractYouTubeId(url);
  if (ytId) {
    preview.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}" allowfullscreen allow="autoplay; encrypted-media" style="position:absolute;inset:0;width:100%;height:100%;border:none"></iframe>`;
    preview.style.position = 'relative';
    return;
  }

  if (url.includes('facebook.com')) {
    const fbEmbed = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&width=320&autoplay=false`;
    preview.innerHTML = `<iframe src="${fbEmbed}" allowfullscreen scrolling="no" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" style="position:absolute;inset:0;width:100%;height:100%;border:none"></iframe>`;
    preview.style.position = 'relative';
    return;
  }

  if (url.includes('tiktok.com')) {
    // TikTok não permite embed direto; mostra mensagem
    preview.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--muted2);font-size:13px"><div style="font-size:36px">🎵</div><div>TikTok &mdash; salvo e exibido como link</div></div>`;
    preview.style.position = 'relative';
    return;
  }

  if (url.includes('x.com') || url.includes('twitter.com')) {
    preview.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--muted2);font-size:13px"><div style="font-size:36px">🔘</div><div>X (Twitter) &mdash; salvo e exibido como link</div></div>`;
    preview.style.position = 'relative';
    return;
  }

  if (url.match(/\.(mp4|webm|ogg)$/i)) {
    preview.innerHTML = `<video src="${escAttr(url)}" controls style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></video>`;
    preview.style.position = 'relative';
    return;
  }

  preview.innerHTML = `<div style="color:var(--muted2);font-size:13px;text-align:center"><div style="font-size:32px;margin-bottom:8px">📱</div><div>Prévia do short</div></div>`;
}

window.saveShort = function () {
  const title = document.getElementById('short-title').value.trim();
  const url = document.getElementById('short-url').value.trim();
  const desc = document.getElementById('short-desc').value.trim();
  const cat = document.getElementById('short-category').value;

  if (!title) { toast('⚠️ Informe o título'); return; }
  if (!url) { toast('⚠️ Informe a URL do vídeo'); return; }

  const ytId = extractYouTubeId(url);

  let type;
  if (ytId) type = 'youtube';
  else if (url.includes('facebook.com')) type = 'facebook';
  else if (url.includes('tiktok.com')) type = 'tiktok';
  else if (url.includes('x.com') || url.includes('twitter.com')) type = 'x';
  else if (url.match(/\.(mp4|webm|ogg)$/i)) type = 'direct';
  else type = currentShortSrc || 'iframe';

  const short = {
    id: uid(), title, url, desc, category: cat,
    ytId: ytId || null, type,
    views: 0, likes: 0,
    created_at: Date.now(),
  };

  const saved = JSON.parse(localStorage.getItem('va_shorts') || '[]');
  saved.unshift(short);
  localStorage.setItem('va_shorts', JSON.stringify(saved));

  toast('🎬 Short publicado!');
  hideShortForm();
  renderShorts();
}

window.renderShorts = function () {
  const feed = document.getElementById('shorts-feed');
  if (!feed) return;

  let shorts = JSON.parse(localStorage.getItem('va_shorts') || '[]');
  if (shortsFilter !== 'todos') shorts = shorts.filter(s => s.category === shortsFilter);

  if (!shorts.length) {
    feed.innerHTML = `
        <div class="empty-state" style="max-width:400px;margin:0 auto">
          <div class="empty-icon">🎬</div>
          <div class="empty-title">Nenhum short ainda</div>
          <div class="empty-desc">Adicione o primeiro short BBB!</div>
          <button class="btn-primary" onclick="showShortForm()">＋ Publicar Short</button>
        </div>`;
    return;
  }

  const catIcon = { bbb: '🏠 BBB', esporte: '⚽ Esporte', politica: '🏛️ Política', entretenimento: '🎬' };
  const likedShorts = JSON.parse(localStorage.getItem('va_liked_shorts') || '[]');

  let html = '';
  shorts.forEach((s, i) => {
    const isLiked = likedShorts.includes(s.id);

    // Ad a cada 3 shorts
    if (i > 0 && i % 3 === 0) {
      html += `<a class="ad-slot shorts-ad" href="mailto:votaai.anuncie@gmail.com" style="display:flex;text-decoration:none">
          <div class="ad-slot-icon">📣</div>
          <div class="ad-slot-title">Anuncie Aqui</div>
          <div class="ad-slot-sub">Clique e fale conosco</div>
        </a>`;
    }

    let videoHtml = '';
    if (s.ytId) {
      videoHtml = `<iframe src="https://www.youtube.com/embed/${s.ytId}?autoplay=0&mute=1&loop=1&playlist=${s.ytId}" allowfullscreen allow="autoplay; encrypted-media" style="width:100%;height:100%;border:none"></iframe>`;
    } else if (s.type === 'facebook') {
      const fbEmbed = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(s.url)}&width=320&autoplay=false`;
      videoHtml = `<iframe src="${fbEmbed}" allowfullscreen scrolling="no" allow="autoplay; clipboard-write; encrypted-media" style="width:100%;height:100%;border:none"></iframe>`;
    } else if (s.type === 'tiktok') {
      videoHtml = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px;background:var(--bg3);color:var(--muted2);font-size:13px"><div style="font-size:40px">🎵</div><a href="${escAttr(s.url)}" target="_blank" rel="noopener" style="color:var(--accent3);font-size:12px">Abrir no TikTok</a></div>`;
    } else if (s.type === 'x') {
      videoHtml = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px;background:var(--bg3);color:var(--muted2);font-size:13px"><div style="font-size:40px">🔘</div><a href="${escAttr(s.url)}" target="_blank" rel="noopener" style="color:var(--accent3);font-size:12px">Abrir no X</a></div>`;
    } else if (s.type === 'direct') {
      videoHtml = `<video src="${escAttr(s.url)}" loop muted playsinline style="width:100%;height:100%;object-fit:cover"></video>`;
    } else {
      videoHtml = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted2);font-size:13px;background:var(--bg3)">🎬 Vídeo</div>`;
    }

    html += `
        <div class="short-item" id="short-${s.id}" data-id="${s.id}" data-type="${s.type || 'youtube'}">
          <div class="short-video-wrap">${videoHtml}</div>
          <div class="short-overlay"></div>

          <!-- Play overlay (para vídeos diretos) -->
          <div class="short-play-overlay" onclick="toggleShortPlay('${s.id}')">
            <div class="short-play-icon">▶</div>
          </div>

          <!-- Info inferior -->
          <div class="short-info">
            <div class="short-category">${catIcon[s.category] || s.category}</div>
            <div class="short-title">${escHtml(s.title)}</div>
            ${s.desc ? `<div class="short-desc">${escHtml(s.desc)}</div>` : ''}
          </div>

          <!-- Botões lado direito -->
          <div class="short-actions">
            <!-- Like -->
            <button class="short-action-btn ${isLiked ? 'liked' : ''}"
                    onclick="likeShort('${s.id}',this)">
              <div class="short-action-icon">♥</div>
              <div class="short-action-count" id="sl-${s.id}">${fmtNum(s.likes || 0)}</div>
            </button>

            <!-- Comentar -->
            <button class="short-action-btn" onclick="alert('Comentários em breve!')">
              <div class="short-action-icon">💬</div>
              <div class="short-action-count">0</div>
            </button>

            <!-- Compartilhar -->
            <button class="short-action-btn" onclick="openShareModal('${escAttr(s.title)}','Veja este short no VotaAí!')">
              <div class="short-action-icon">↗</div>
              <div class="short-action-count">Share</div>
            </button>

            <!-- Excluir (admin) -->
            <button class="short-action-btn" onclick="deleteShort('${s.id}')">
              <div class="short-action-icon" style="font-size:14px">🗑</div>
              <div class="short-action-count"></div>
            </button>
          </div>
        </div>
      `;
  });

  feed.innerHTML = html;

  // IntersectionObserver para autoplay
  setupShortsObserver();
}

function setupShortsObserver() {
  if (shortsObserver) shortsObserver.disconnect();

  shortsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const item = entry.target;
      const video = item.querySelector('video');
      if (!video) return;

      if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
        video.play().catch(() => { });
        item.classList.remove('paused');
      } else {
        video.pause();
        item.classList.add('paused');
      }
    });
  }, { threshold: 0.7 });

  document.querySelectorAll('.short-item').forEach(el => shortsObserver.observe(el));
}

function toggleShortPlay(id) {
  const item = document.getElementById('short-' + id);
  if (!item) return;
  const video = item.querySelector('video');
  if (!video) return;
  if (video.paused) {
    video.play(); item.classList.remove('paused');
  } else {
    video.pause(); item.classList.add('paused');
  }
}

function likeShort(id, btn) {
  const likedKey = 'va_liked_shorts';
  const liked = JSON.parse(localStorage.getItem(likedKey) || '[]');
  if (liked.includes(id)) { toast('Você já curtiu este short!'); return; }

  liked.push(id);
  localStorage.setItem(likedKey, JSON.stringify(liked));

  const shorts = JSON.parse(localStorage.getItem('va_shorts') || '[]');
  const s = shorts.find(x => x.id === id);
  if (s) { s.likes = (s.likes || 0) + 1; localStorage.setItem('va_shorts', JSON.stringify(shorts)); }

  const countEl = document.getElementById('sl-' + id);
  if (countEl && s) countEl.textContent = fmtNum(s.likes);
  if (btn) btn.classList.add('liked');
}

function deleteShort(id) {
  if (!confirm('Excluir este short?')) return;
  const shorts = JSON.parse(localStorage.getItem('va_shorts') || '[]').filter(s => s.id !== id);
  localStorage.setItem('va_shorts', JSON.stringify(shorts));
  toast('Short excluído');
  renderShorts();
}

/* ═══════════════════════════════════════════════
   VÍDEOS
═══════════════════════════════════════════════ */
let vsrcCurrent = 'youtube';

window.showVideoForm = function () {
  document.getElementById('video-form').style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function hideVideoForm() {
  document.getElementById('video-form').style.display = 'none';
  clearVideoPreview();
}

function switchVsrc(name, btn) {
  vsrcCurrent = name;
  ['youtube', 'vimeo', 'url', 'embed'].forEach(s => {
    const el = document.getElementById('vsrc-' + s);
    if (el) el.style.display = s === name ? '' : 'none';
  });
  document.querySelectorAll('#vsrc-tabs .sub-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  clearVideoPreview();
}

function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractVimeoId(url) {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return m[1];
  if (/^\d+$/.test(url)) return url;
  return null;
}

function previewVideo() {
  const preview = document.getElementById('vid-preview');
  if (!preview) return;

  let html = '';

  if (vsrcCurrent === 'youtube') {
    const id = extractYouTubeId(document.getElementById('vid-yt-url').value);
    if (id) html = `<iframe src="https://www.youtube.com/embed/${id}" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:none"></iframe>`;
  } else if (vsrcCurrent === 'vimeo') {
    const id = extractVimeoId(document.getElementById('vid-vimeo-url').value);
    if (id) html = `<iframe src="https://player.vimeo.com/video/${id}" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:none"></iframe>`;
  } else if (vsrcCurrent === 'url') {
    const url = document.getElementById('vid-direct-url').value.trim();
    if (url) html = `<video src="${escAttr(url)}" controls style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></video>`;
  } else if (vsrcCurrent === 'embed') {
    const code = document.getElementById('vid-embed-code').value.trim();
    const m = code.match(/src=["']([^"']+)["']/);
    if (m) html = `<iframe src="${escAttr(m[1])}" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:none"></iframe>`;
  }

  if (html) {
    preview.innerHTML = html;
  } else {
    clearVideoPreview();
  }
}

function clearVideoPreview() {
  const preview = document.getElementById('vid-preview');
  if (preview) preview.innerHTML = `
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--muted2);font-size:13px">
        <div style="font-size:32px">🎬</div><div>A prévia aparecerá aqui</div>
      </div>`;
}

function getVideoEmbedData() {
  if (vsrcCurrent === 'youtube') {
    const id = extractYouTubeId(document.getElementById('vid-yt-url').value);
    if (!id) return null;
    return { type: 'youtube', id, embedUrl: `https://www.youtube.com/embed/${id}`, thumb: `https://img.youtube.com/vi/${id}/hqdefault.jpg` };
  }
  if (vsrcCurrent === 'vimeo') {
    const id = extractVimeoId(document.getElementById('vid-vimeo-url').value);
    if (!id) return null;
    return { type: 'vimeo', id, embedUrl: `https://player.vimeo.com/video/${id}`, thumb: null };
  }
  if (vsrcCurrent === 'url') {
    const url = document.getElementById('vid-direct-url').value.trim();
    if (!url) return null;
    return { type: 'direct', url, embedUrl: url, thumb: null };
  }
  if (vsrcCurrent === 'embed') {
    const code = document.getElementById('vid-embed-code').value.trim();
    if (!code) return null;
    const m = code.match(/src=["']([^"']+)["']/);
    return { type: 'embed', code, embedUrl: m ? m[1] : null, thumb: null };
  }
  return null;
}

function saveVideo() {
  const title = document.getElementById('vid-title').value.trim();
  const desc = document.getElementById('vid-desc').value.trim();
  const cat = document.getElementById('vid-category').value;
  const vis = document.getElementById('vid-visibility').value;

  if (!title) { toast('⚠️ Informe o título'); return; }
  const embed = getVideoEmbedData();
  if (!embed) { toast('⚠️ Informe uma URL ou código válido'); return; }

  const vid = { id: uid(), title, desc, category: cat, visibility: vis, embed, views: 0, created_at: Date.now() };
  const saved = JSON.parse(localStorage.getItem('va_videos') || '[]');
  saved.unshift(vid);
  localStorage.setItem('va_videos', JSON.stringify(saved));

  toast('📹 Vídeo publicado!');
  hideVideoForm();
  renderVideos();
}

window.renderVideos = function () {
  const grid = document.getElementById('videos-list');
  const cnt = document.getElementById('videos-count');
  if (!grid) return;

  const saved = JSON.parse(localStorage.getItem('va_videos') || '[]');
  if (cnt) cnt.textContent = `${saved.length} vídeo${saved.length !== 1 ? 's' : ''} hospedado${saved.length !== 1 ? 's' : ''}`;

  if (!saved.length) {
    grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">📹</div>
          <div class="empty-title">Nenhum vídeo ainda</div>
          <div class="empty-desc">Adicione vídeos do YouTube, Vimeo ou qualquer URL!</div>
          <button class="btn-primary" onclick="showVideoForm()">📹 Adicionar primeiro vídeo</button>
        </div>`;
    return;
  }

  const catLabel = { bbb: '🏠 BBB', esporte: '⚽ Esporte', politica: '🏛️ Política', entretenimento: '🎬', news: '📰', outro: '📦' };

  grid.innerHTML = saved.map(vid => {
    const typeIcon = vid.embed?.type === 'youtube' ? 'YT' : vid.embed?.type === 'vimeo' ? 'Vimeo' : vid.embed?.type === 'direct' ? 'MP4' : 'Embed';
    const thumbHtml = vid.embed?.thumb
      ? `<img src="${escAttr(vid.embed.thumb)}" alt="${escAttr(vid.title)}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`
      : `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--muted2);font-size:13px"><div style="font-size:36px">🎬</div><div>Clique para reproduzir</div></div>`;
    return `
        <div class="video-card" id="vc-${vid.id}">
          <div class="video-thumb" id="vt-${vid.id}">
            ${thumbHtml}
            <div class="video-cat-badge">${typeIcon}</div>
            <div class="video-play-btn" onclick="playVideo('${vid.id}')">
              <div class="play-circle">▶</div>
            </div>
          </div>
          <div class="video-info">
            <div class="video-title">${escHtml(vid.title)}</div>
            <div class="video-meta">
              <span>${catLabel[vid.category] || vid.category}</span>
              <span>${timeAgo(vid.created_at)}</span>
            </div>
            ${vid.desc ? `<div style="font-size:11px;color:var(--muted2);line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;margin-bottom:8px">${escHtml(vid.desc)}</div>` : ''}
            <div class="video-btns">
              <button class="btn-ghost" style="font-size:11px;flex:1" onclick="openShareModal('${escAttr(vid.title)}','Assista no VotaAí!')">🔗 Compartilhar</button>
              <button class="btn-icon danger" onclick="deleteVideo('${vid.id}')" title="Excluir">🗑</button>
            </div>
          </div>
        </div>`;
  }).join('');
}

function playVideo(id) {
  const saved = JSON.parse(localStorage.getItem('va_videos') || '[]');
  const vid = saved.find(v => v.id === id);
  if (!vid) return;

  const wrap = document.getElementById('vt-' + id);
  if (!wrap) return;

  if (vid.embed.type === 'youtube') {
    wrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${vid.embed.id}?autoplay=1" allowfullscreen allow="autoplay" style="position:absolute;inset:0;width:100%;height:100%;border:none"></iframe>`;
  } else if (vid.embed.type === 'vimeo') {
    wrap.innerHTML = `<iframe src="https://player.vimeo.com/video/${vid.embed.id}?autoplay=1" allowfullscreen allow="autoplay" style="position:absolute;inset:0;width:100%;height:100%;border:none"></iframe>`;
  } else if (vid.embed.type === 'direct') {
    wrap.innerHTML = `<video src="${escAttr(vid.embed.url)}" controls autoplay style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></video>`;
  } else if (vid.embed.embedUrl) {
    wrap.innerHTML = `<iframe src="${escAttr(vid.embed.embedUrl)}" allowfullscreen allow="autoplay" style="position:absolute;inset:0;width:100%;height:100%;border:none"></iframe>`;
  }
}

function deleteVideo(id) {
  if (!confirm('Excluir este vídeo?')) return;
  const saved = JSON.parse(localStorage.getItem('va_videos') || '[]').filter(v => v.id !== id);
  localStorage.setItem('va_videos', JSON.stringify(saved));
  toast('Vídeo excluído');
  renderVideos();
}

/* ═══════════════════════════════════════════════
   COMPARTILHAR
═══════════════════════════════════════════════ */
let shareUrl = '';

function openShareModal(title, sub) {
  const url = window.location.href;
  shareUrl = url;
  document.getElementById('share-modal-sub').textContent = sub || 'Compartilhe!';
  document.getElementById('share-link-text').textContent = url;
  document.getElementById('share-modal').classList.add('show');
}

function closeShareModal() {
  document.getElementById('share-modal').classList.remove('show');
}

function copyShareLink() {
  navigator.clipboard.writeText(shareUrl).then(() => toast('🔗 Link copiado!'));
  closeShareModal();
}

function shareWhatsApp() {
  window.open(`https://wa.me/?text=${encodeURIComponent('🗳 Vote agora no VotaAí! ' + shareUrl)}`, '_blank');
  closeShareModal();
}

function shareTelegram() {
  window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('🗳 Vote agora no VotaAí!')}`, '_blank');
  closeShareModal();
}

function shareTwitter() {
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('🗳 Vote no VotaAí! ' + shareUrl + ' #BBB26 #VotaAí')}`, '_blank');
  closeShareModal();
}

/* ═══════════════════════════════════════════════
   CONFETE
═══════════════════════════════════════════════ */
function launchConfete() {
  const canvas = document.getElementById('confete-canvas');
  if (!canvas) return;
  canvas.style.display = 'block';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const COLORS = ['#7C3AED', '#A78BFA', '#EF4444', '#F59E0B', '#10B981', '#06B6D4', '#EC4899', '#F97316', '#ffffff'];
  const pieces = Array.from({ length: 160 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    r: Math.random() * 7 + 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    tiltAngle: 0,
    tiltSpeed: Math.random() * 0.07 + 0.05,
    speed: Math.random() * 4 + 2,
    shape: Math.random() > 0.5 ? 'circle' : 'rect',
  }));
  let frame = 0;
  const maxFrames = 220;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.tiltAngle += p.tiltSpeed;
      p.y += p.speed;
      const tilt = Math.sin(p.tiltAngle) * 12;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = frame < maxFrames - 40 ? 1 : 1 - (frame - (maxFrames - 40)) / 40;
      ctx.beginPath();
      if (p.shape === 'circle') ctx.arc(p.x + tilt, p.y, p.r, 0, Math.PI * 2);
      else ctx.rect(p.x + tilt, p.y, p.r * 1.5, p.r * 0.8);
      ctx.fill();
      if (p.y > canvas.height + 10) { p.y = -10; p.x = Math.random() * canvas.width; }
    });
    ctx.globalAlpha = 1;
    frame++;
    if (frame < maxFrames) requestAnimationFrame(draw);
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.style.display = 'none'; }
  }
  draw();
}



/* ═══════════════════════════════════════════════
   PRESENCE (USUÁRIOS ONLINE)
═══════════════════════════════════════════════ */
function initPresence() {
  try {
    const channel = sb().channel('online-users', { config: { presence: { key: SESSION } } });
    channel
      .on('presence', { event: 'sync' }, () => {
        const count = Object.keys(channel.presenceState()).length;
        const el = document.getElementById('online-count');
        if (el) el.textContent = fmtNum(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });
  } catch (e) {
    console.warn('Presence unavailable:', e.message);
    const el = document.getElementById('online-count');
    if (el) el.textContent = Math.floor(Math.random() * 200 + 50);
  }
}

/* ═══════════════════════════════════════════════
   REALTIME BBB VOTES
═══════════════════════════════════════════════ */
function initRealtimeBBB() {
  try {
    console.log('⚡ Inicializando canal de Realtime para votos...');
    const channel = sb()
      .channel('public:votos_paredao')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'votos_paredao'
      }, (payload) => {
        console.log('🔥 Novo voto detectado em tempo real!', payload);
        loadBBBVotes();
      })
      .subscribe((status) => {
        console.log('📡 Status da subscrição Realtime:', status);
        if (status === 'SUBSCRIBED') {
          console.log('🚀 Conectado ao stream de dados em tempo real!');
        }
      });
  } catch (e) {
    console.warn('❌ Falha ao iniciar Realtime:', e.message);
  }
}

/* ═══════════════════════════════════════════════
   LIVE BAR — rotação de mensagens
═══════════════════════════════════════════════ */
const liveMsgs = [
  '🔴 BBB 26 • PAREDÃO AO VIVO — Parcial atualizada agora',
  '🗳 Mais de 2 MILHÕES de votos computados hoje',
  '📊 Paredão BBB 26 — Vote e acompanhe a parcial',
  '🔥 Quem sai hoje? Vote no VotaAí e descubra!',
];
let liveMsgIdx = 0;
setInterval(() => {
  liveMsgIdx = (liveMsgIdx + 1) % liveMsgs.length;
  const el = document.getElementById('live-bar-text');
  if (el) { el.style.opacity = '0'; setTimeout(() => { el.textContent = liveMsgs[liveMsgIdx]; el.style.opacity = '1'; }, 300); }
}, 5000);

/* ═══════════════════════════════════════════════
   INICIALIZAÇÃO
═══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Iniciando VotaAí...');
  try {
    // Inicializa fontes
    if (typeof updateFontesNomes === 'function') updateFontesNomes();
    if (typeof updateFontesData === 'function') updateFontesData();

    // Carrega votos BBB
    await loadBBBVotes();

    // Inicializa presence
    initPresence();
    initRealtimeBBB();

    // Atualização automática a cada 30s
    setInterval(() => {
      if (currentTab === 'bbb') loadBBBVotes();
    }, 30000);

    // Carrega enquetes e ranking ao iniciar
    renderPolls();
    renderRanking();

    // Gamificação
    initGamification();

    // Event listeners para navegação secundária (CSP Compliance)
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-sub-tab]');
      if (target) {
        const subTabName = target.getAttribute('data-sub-tab');
        if (typeof switchSub === 'function') {
          switchSub(subTabName, target.classList.contains('sub-tab') ? target : null);
        }
      }
    });
  } catch (err) {
    console.error('❌ Erro fatal na inicialização:', err);
  }
});

/* ═══════════════════════════════════════════════
   GAMIFICAÇÃO — contadores animados, tendência, indicadores
═══════════════════════════════════════════════ */

// Contador suave de números
function animateCounter(el, from, to, duration = 800) {
  if (!el || isNaN(to)) return;
  const start = performance.now();
  const range = to - from;
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(from + range * eased);
    el.textContent = current.toLocaleString('pt-BR');
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// Formata número com K/M
function fmtNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return n.toString();
}

// Estado anterior para animação
let _lastTotalVotes = 0;

// Atualiza o hero-total-votes com animação
function updateHeroVoteCounter(newTotal) {
  const el = document.getElementById('hero-total-votes');
  if (!el) return;
  animateCounter(el, _lastTotalVotes, newTotal, 900);
  _lastTotalVotes = newTotal;
}

// Atualiza indicadores do hero
function updateHeroIndicators(totalVotes, onlineCount) {
  // Votos hoje
  const indVotos = document.getElementById('ind-votos-hoje');
  if (indVotos) indVotos.textContent = fmtNumber(totalVotes || 0);

  // Online agora (propaga do online-count do header)
  const indOnline = document.getElementById('online-count-hero');
  const onlineHeader = document.getElementById('online-count');
  if (indOnline && onlineHeader) indOnline.textContent = onlineHeader.textContent;
}

// Atualiza card de tendência com candidato líder
function updateTrendingCard(candidates) {
  if (!candidates || !candidates.length) return;

  // Pega o candidato com maior % de votos
  const leader = candidates.reduce((a, b) => (a.pct || 0) > (b.pct || 0) ? a : b);
  if (!leader) return;

  const nameEl = document.getElementById('trending-name');
  const barEl = document.getElementById('trending-bar');
  const pctEl = document.getElementById('trending-pct');

  if (nameEl) nameEl.textContent = leader.name || '—';
  if (barEl) barEl.style.width = `${Math.min(leader.pct || 0, 100)}%`;
  if (pctEl) pctEl.textContent = `${(leader.pct || 0).toFixed(1)}% dos votos`;
}

// Inicializa observador de mudanças no hero-total-votes para animar
function initGamification() {
  // Observer no contador de votos
  const heroVotes = document.getElementById('hero-total-votes');
  if (heroVotes) {
    const obs = new MutationObserver(() => {
      heroVotes.classList.add('counting');
      setTimeout(() => heroVotes.classList.remove('counting'), 300);
    });
    obs.observe(heroVotes, { childList: true, characterData: true, subtree: true });
  }

  // Sincroniza indicador de online com o pill do header
  const syncOnline = () => {
    const hdr = document.getElementById('online-count');
    const hero = document.getElementById('online-count-hero');
    if (hdr && hero && hero.textContent !== hdr.textContent) {
      hero.textContent = hdr.textContent;
    }
  };
  setInterval(syncOnline, 5000);
  syncOnline();

  // Simula incremento suave de votos hoje (fallback visual)
  const indVotos = document.getElementById('ind-votos-hoje');
  if (indVotos && indVotos.textContent === '—') {
    let base = Math.floor(Math.random() * 50000) + 800000;
    indVotos.textContent = fmtNum(base);
    setInterval(() => {
      base += Math.floor(Math.random() * 12) + 1;
      indVotos.textContent = fmtNum(base);
    }, 8000);
  }
}

