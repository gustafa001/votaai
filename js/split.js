const fs = require('fs');

const idx = fs.readFileSync('index.html', 'utf8');

// Extrai <style>
const styleMatch = idx.match(/<style>([\s\S]*?)<\/style>/i);
if (styleMatch) {
    fs.writeFileSync('css/style.css', styleMatch[1]);
}

// Extrai primeiro grande <script>
const scriptMatch = idx.match(/<script>(?!.*SUPABASE_URL)([\s\S]*?)<\/script>/g);
if (scriptMatch) {
    const scripts = scriptMatch.map(s => s.replace(/<\/?script>/g, ''));
    // Assume que o último bloco script gigante é o que precisamos
    fs.writeFileSync('js/votes.js', scripts[scripts.length - 1]);
}

// O resto do HTML limpo
let finalHtml = idx.replace(/<style>([\s\S]*?)<\/style>/i, '<link rel="stylesheet" href="css/style.css">');
const allScripts = finalHtml.match(/<script>[\s\S]*?<\/script>/g) || [];
allScripts.forEach(scp => {
    if (!scp.includes('SUPABASE_URL')) {
        finalHtml = finalHtml.replace(scp, '');
    }
});
finalHtml = finalHtml.replace('</body>', '<script src="js/supabase.js"></script>\n<script src="js/votes.js"></script>\n</body>');

finalHtml = finalHtml.replace(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase\/supabase-js@2"><\/script>[\s\S]*?<\/script>/, '');

fs.writeFileSync('index.html.new', finalHtml);
console.log('Done splitting!');
