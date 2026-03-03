const SUPABASE_URL = "https://infeszspgrsomeeyccsc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZmVzenNwZ3Jzb21lZXljY3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4ODc4NDYsImV4cCI6MjA4NzQ2Mzg0Nn0.EhcsPW-GGwRoXBOxIXDniWgBv1IHjFaBmtrQuntliwk";

// Garantia de unificação do cliente
if (!window.supabaseClient && typeof window.supabase !== 'undefined') {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase Client inicializado com sucesso.');
}

// Função global s() para acesso seguro em todo o projeto
window.sb = function () {
    if (!window.supabaseClient) {
        // Mock básico para evitar erros fatais de 'Cannot read property of undefined'
        return {
            from: () => ({
                select: () => ({
                    eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
                    order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) })
                }),
                insert: () => Promise.resolve({ error: null }),
                update: () => ({ eq: () => Promise.resolve({ error: null }) }),
                delete: () => ({ eq: () => Promise.resolve({ error: null }) })
            }),
            auth: {
                getSession: () => Promise.resolve({ data: { session: null } }),
                signInWithPassword: () => Promise.resolve({ error: { message: "Supabase não carregado" } }),
                signOut: () => Promise.resolve({}),
                signInAnonymously: () => Promise.resolve({ error: null })
            },
            channel: () => ({ on: () => ({ subscribe: () => ({}) }) })
        };
    }
    return window.supabaseClient;
};

// Toast Global Robusto
window.sbToast = function (msg, isError = false) {
    console.log(isError ? '❌ ' : '🔔 ', msg);
    const existing = document.getElementById('toast-global');
    if (existing) existing.remove();

    const t = document.createElement('div');
    t.id = 'toast-global';
    t.textContent = msg;
    Object.assign(t.style, {
        position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
        background: isError ? '#ef4444' : '#10b981', color: 'white',
        padding: '12px 24px', borderRadius: '30px', zIndex: 10000,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)', fontWeight: 'bold', fontSize: '14px',
        transition: 'opacity 0.3s', pointerEvents: 'none'
    });
    document.body.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 300);
    }, 3500);
};
