/**
 * VotaAI - Aplicação de Enquetes em Tempo Real
 * Arquitetura: Frontend (Cloudflare Pages) + Backend (Supabase)
 */

class VotaAI {
  constructor() {
    // Inicializar Supabase
    this.supabase = window.supabase.createClient(
      import.meta.env?.SUPABASE_URL || 'https://seu-projeto.supabase.co',
      import.meta.env?.SUPABASE_ANON_KEY || 'sua-chave-anonima'
    );
    
    this.adminAuthenticated = false;
    this.userIpHash = this.generateIpHash();
    
    // Cache para evitar re-render desnecessário
    this.pollsCache = new Map();
    
    this.init();
  }

  // --- Utilitários ---
  
  generateIpHash() {
    // Gera hash simples do IP (em produção, fazer no backend)
    const ip = 'user-' + (Math.random() * 1e9).toString(36);
    return btoa(ip).substring(0, 24);
  }

  formatDate(date) {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  }

  // --- Inicialização ---

  async init() {
    this.setupEventListeners();
    await this.loadPolls();
    this.startCountdown();
    this.setupRealtimeSubscription();
  }

  setupEventListeners() {
    // Formulário de criação de enquete
    document.getElementById('create-poll-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.createPoll();
    });

    // Botão do modal admin
    document.getElementById('admin-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'admin-modal') this.closeAdminModal();
    });

    // Tecla ESC para fechar modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAdminModal();
    });
  }

  // --- Carregamento de Dados ---

  async loadPolls() {
    const loading = document.getElementById('loading-state');
    const error = document.getElementById('error-state');
    const list = document.getElementById('polls-list');

    loading.classList.remove('hidden');
    error.classList.add('hidden');
    list.classList.add('hidden');

    try {
      const { data: polls, error: err } = await this.supabase
        .from('polls')
        .select(`
          *,
          options (
            id, label, image_url, vote_count, display_order
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (err) throw err;

      this.pollsCache.clear();
      polls.forEach(poll => this.pollsCache.set(poll.id, poll));
      
      this.renderPolls(polls);
      
      loading.classList.add('hidden');
      list.classList.remove('hidden');
      
    } catch (error) {
      console.error('Erro ao carregar enquetes:', error);
      loading.classList.add('hidden');
      error.classList.remove('hidden');
      document.getElementById('error-message').textContent = 
        'Erro de conexão. Verifique sua internet.';
    }
  }

  renderPolls(polls) {
    const container = document.getElementById('polls-list');
    
    if (polls.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12 text-slate-500">
          <i class="fa-regular fa-clipboard text-4xl mb-3"></i>
          <p>Nenhuma enquete ativa no momento.</p>
        </div>`;
      return;
    }

    container.innerHTML = polls.map(poll => this.renderPollCard(poll)).join('');
    
    // Adicionar listeners de voto
    container.querySelectorAll('[data-vote-btn]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pollId = e.currentTarget.dataset.pollId;
        const optionId = e.currentTarget.dataset.optionId;
        this.handleVote(pollId, optionId);
      });
    });
  }

  renderPollCard(poll) {
    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.vote_count, 0);
    const isClosed = poll.closes_at && new Date(poll.closes_at) < new Date();

    return `
      <article class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
        <div class="p-5 border-b border-slate-100">
          <div class="flex justify-between items-start mb-3">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isClosed ? 'bg-slate-100 text-slate-600' : 'bg-green-100 text-green-700'
            }">
              <span class="w-1.5 h-1.5 rounded-full ${isClosed ? 'bg-slate-400' : 'bg-green-500 animate-pulse'}"></span>
              ${isClosed ? 'Encerrada' : 'Ao Vivo'}
            </span>
            <span class="text-xs text-slate-500">
              <i class="fa-solid fa-users mr-1"></i>${totalVotes.toLocaleString('pt-BR')} votos
            </span>
          </div>
          
          <h3 class="text-lg font-bold text-slate-800 mb-4">${poll.title}</h3>
          
          <div class="space-y-3">
            ${poll.options.map((option, index) => {
              const percentage = totalVotes > 0 
                ? Math.round((option.vote_count / totalVotes) * 100) 
                : 0;
              
              return `
                <div class="group">
                  <div class="flex justify-between text-sm mb-1.5">
                    <span class="font-medium text-slate-700">${index + 1}. ${option.label}</span>
                    <span class="text-slate-500">${percentage}%</span>
                  </div>
                  <button 
                    data-vote-btn 
                    data-poll-id="${poll.id}" 
                    data-option-id="${option.id}"
                    ${isClosed ? 'disabled' : ''}
                    class="w-full bg-slate-100 rounded-lg h-3 overflow-hidden cursor-pointer hover:bg-slate-200 transition-colors relative ${
                      isClosed ? 'cursor-not-allowed opacity-60' : ''
                    }"
                    title="${isClosed ? 'Enquete encerrada' : 'Clique para votar'}"
                  >
                    <div class="bg-indigo-600 h-full rounded-lg transition-all duration-700" 
                         style="width: ${percentage}%"></div>
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        
        ${poll.closes_at ? `
          <div class="px-5 py-3 bg-slate-50 text-xs text-slate-600 border-t">
            <i class="fa-regular fa-clock mr-1"></i>
            Encerra em: <strong>${this.formatDate(poll.closes_at)}</strong>
          </div>
        ` : ''}
      </article>
    `;
  }

  // --- Sistema de Votação ---

  async handleVote(pollId, optionId) {
    // Verificar se já votou (cache local + backend)
    const votedKey = `voted_${pollId}`;
    if (localStorage.getItem(votedKey)) {
      this.showToast('Você já votou nesta enquete! 🗳️', 'info');
      return;
    }

    try {
      // Registrar voto no backend
      const { error } = await this.supabase
        .from('votes')
        .insert({
          poll_id: pollId,
          option_id: optionId,
          user_ip_hash: this.userIpHash
        });

      if (error) {
        if (error.code === '23505') { // Unique violation
          localStorage.setItem(votedKey, 'true');
          this.showToast('Voto já registrado! ✅', 'success');
          return;
        }
        throw error;
      }

      // Marcar como votado localmente
      localStorage.setItem(votedKey, 'true');
      
      // Atualizar UI otimisticamente
      this.updatePollUI(pollId, optionId);
      
      this.showToast('Voto computado com sucesso! 🎉', 'success');
      
    } catch (error) {
      console.error('Erro ao votar:', error);
      this.showToast('Não foi possível registrar seu voto. Tente novamente.', 'error');
    }
  }

  updatePollUI(pollId, votedOptionId) {
    const poll = this.pollsCache.get(pollId);
    if (!poll) return;

    // Atualizar contador da opção votada
    const option = poll.options.find(opt => opt.id === votedOptionId);
    if (option) {
      option.vote_count++;
      poll.options.forEach(opt => {
        opt.percentage = Math.round((opt.vote_count / 
          (poll.options.reduce((s, o) => s + o.vote_count, 0))) * 100) || 0;
      });
    }

    // Re-renderizar apenas o card afetado (otimização)
    const card = document.querySelector(`[data-poll-id="${pollId}"]`)?.closest('article');
    if (card) {
      card.outerHTML = this.renderPollCard(poll);
    }
  }

  // --- Admin Panel ---

  async authenticateAdmin() {
    const password = document.getElementById('admin-password').value;
    const adminToken = import.meta.env?.ADMIN_TOKEN || 'uma-senha-forte-aleatoria-123!';
    
    if (password === adminToken) {
      this.adminAuthenticated = true;
      document.getElementById('admin-login').classList.add('hidden');
      document.getElementById('admin-panel').classList.remove('hidden');
      document.getElementById('admin-password').value = '';
      this.showToast('Bem-vindo, Admin! 🔐', 'success');
    } else {
      this.showToast('Token inválido!', 'error');
      // Limitar tentativas (simples)
      const attempts = parseInt(localStorage.getItem('admin_attempts') || '0') + 1;
      localStorage.setItem('admin_attempts', attempts);
      if (attempts >= 5) {
        document.getElementById('admin-password').disabled = true;
        this.showToast('Muitas tentativas. Recarregue a página.', 'error');
      }
    }
  }

  logoutAdmin() {
    this.adminAuthenticated = false;
    document.getElementById('admin-login').classList.remove('hidden');
    document.getElementById('admin-panel').classList.add('hidden');
    localStorage.removeItem('admin_attempts');
  }

  async createPoll() {
    const title = document.getElementById('poll-title').value.trim();
    const optionsText = document.getElementById('poll-options').value.trim();
    const closesAt = document.getElementById('poll-closes-at').value;

    if (!title || !optionsText) {
      this.showToast('Preencha título e opções!', 'error');
      return;
    }

    const options = optionsText.split('\n')
      .map(o => o.trim())
      .filter(o => o)
      .map((label, index) => ({
        label,
        display_order: index,
        vote_count: 0
      }));

    if (options.length < 2) {
      this.showToast('Adicione pelo menos 2 opções!', 'error');
      return;
    }

    try {
      // Inserir enquete + opções em transação
      const { data: poll, error } = await this.supabase
        .from('polls')
        .insert({
          title,
          description: '',
          is_active: true,
          closes_at: closesAt || null
        })
        .select()
        .single();

      if (error) throw error;

      // Inserir opções
      const { error: optionsError } = await this.supabase
        .from('options')
        .insert(options.map(opt => ({
          poll_id: poll.id,
          label: opt.label,
          display_order: opt.display_order
        })));

      if (optionsError) throw optionsError;

      this.showToast('Enquete publicada com sucesso! 🚀', 'success');
      
      // Resetar form e recarregar
      document.getElementById('create-poll-form').reset();
      await this.loadPolls();
      this.closeAdminModal();
      
    } catch (error) {
      console.error('Erro ao criar enquete:', error);
      this.showToast('Erro ao publicar. Tente novamente.', 'error');
    }
  }

  closeAdminModal() {
    document.getElementById('admin-modal').classList.add('hidden');
  }

  openAdminModal() {
    document.getElementById('admin-modal').classList.remove('hidden');
    if (this.adminAuthenticated) {
      document.getElementById('admin-login').classList.add('hidden');
      document.getElementById('admin-panel').classList.remove('hidden');
    }
  }

  // --- Timer e Realtime ---

  startCountdown() {
    const countdownEl = document.getElementById('countdown');
    // Definir data da próxima eliminação (exemplo: BBB - ajustar conforme necessário)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2); // Daqui a 2 dias
    targetDate.setHours(23, 0, 0, 0);

    const update = () => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        countdownEl.innerHTML = '<span class="text-red-400 font-bold">AO VIVO AGORA!</span>';
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      countdownEl.textContent = 
        `${hours.toString().padStart(2,'0')}h ${minutes.toString().padStart(2,'0')}m ${seconds.toString().padStart(2,'0')}s`;
    };

    update();
    setInterval(update, 1000);
  }

  setupRealtimeSubscription() {
    // Assinar mudanças em tempo real na tabela de opções
    this.supabase
      .channel('public:options')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'options' },
        (payload) => {
          // Atualizar UI quando votos mudarem
          this.loadPolls(); // Recarrega tudo (pode otimizar depois)
        }
      )
      .subscribe();
  }

  // --- UI Helpers ---

  showToast(message, type = 'info') {
    // Remover toast anterior se existir
    const existing = document.getElementById('toast-notification');
    if (existing) existing.remove();

    const colors = {
      success: 'bg-green-600',
      error: 'bg-red-600',
      info: 'bg-indigo-600'
    };

    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = `fixed bottom-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 animate-slide-up`;
    toast.innerHTML = `
      <span class="text-xl font-bold">${icons[type]}</span>
      <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remove após 4s
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

// Adicionar animação CSS para o toast
const style = document.createElement('style');
style.textContent = `
  @keyframes slide-up {
    from { transform: translateY(100px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .animate-slide-up { animation: slide-up 0.3s ease-out; }
`;
document.head.appendChild(style);

// Inicializar app quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.app = new VotaAI();
  
  // Expor função para abrir modal admin (ex: botão no footer)
  window.openAdminPanel = () => window.app?.openAdminModal();
});
