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
   FUNÇÕES DE FOTO DOS CANDIDATOS
═══════════════════════════════════════════════ */

// Mapeamento de chaves de candidato para URLs de fotos
// Adapte esta lógica para o seu método de armazenamento de fotos (ex: Supabase Storage)
const CANDIDATE_PHOTOS = {
  'milena': 'https://via.placeholder.com/64x64/FF0000/FFFFFF?text=M',
  'maxiane': 'https://via.placeholder.com/64x64/0000FF/FFFFFF?text=Ma',
  'chaiany': 'https://via.placeholder.com/64x64/FFFF00/000000?text=Ch',
  // Adicione mais candidatos conforme necessário
};

function getCandPhoto(chave) {
  return CANDIDATE_PHOTOS[chave.toLowerCase()] || null;
}

async function promptCandPhoto(chave) {
  const currentPhoto = getCandPhoto(chave);
  const newPhotoUrl = prompt(`Insira a URL da nova foto para ${chave}:`, currentPhoto || '');
  if (newPhotoUrl && newPhotoUrl !== currentPhoto) {
    // Aqui você implementaria a lógica para salvar a nova URL da foto.
    // Por exemplo, se estiver usando Supabase, você faria um update na tabela de candidatos.
    // Por enquanto, vamos apenas atualizar o mapa local e recarregar os cards.
    CANDIDATE_PHOTOS[chave.toLowerCase()] = newPhotoUrl;
    console.log(`Nova URL para ${chave}: ${newPhotoUrl}`);
    // Recarrega os cards para exibir a nova foto
    await loadBBBVotes(); // Força a atualização dos votos e cards
    toast(`Foto de ${chave} atualizada!`);
  } else if (newPhotoUrl === currentPhoto) {
    toast('Nenhuma mudança na URL da foto.');
  } else {
    toast('Operação de troca de foto cancelada.');
  }
}


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
  // Data/hora do encerramento da votação (Ex: '2026-03-01T22:30:00')
  // Se a data atual for maior que esta, a votação aparecerá como ENCERRADA.
  proximoParedao: (() => {
    const now = new Date();
    const next = new Date(now);
    const dom = (7 - now.getDay()) % 7 || 7;
    next.setDate(now.getDate() + dom);
    next.setHours(22, 30, 0, 0);
    return next;
  })(),
  votosAbertos: true,
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
  const countdownGrid = document.getElementById('countdown-grid');

  if (diff <= 0) {
    document.getElementById('cd-horas').textContent = '00';
    document.getElementById('cd-min').textContent = '00';
    document.getElementById('cd-seg').textContent = '00';
    if (countdownGrid) countdownGrid.innerHTML = '<div style="font-size:18px;font-weight:bold;color:var(--red2);">ENCERRADO</div>';
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
  const btn = document.getElementById("btn-reload");
  if (btn) btn.textContent = "⏳ Carregando...";

  const now = new Date();
  const votingEndTime = BBB_CONFIG.proximoParedao;
  const isVotingClosed = now > votingEndTime || BBB_CONFIG.votosAbertos === false;

  // Handle display if voting is closed
  const bbbVoteArea = document.getElementById("bbb-vote-area");
  const candidatesGrid = document.getElementById("candidates-grid");
  const heroSection = document.querySelector(".hero-bbb");

  if (isVotingClosed) {
    if (bbbVoteArea) bbbVoteArea.innerHTML = '<div class="card" style="text-align:center;padding:30px;color:var(--muted2);">A votação para este paredão foi encerrada.</div>';
    if (candidatesGrid) candidatesGrid.innerHTML = '<div class="card" style="text-align:center;padding:30px;color:var(--muted2);">Resultados finais em breve!</div>';
    if (heroSection) {
        const voteCta = heroSection.querySelector(".vote-cta");
        if (voteCta) voteCta.style.display = "none";
        const countdownGrid = document.getElementById("countdown-grid");
        if (countdownGrid) countdownGrid.innerHTML = '<div style="font-size:18px;font-weight:bold;color:var(--red2);">ENCERRADO</div>';
        const heroTitle = heroSection.querySelector(".hero-title");
        if (heroTitle) heroTitle.textContent = "🔴 PAREDÃO ENCERRADO";
        const heroSubtitle = heroSection.querySelector(".hero-subtitle");
        if (heroSubtitle) heroSubtitle.textContent = "Acompanhe os resultados finais.";
    }
    if (btn) btn.style.display = "none";
    return;
  }
  
  try {
    console.log("📡 Buscando votos do Supabase...");
    const { data, error } = await sb().from("votos_paredao").select("participante");

    if (error) {
      console.error("❌ Erro na consulta Supabase:", error);
      throw error;
    }

    console.log(`✅ ${data?.length || 0} votos recebidos.`);

    const counts = {};
    BBB_CONFIG.candidatos.forEach(c => counts[c.chave] = 0);

    (data || []).forEach(row => {
      const p = (row.participante || "").toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      BBB_CONFIG.candidatos.forEach(c => {
        if (p.includes(c.chave.toLowerCase())) counts[c.chave]++;
      });
    });

    bbbCounts = counts;
    bbbTotal = Object.values(counts).reduce((a, b) => a + b, 0);

    renderBBBCards();
    renderVerdict();

    const heroVotesEl = document.getElementById("hero-total-votes");
    if (heroVotesEl) {
      // Usa a função de animação se existir no votes.js (v4 layout)
      if (typeof updateHeroVoteCounter === 'function') {
        updateHeroVoteCounter(bbbTotal);
      } else {
        heroVotesEl.textContent = fmtNum(bbbTotal);
      }
    }

    const lastUpdateEl = document.getElementById("last-update");
    if (lastUpdateEl) lastUpdateEl.textContent = new Date().toLocaleTimeString("pt-BR");

    // Atualiza indicadores e tendência se as funções existirem (v4 layout)
    if (typeof updateHeroIndicators === 'function') updateHeroIndicators(bbbTotal);
    if (typeof updateTrendingCard === 'function') updateTrendingCard(BBB_CONFIG.candidatos.map(c => ({ name: c.nome, pct: bbbTotal > 0 ? (counts[c.chave] / bbbTotal * 100) : 0 })));

  } catch (e) {
    console.error("❌ Erro crítico ao carregar votos:", e);
    toast("⚠️ Falha ao atualizar dados. Verifique sua conexão.");
  } finally {
    if (btn) btn.textContent = "🔄 Atualizar parcial";
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
        </div>
      </div>
    `).join('');
}


function renderBBBVote() {
  const form = document.getElementById('bbb-vote-form');
  if (!form) return;
  form.innerHTML = `
    <div style="font-size:16px;margin-bottom:15px;color:var(--muted2)">Quem você quer eliminar?</div>
    <div class="vote-options-grid">
      ${BBB_CONFIG.candidatos.map((c, i) => `
        <label class="vote-option" style="--cand-color:${PALETTE[i % PALETTE.length].main}">
          <input type="radio" name="candidato" value="${escAttr(c.chave)}">
          <div class="vote-option-ui">
            <div class="vote-option-avatar">${getCandPhoto(c.chave) ? `<img src="${getCandPhoto(c.chave)}" alt="${escAttr(c.nome)}">` : c.emoji}</div>
            <div class="vote-option-name">${escHtml(c.nome)}</div>
          </div>
        </label>
      `).join('')}
    </div>
    <button type="submit" class="btn-vote">Votar</button>
    <div id="vote-feedback" class="vote-feedback"></div>
  `;
  form.addEventListener('submit', handleBBBVoteSubmit);
}

async function handleBBBVoteSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-vote');
  const feedback = document.getElementById('vote-feedback');
  const choice = e.target.candidato.value;

  if (!choice) {
    toast('Selecione um participante para votar!');
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Votando...';
  feedback.textContent = '';

  try {
    console.log(`🗳️ Voto registrado para: ${choice}`);
    const { error } = await sb().from('votos_paredao').insert([
      { participante: choice, session_id: SESSION, user_agent: navigator.userAgent },
    ]);

    if (error) {
      console.error('❌ Erro ao salvar voto:', error);
      throw new Error('Falha ao registrar seu voto. Tente novamente.');
    }

    feedback.textContent = '✅ Voto computado com sucesso!';
    feedback.style.color = 'var(--green1)';
    setTimeout(() => { feedback.textContent = ''; }, 4000);

    // Atualiza a contagem localmente para feedback instantâneo
    bbbCounts[choice]++;
    bbbTotal++;
    renderBBBCards();
    renderVerdict();

  } catch (err) {
    feedback.textContent = `⚠️ ${err.message}`;
    feedback.style.color = 'var(--red1)';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Votar';
  }
}


function renderVerdict() {
  const el = document.getElementById('verdict-text');
  if (!el) return;

  if (bbbTotal < 10) {
    el.innerHTML = 'Aguardando mais votos para formar uma parcial...';
    return;
  }

  const sorted = Object.entries(bbbCounts).sort(([, a], [, b]) => b - a);
  const [leadKey, leadCount] = sorted[0];
  const [trailKey, trailCount] = sorted[1];
  const leadPct = (leadCount / bbbTotal * 100).toFixed(1);
  const trailPct = (trailCount / bbbTotal * 100).toFixed(1);
  const diff = leadPct - trailPct;

  const leadCand = BBB_CONFIG.candidatos.find(c => c.chave === leadKey);
  const trailCand = BBB_CONFIG.candidatos.find(c => c.chave === trailKey);

  if (!leadCand || !trailCand) return;

  let html = `Com <strong>${leadPct}%</strong> dos votos, <strong>${escHtml(leadCand.nome)}</strong> está na frente para ser eliminado. `;
  if (diff < 5) {
    html += `A disputa está acirrada com <strong>${escHtml(trailCand.nome)}</strong>, que tem <strong>${trailPct}%</strong>.`;
  } else {
    html += `<strong>${escHtml(trailCand.nome)}</strong> segue com <strong>${trailPct}%</strong> dos votos.`;
  }
  el.innerHTML = html;
}


/* ═══════════════════════════════════════════════
   FONTES EXTERNAS E GRÁFICOS
═══════════════════════════════════════════════ */

function renderSources() {
  const tbody = document.getElementById('sources-tbody');
  if (!tbody) return;

  const totals = FONTES_DATA.nomes.map((_, i) => {
    return FONTES_DATA.uol[i] + FONTES_DATA.nsc[i] + FONTES_DATA.ntv[i] + FONTES_DATA.vot[i];
  });
  const avg = totals.map(t => (t / 4).toFixed(2));

  tbody.innerHTML = FONTES_DATA.nomes.map((nome, i) => `
    <tr>
      <td><strong>${escHtml(nome)}</strong></td>
      <td>${FONTES_DATA.uol[i]}%</td>
      <td>${FONTES_DATA.nsc[i]}%</td>
      <td>${FONTES_DATA.ntv[i]}%</td>
      <td>${FONTES_DATA.vot[i]}%</td>
      <td><strong>${avg[i]}%</strong></td>
    </tr>
  `).join('');
}

function renderChart() {
  const ctx = document.getElementById('history-chart');
  if (!ctx || !window.Chart) return;

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: HISTORICO.map(h => h.hora),
      datasets: BBB_CONFIG.candidatos.map((c, i) => ({
        label: c.nome,
        data: HISTORICO.map(h => h.vals[i]),
        borderColor: PALETTE[i % PALETTE.length].main,
        backgroundColor: PALETTE[i % PALETTE.length].bg,
        fill: false,
        tension: 0.3,
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true, ticks: { callback: v => v + '%' } } }
    }
  });
}

/* ═══════════════════════════════════════════════
   ENQUETES, VÍDEOS E SHORTS (PLACEHOLDERS)
═══════════════════════════════════════════════ */

async function renderPolls() {
  const list = document.getElementById(\'polls-list\');
  const countEl = document.getElementById(\'polls-count\');
  if (!list) return;

  list.innerHTML = \`<div style="text-align:center;padding:40px;color:var(--muted2);">⏳ Carregando enquetes ativas...</div>\`;

  let polls = [];

  try {
    const { data: pollsData, error: pollsError } = await sb()
      .from(\'poll_votes\') // Corrigido para poll_votes
      .select(\'*\') // Seleciona todos os campos, pois poll_options não é uma tabela aninhada
      .order(\'created_at\', { ascending: false })
      .limit(50);

    if (pollsError) throw pollsError;
    if (pollsData) polls = pollsData;
  } catch (e) {
    console.warn("Erro ao carregar do Supabase:", e.message);
  }

  if (countEl) countEl.textContent = `${polls.length} enquete${polls.length !== 1 ? \'s\' : \'\'} ativa${polls.length !== 1 ? \'s\' : \'\'}`;

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
    // Assumindo que cada 'poll' de 'poll_votes' já contém os dados necessários
    // Se 'poll_votes' for apenas os votos, a lógica precisará ser mais complexa para agrupar por enquete
    // Por simplicidade, vamos assumir que 'poll_votes' tem a estrutura de 'polls' com um campo 'question' e 'options'
    const totalVotes = poll.vote_count || 0; // Ajuste conforme a estrutura real de poll_votes
    const votedKey = `va_voted_${poll.id}`;
    const voted = localStorage.getItem(votedKey);
    const ago = timeAgo(poll.created_at ? new Date(poll.created_at).getTime() : Date.now());
    const cat = poll.category || \'geral\'; // Categoria da enquete
    const commentsKey = `va_comments_${poll.id}`;
    const comments = JSON.parse(localStorage.getItem(commentsKey) || \'[]\');

    return `
        <div class="card fade-up" id="poll-${poll.id}">
          <!-- Header da enquete -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;gap:8px">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
                <span style="font-size:11px">📊 <span style="color:var(--muted2);">${cat.toUpperCase()}</span></span>
                ${pi === 0 ? \'<span class="badge badge-hot">🔥 Novo</span>\' : \'\'}
                ${totalVotes > 100 ? \'<span class="badge badge-live">⚡ Popular</span>\' : \'\'}
              </div>
              <h3 style="font-family:var(--font-head);font-size:16px;font-weight:800;line-height:1.3;margin-bottom:0">${escHtml(poll.question)}</h3>
            </div>
            <button class="btn-icon" onclick="openShareModal(\'${escAttr(poll.question)}\',\'Vote nesta enquete no VotaAí!\')" title="Compartilhar">🔗</button>
          </div>

          <!-- Opções -->
          <div id="poll-opts-${poll.id}">
            ${renderPollOptions(poll, voted)}
          </div>

          <!-- Footer da enquete -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;font-size:11px;color:var(--muted2)">
            <span>${fmtNum(totalVotes)} votos • ${ago}</span>
            <button class="btn-subtle" onclick="toggleComments(\'${poll.id}\')">💬 ${comments.length} comentários</button>
          </div>

          <!-- Área de comentários -->
          <div id="comments-${poll.id}" style="display:none;margin-top:16px">
            <!-- Comentários serão carregados aqui -->
            <div style="margin-bottom:12px;font-weight:bold">Comentários:</div>
            <div id="comments-list-${poll.id}">
              ${comments.length ? comments.map(c => `<div style="padding:8px 0;border-bottom:1px solid var(--border);">${escHtml(c.text)}</div>`).join(\'\') : \'Nenhum comentário ainda.\'}
            </div>
            <div style="margin-top:12px">
              <input type="text" id="comment-input-${poll.id}" placeholder="Adicionar comentário..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-dark);color:white;">
              <button class="btn-primary" style="margin-top:8px;" onclick="addComment(\'${poll.id}\')">Enviar</button>
            </div>
          </div>
        </div>
    `;
  }).join(\'\');

  // Funções auxiliares para renderPollOptions, toggleComments, addComment (precisam ser definidas)
  function renderPollOptions(poll, voted) {
    return poll.options.map((opt, i) => `
      <div class="opt-row ${voted ? \'voted\' : \'\'} ${voted && voted === opt.id ? \'selected\' : \'\'}"
           id="poll-opt-${poll.id}-${opt.id}"
           onclick="votePoll(\'${poll.id}\', \'${opt.id}\')"
           style="--opt-color:${PALETTE[i % PALETTE.length].main};--opt-grad:${PALETTE[i % PALETTE.length].grad};margin-bottom:8px">
        <div class="opt-fill" style="width:${voted ? (opt.vote_count / poll.total_votes * 100) : 0}%"></div>
        <div class="opt-inner">
          <div class="opt-left">
            <div class="opt-check ${voted && voted === opt.id ? \'checked\' : \'\'}"></div>
            <span class="opt-label">${escHtml(opt.text)}</span>
          </div>
          <span class="opt-pct">${voted ? (opt.vote_count / poll.total_votes * 100).toFixed(1) + \'%\' : \'\'}</span>
        </div>
      </div>
    `).join(\'\');
  }

  function toggleComments(pollId) {
    const commentsArea = document.getElementById(`comments-${pollId}`);
    if (commentsArea) {
      commentsArea.style.display = commentsArea.style.display === \'none\' ? \'block\' : \'none\';
    }
  }

  async function addComment(pollId) {
    const input = document.getElementById(`comment-input-${pollId}`);
    const text = input.value.trim();
    if (!text) return;

    const commentsKey = `va_comments_${pollId}`;
    const comments = JSON.parse(localStorage.getItem(commentsKey) || \'[]\');
    comments.push({ text: text, created_at: new Date().toISOString() });
    localStorage.setItem(commentsKey, JSON.stringify(comments));
    input.value = \'\';
    renderPolls(); // Recarrega as enquetes para mostrar o novo comentário
  }

  async function votePoll(pollId, optionId) {
    const votedKey = `va_voted_${pollId}`;
    if (localStorage.getItem(votedKey)) {
      toast(\'Você já votou nesta enquete!\');
      return;
    }

    try {
      // Aqui você faria a chamada ao Supabase para registrar o voto
      // Exemplo: await sb().from(\'poll_options\').update({ vote_count: \'increment\' }).eq(\'id\', optionId);
      // Por enquanto, vamos simular o voto e atualizar o localStorage
      localStorage.setItem(votedKey, optionId);
      toast(\'Voto computado!\');
      renderPolls(); // Recarrega as enquetes para mostrar o resultado
    } catch (e) {
      console.error(\'Erro ao votar na enquete:\', e);
      toast(\'❌ Erro ao registrar voto. Tente novamente.\');
    }
  }
}

function renderRanking() {
  const container = document.getElementById(\'ranking-list\');
  if (!container) return;
  container.innerHTML = \'<div class="card" style="text-align:center;padding:30px;color:var(--muted2);">Em breve: ranking de popularidade!</div>\';
}

function renderVideos() {
  const container = document.getElementById(\'videos-list\');
  if (!container) return;
  container.innerHTML = \'<div class="card" style="text-align:center;padding:30px;color:var(--muted2);">Em breve: vídeos e resumos do programa!</div>\';
}

async function renderPolls() {
  const list = document.getElementById(\'polls-list\');
  const countEl = document.getElementById(\'polls-count\');
  if (!list) return;

  list.innerHTML = \`<div style="text-align:center;padding:40px;color:var(--muted2);">⏳ Carregando enquetes ativas...</div>\`;

  let polls = [];

  try {
    const { data: pollsData, error: pollsError } = await sb()
      .from(\'poll_votes\') // Corrigido para poll_votes
      .select(\'*\') // Seleciona todos os campos, pois poll_options não é uma tabela aninhada
      .order(\'created_at\', { ascending: false })
      .limit(50);

    if (pollsError) throw pollsError;
    if (pollsData) polls = pollsData;
  } catch (e) {
    console.warn("Erro ao carregar do Supabase:", e.message);
  }

  if (countEl) countEl.textContent = `${polls.length} enquete${polls.length !== 1 ? \'s\' : \'\'} ativa${polls.length !== 1 ? \'s\' : \'\'}`;

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
    // Assumindo que cada \'poll\' de \'poll_votes\' já contém os dados necessários
    // Se \'poll_votes\' for apenas os votos, a lógica precisará ser mais complexa para agrupar por enquete
    // Por simplicidade, vamos assumir que \'poll_votes\' tem a estrutura de \'polls\' com um campo \'question\' e \'options\'
    const totalVotes = poll.vote_count || 0; // Ajuste conforme a estrutura real de poll_votes
    const votedKey = `va_voted_${poll.id}`;
    const voted = localStorage.getItem(votedKey);
    const ago = timeAgo(poll.created_at ? new Date(poll.created_at).getTime() : Date.now());
    const cat = poll.category || \'geral\'; // Categoria da enquete
    const commentsKey = `va_comments_${poll.id}`;
    const comments = JSON.parse(localStorage.getItem(commentsKey) || \'[]\');

    return `
        <div class="card fade-up" id="poll-${poll.id}">
          <!-- Header da enquete -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;gap:8px">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
                <span style="font-size:11px">📊 <span style="color:var(--muted2);">${cat.toUpperCase()}</span></span>
                ${pi === 0 ? \'<span class="badge badge-hot">🔥 Novo</span>\' : \'\'}
                ${totalVotes > 100 ? \'<span class="badge badge-live">⚡ Popular</span>\' : \'\'}
              </div>
              <h3 style="font-family:var(--font-head);font-size:16px;font-weight:800;line-height:1.3;margin-bottom:0">${escHtml(poll.question)}</h3>
            </div>
            <button class="btn-icon" onclick="openShareModal(\'${escAttr(poll.question)}\',\'Vote nesta enquete no VotaAí!\')" title="Compartilhar">🔗</button>
          </div>

          <!-- Opções -->
          <div id="poll-opts-${poll.id}">
            ${renderPollOptions(poll, voted)}
          </div>

          <!-- Footer da enquete -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;font-size:11px;color:var(--muted2)">
            <span>${fmtNum(totalVotes)} votos • ${ago}</span>
            <button class="btn-subtle" onclick="toggleComments(\'${poll.id}\')">💬 ${comments.length} comentários</button>
          </div>

          <!-- Área de comentários -->
          <div id="comments-${poll.id}" style="display:none;margin-top:16px">
            <!-- Comentários serão carregados aqui -->
            <div style="margin-bottom:12px;font-weight:bold">Comentários:</div>
            <div id="comments-list-${poll.id}">
              ${comments.length ? comments.map(c => `<div style="padding:8px 0;border-bottom:1px solid var(--border);">${escHtml(c.text)}</div>`).join(\'\') : \'Nenhum comentário ainda.\'}
            </div>
            <div style="margin-top:12px">
              <input type="text" id="comment-input-${poll.id}" placeholder="Adicionar comentário..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-dark);color:white;">
              <button class="btn-primary" style="margin-top:8px;" onclick="addComment(\'${poll.id}\')">Enviar</button>
            </div>
          </div>
        </div>
    `;
  }).join(\'\');

  // Funções auxiliares para renderPollOptions, toggleComments, addComment (precisam ser definidas)
  function renderPollOptions(poll, voted) {
    // Esta função precisa ser adaptada para a estrutura de dados real de poll_votes
    // Assumindo que poll.options é um array de objetos { id, text, vote_count }
    if (!poll.options || !Array.isArray(poll.options)) return \'\';

    const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.vote_count || 0), 0);

    return poll.options.map((opt, i) => `
      <div class="opt-row ${voted ? \'voted\' : \'\'} ${voted && voted === opt.id ? \'selected\' : \'\'}"
           id="poll-opt-${poll.id}-${opt.id}"
           onclick="votePoll(\'${poll.id}\', \'${opt.id}\')"
           style="--opt-color:${PALETTE[i % PALETTE.length].main};--opt-grad:${PALETTE[i % PALETTE.length].grad};margin-bottom:8px">
        <div class="opt-fill" style="width:${voted && totalVotes > 0 ? (opt.vote_count / totalVotes * 100) : 0}%"></div>
        <div class="opt-inner">
          <div class="opt-left">
            <div class="opt-check ${voted && voted === opt.id ? \'checked\' : \'\'}"></div>
            <span class="opt-label">${escHtml(opt.text)}</span>
          </div>
          <span class="opt-pct">${voted && totalVotes > 0 ? (opt.vote_count / totalVotes * 100).toFixed(1) + \'%\' : \'\'}</span>
        </div>
      </div>
    `).join(\'\');
  }

  function toggleComments(pollId) {
    const commentsArea = document.getElementById(`comments-${pollId}`);
    if (commentsArea) {
      commentsArea.style.display = commentsArea.style.display === \'none\' ? \'block\' : \'none\';
    }
  }

  async function addComment(pollId) {
    const input = document.getElementById(`comment-input-${pollId}`);
    const text = input.value.trim();
    if (!text) return;

    const commentsKey = `va_comments_${pollId}`;
    const comments = JSON.parse(localStorage.getItem(commentsKey) || \'[]\');
    comments.push({ text: text, created_at: new Date().toISOString() });
    localStorage.setItem(commentsKey, JSON.stringify(comments));
    input.value = \'\';
    renderPolls(); // Recarrega as enquetes para mostrar o novo comentário
  }

  async function votePoll(pollId, optionId) {
    const votedKey = `va_voted_${pollId}`;
    if (localStorage.getItem(votedKey)) {
      toast(\'Você já votou nesta enquete!\');
      return;
    }

    try {
      // Aqui você faria a chamada ao Supabase para registrar o voto
      // Exemplo: await sb().from(\'poll_options\').update({ vote_count: \'increment\' }).eq(\'id\', optionId);
      // Por enquanto, vamos simular o voto e atualizar o localStorage
      localStorage.setItem(votedKey, optionId);
      toast(\'Voto computado!\');
      renderPolls(); // Recarrega as enquetes para mostrar o resultado
    } catch (e) {
      console.error(\'Erro ao votar na enquete:\', e);
      toast(\'❌ Erro ao registrar voto. Tente novamente.\');
    }
  }
}}


/* ═══════════════════════════════════════════════
   INICIALIZAÇÃO
═══════════════════════════════════════════════ */

function init() {
  console.log('🚀 DOM carregado, inicializando app...');

  // Preenche informações do paredão
  document.querySelectorAll('.paredao-num').forEach(el => el.textContent = BBB_CONFIG.paredaoNum);
  document.querySelectorAll('.edicao-bbb').forEach(el => el.textContent = BBB_CONFIG.edicao);

  // Carrega dados e renderiza componentes
  loadBBBVotes();
  renderSources();
  
  // Define a aba inicial
  switchTab('bbb', 'nav-bbb');
  switchSub('parciais', document.querySelector('.sub-tab'));
}

// Garante que o DOM esteja pronto antes de executar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
'''
