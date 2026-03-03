// admin.js - Lógica do painel administrativo
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const pass = document.getElementById('password').value;

            const btn = loginForm.querySelector('button');
            btn.disabled = true;
            btn.textContent = 'Entrando...';

            const { data, error } = await sb().auth.signInWithPassword({
                email: email,
                password: pass,
            });

            if (error) {
                toast('Erro: ' + error.message, true);
                btn.disabled = false;
                btn.textContent = 'Entrar';
            } else {
                toast('Login efetuado com sucesso!');
                location.reload();
            }
        });
    }
});

async function checkAuth() {
    const { data: { session } } = await sb().auth.getSession();
    const loginSection = document.getElementById('login-section');
    const adminSection = document.getElementById('admin-section');

    if (session) {
        // Verificação real de RBAC via user_metadata ou role
        const userRole = session.user.app_metadata?.role || session.user.user_metadata?.role;
        const isAdmin = userRole === 'admin' || session.user.email === 'gustafa001@gmail.com';

        if (!isAdmin) {
            console.error('⛔ Acesso negado: Usuário não tem permissão de admin.');
            toast('Acesso negado: Você não é um administrador.', true);
            await sb().auth.signOut();
            location.reload();
            return;
        }

        console.log('✅ Acesso administrativo concedido.');
        if (loginSection) loginSection.style.display = 'none';
        if (adminSection) adminSection.style.display = 'block';

        const emailEl = document.getElementById('admin-email');
        if (emailEl) emailEl.textContent = session.user.email;

        loadPollsAdmin();
        subscribeAdminRealtime();
    } else {
        if (loginSection) loginSection.style.display = 'block';
        if (adminSection) adminSection.style.display = 'none';
    }
}

async function logout() {
    await sb().auth.signOut();
    location.reload();
}

