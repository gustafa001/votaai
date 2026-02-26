const SUPABASE_URL = "https://infeszspgrsomeeycsc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZmVzenNwZ3Jzb21lZXljY3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4ODc4NDYsImV4cCI6MjA4NzQ2Mzg0Nn0.EhcsPW-GGwRoXBOxIXDniWgBv1IHjFaBmtrQuntliwk";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function sb() {
    return supabase;
}

// Global Toast utility
function toast(msg, isError = false) {
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, {
        position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        background: isError ? '#ef4444' : '#10b981', color: 'white',
        padding: '12px 24px', borderRadius: '8px', zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontWeight: 'bold', fontSize: '14px',
        transition: 'opacity 0.3s'
    });
    document.body.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 300);
    }, 3000);
}