async function loadPollsAdmin() {
    const { data, error } = await sb().from('polls').select('*').order('created_at', { ascending: false });
    if (error) { toast('Erro ao carregar enquetes', true); return; }

    const list = document.getElementById('admin-polls-list');
    if (!list) return;

    if (!data || data.length === 0) {
        list.innerHTML = '<div style="color: grey; padding: 20px;">Nenhuma enquete criada.</div>';
        return;
    }

    list.innerHTML = '';
    data.forEach(poll => {
        const card = document.createElement('div');
        card.className = 'admin-card';
        card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div>
          <span style="background: ${poll.status === 'active' ? '#10b981' : '#ef4444'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">${poll.status === 'active' ? 'Ativa' : 'Inativa'}</span>
          <h3 style="margin: 8px 0; color: #3B1F6E;">${poll.question}</h3>
          <p style="font-size: 12px; color: #666;">Criada em: ${new Date(poll.created_at).toLocaleString()}</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="togglePollStatus('${poll.id}', '${poll.status}')" style="background:#4B5563; color:white; padding: 6px 12px; border-radius: 6px;">
            ${poll.status === 'active' ? 'Pausar' : 'Ativar'}
          </button>
          <button onclick="deletePoll('${poll.id}')" style="background:#ef4444; color:white; padding: 6px 12px; border-radius: 6px;">
            Excluir
          </button>
        </div>
      </div>
      <div id="admin-options-${poll.id}" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">
        <span style="font-size: 12px; color: grey;">Carregando respostas e votos...</span>
      </div>
    `;
        list.appendChild(card);
        loadPollOptionsAdmin(poll.id);
    });
}

async function loadPollOptionsAdmin(pollId) {
    const { data, error } = await sb().from('poll_options').select('*').eq('poll_id', pollId).order('option_text', { ascending: true });
    if (error) return;

    const optContainer = document.getElementById(`admin-options-${pollId}`);
    if (!optContainer) return;

    if (!data || data.length === 0) {
        optContainer.innerHTML = '<span style="font-size: 12px; color: grey;">Sem opções cadastradas.</span>';
        return;
    }

    let totalVotes = data.reduce((acc, opt) => acc + (opt.vote_count || 0), 0);

    optContainer.innerHTML = `<div style="font-size: 12px; font-weight: bold; margin-bottom: 10px;">Total de votos computados: <span id="admin-total-${pollId}">${totalVotes}</span></div>`;

    data.forEach(opt => {
        const pct = totalVotes > 0 ? ((opt.vote_count || 0) / totalVotes * 100).toFixed(1) : 0;
        optContainer.innerHTML += `
      <div style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px;">
          <span>${opt.option_text}</span>
          <strong><span id="admin-vc-${opt.id}">${opt.vote_count || 0}</span> votos (${pct}%)</strong>
        </div>
        <div style="background: #eee; height: 6px; border-radius: 4px; margin-top: 4px; overflow: hidden;">
          <div style="width: ${pct}%; background: #3B1F6E; height: 100%; transition: width 0.3s"></div>
        </div>
      </div>
    `;
    });
}

function addOptionField() {
    const container = document.getElementById('options-container');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input poll-option-input';
    input.placeholder = 'Digite uma opção de resposta...';
    input.required = true;
    container.appendChild(input);
}

async function createPoll() {
    const question = document.getElementById('new-poll-question').value;
    const optionsInp = document.querySelectorAll('.poll-option-input');
    const options = Array.from(optionsInp).map(i => i.value.trim()).filter(i => i !== '');

    if (!question || options.length < 2) {
        toast('Preencha a pergunta e pelo menos 2 opções.', true);
        return;
    }

    const btn = document.getElementById('btn-create-poll');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    // 1. Inserir a enquete
    const { data: poll, error: pErr } = await sb().from('polls')
        .insert([{ question: question, status: 'active' }])
        .select()
        .single();

    if (pErr) {
        toast('Erro ao criar enquete: ' + pErr.message, true);
        btn.disabled = false;
        btn.textContent = '+ Publicar Enquete';
        return;
    }

    // 2. Inserir opções
    const optionsData = options.map(opt => ({
        poll_id: poll.id,
        option_text: opt,
        vote_count: 0
    }));

    const { error: oErr } = await sb().from('poll_options').insert(optionsData);

    if (oErr) {
        toast('Erro ao criar opções: ' + oErr.message, true);
    } else {
        toast('Enquete publicada!');
        document.getElementById('new-poll-question').value = '';
        optionsInp.forEach((inp, idx) => { if (idx > 1) inp.remove(); else inp.value = ''; });
        loadPollsAdmin();
    }

    btn.disabled = false;
    btn.textContent = '+ Publicar Enquete';
}

async function togglePollStatus(id, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const { error } = await sb().from('polls').update({ status: newStatus }).eq('id', id);
    if (error) toast('Erro ao alterar status', true);
    else { toast('Status alterado!'); loadPollsAdmin(); }
}

async function deletePoll(id) {
    if (!confirm('Excluir esta enquete permanentemente e apagar todos os votos?')) return;
    // Assumindo que o foreign key on delete cascade cuida de poll_options e votes
    // Senão, deve excluir poll_options antes
    const { error } = await sb().from('polls').delete().eq('id', id);
    if (error) {
        toast('Erro ao deletar: verifique se você não deletou as opções primeiro (FK constraint)', true);
    } else {
        toast('Enquete deletada!', false);
        loadPollsAdmin();
    }
}

// Assinar atualizações de votos em tempo real
function subscribeAdminRealtime() {
    sb().channel('admin-polls')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'poll_options' }, payload => {
            const opt = payload.new;
            const el = document.getElementById(`admin-vc-${opt.id}`);
            if (el) {
                el.textContent = opt.vote_count;
                // Idealmente recalcular % dinamicamente aqui ou recarregar opções do poll
                loadPollOptionsAdmin(opt.poll_id);
            }
        })
        .subscribe();
}
