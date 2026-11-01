/* Tabelas especiais com desconto — acesso restrito (administração e supervisores).
   Os dados ficam em um repositório PRIVADO do GitHub (não no site público):
     acesso.json            -> {"admins": ["login-da-admin"], "supervisores": {"login": "Nome"}}
     especiais/<id>.json    -> uma tabela especial por arquivo (com criado_por = login de quem criou)
   Administração vê e altera todas; cada supervisor vê e altera só as que criou. */
(async () => {
  const G = GART, $ = id => document.getElementById(id);
  const S = {conn: null, user: null, nome: "", admin: false, files: {}, app: null, edit: null, fams: []};
  const hoje = () => new Date().toISOString().slice(0, 10);
  const b64enc = str => { const bytes = new TextEncoder().encode(str); let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); };
  const b64dec = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), c => c.charCodeAt(0)));

  async function api(url, opts = {}) {
    const r = await fetch(url.startsWith("http") ? url : `https://api.github.com${url}`, {
      method: opts.method || "GET", body: opts.body ? JSON.stringify(opts.body) : undefined,
      headers: {Authorization: `Bearer ${S.conn.token}`, Accept: "application/vnd.github+json"}});
    if (r.status === 404 && opts.allow404) return null;
    if (!r.ok) { const t = await r.json().catch(() => ({})); const e = new Error(`${r.status} ${t.message || ""}`.trim()); e.status = r.status; throw e; }
    return r.status === 204 ? {} : r.json();
  }
  const cpath = p => `/repos/${S.conn.owner}/${S.conn.repo}/contents/${p}`;
  async function readJSON(p, allow404) { const j = await api(cpath(p), {allow404}); return j ? {sha: j.sha, data: JSON.parse(b64dec(j.content))} : null; }

  /* ---------- login ---------- */
  const saved = G.store.get("gart.especiais", null) || {};
  $("pv-owner").value = saved.owner || ""; $("pv-repo").value = saved.repo || "tabela-preco-especiais";
  $("pv-token").value = saved.token || ""; $("pv-remember").checked = !!saved.token;
  const status = (ok, t) => { $("pv-dot").classList.toggle("on", ok); $("pv-status").textContent = t; };

  $("btn-login").addEventListener("click", async () => {
    const c = {owner: $("pv-owner").value.trim(), repo: $("pv-repo").value.trim(), token: $("pv-token").value.trim()};
    if (!c.owner || !c.repo || !c.token) return G.toast("Preencha organização, repositório e token.");
    S.conn = c; status(false, "Conectando…");
    try {
      const u = await api("/user"); S.user = u.login;
      const ac = await readJSON("acesso.json", true);
      if (!ac) throw new Error('arquivo acesso.json não encontrado no repositório privado (veja o LEIAME)');
      const low = s => String(s).toLowerCase();
      const admins = (ac.data.admins || []).map(low), sup = Object.fromEntries(Object.entries(ac.data.supervisores || {}).map(([k, v]) => [low(k), v]));
      S.admin = admins.includes(low(S.user));
      if (!S.admin && !(low(S.user) in sup)) throw new Error(`o usuário ${S.user} não está autorizado. Peça à administração para incluí-lo em acesso.json`);
      S.nome = sup[low(S.user)] || u.name || S.user;
      G.store.set("gart.especiais", $("pv-remember").checked ? c : {owner: c.owner, repo: c.repo});
      await loadAll();
      status(true, `Conectado como ${S.nome} (${S.admin ? "administração — vê todas as tabelas" : "supervisor — vê só as suas tabelas"})`);
      $("gestao").hidden = false; $("consulta").hidden = false;
      $("g-title").textContent = S.admin ? "Tabelas especiais (todas)" : "Minhas tabelas especiais";
      $("g-help").textContent = "Crie a tabela com o desconto do cliente, depois escolha-a no seletor \"Tabela\" abaixo, defina canal e UF e baixe o Excel ou o PDF para enviar ao cliente. Esta página não é aberta ao público.";
      if (!S.app) S.app = await window.GART_APP({tabelas: visible()}); else S.app.setTabelas(visible());
      fillList(); formEsp(null);
    } catch (e) {
      S.conn = null; status(false, "Não foi possível entrar: " + e.message + ".");
      $("gestao").hidden = true; $("consulta").hidden = true;
    }
  });
  $("btn-sair").addEventListener("click", () => {
    G.store.del("gart.especiais"); $("pv-token").value = ""; S.conn = null; S.files = {};
    $("gestao").hidden = true; $("consulta").hidden = true; status(false, "Não conectado");
    if (S.app) S.app.setTabelas([], "");
  });

  /* ---------- dados ---------- */
  async function loadAll() {
    S.files = {};
    const dir = await api(cpath("especiais"), {allow404: true});
    for (const f of (dir || []).filter(f => f.type === "file" && f.name.endsWith(".json"))) {
      const j = await readJSON(`especiais/${f.name}`);
      S.files[f.name] = {sha: j.sha, t: j.data};
    }
  }
  const canEdit = t => S.admin || String(t.criado_por || "").toLowerCase() === String(S.user).toLowerCase();
  const visible = () => Object.values(S.files).map(f => f.t).filter(canEdit).sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));

  /* ---------- lista e formulário ---------- */
  function fillList() {
    const L = visible();
    $("esp-list").innerHTML = L.length ? L.map(t => `<div class="esp-item"><div><div class="t">${G.esc(t.titulo)}</div><div class="m">${t.cliente ? G.esc(t.cliente) + " · " : ""}desconto geral ${String(t.desconto_geral || 0).replace(".", ",")}%${Object.values(t.descontos || {}).some(Number) ? " + por família" : ""}${t.validade ? " · válida até " + G.dataBR(t.validade) : ""} · criada por ${G.esc(t.criado_por_nome || t.criado_por || "?")} em ${G.dataBR(t.criada)}</div></div><span class="toolbar"><button type="button" class="btn" data-ver="${G.esc(t.id)}">Ver / baixar</button><button type="button" class="btn" data-ed="${G.esc(t.id)}">Editar</button><button type="button" class="btn" data-del="${G.esc(t.id)}">Excluir</button></span></div>`).join("")
      : `<p class="help">Nenhuma tabela especial ainda. Crie a primeira abaixo.</p>`;
  }
  function formEsp(t) {
    S.edit = t ? t.id : null;
    $("esp-form-title").textContent = t ? `Editar: ${t.titulo}` : "Nova tabela especial";
    $("e-tit").value = t ? t.titulo : ""; $("e-cli").value = t ? t.cliente || "" : ""; $("e-val").value = t ? t.validade || "" : "";
    $("e-geral").value = t && t.desconto_geral ? t.desconto_geral : ""; $("e-obs").value = t ? t.observacao || "" : "";
    $("e-body").innerHTML = S.fams.map(f => `<tr data-f="${G.esc(f)}"><td><b>${G.esc(f)}</b></td><td><input type="number" step="0.01" value="${t && t.descontos && t.descontos[f] !== undefined ? t.descontos[f] : ""}"></td></tr>`).join("");
  }
  const byId = id => Object.entries(S.files).find(([, f]) => f.t.id === id);

  $("esp-list").addEventListener("click", async e => {
    const b = e.target.closest("button"); if (!b) return;
    const {ver, ed, del} = b.dataset;
    if (ver) { S.app.setTabelas(visible(), ver); document.getElementById("controls").scrollIntoView({behavior: "smooth"}); }
    if (ed) { const f = byId(ed); if (f) { formEsp(f[1].t); $("e-tit").focus(); } }
    if (del) {
      if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Confirmar exclusão"; return; }
      const f = byId(del); if (!f) return;
      try {
        await api(cpath(`especiais/${f[0]}`), {method: "DELETE", body: {message: `Exclui tabela especial ${f[1].t.titulo} (${S.user})`, sha: f[1].sha}});
        delete S.files[f[0]]; if (S.edit === del) formEsp(null);
        fillList(); S.app.setTabelas(visible(), ""); G.toast("Tabela especial excluída.");
      } catch (err) { G.toast("Erro ao excluir: " + err.message); }
    }
  });
  $("btn-esp-new").addEventListener("click", () => formEsp(null));
  $("btn-esp").addEventListener("click", async () => {
    const titulo = $("e-tit").value.trim(); if (!titulo) return G.toast("Informe o título da tabela especial.");
    const desc = {}; document.querySelectorAll("#e-body tr").forEach(tr => { const v = tr.querySelector("input").value.trim(); if (v !== "") desc[tr.dataset.f] = parseFloat(v.replace(",", ".")); });
    const geral = parseFloat(($("e-geral").value || "0").replace(",", ".")) || 0;
    if (!geral && !Object.values(desc).some(Number)) return G.toast("Informe um desconto geral ou por família.");
    let file, old = null;
    if (S.edit) { const f = byId(S.edit); file = f[0]; old = f[1]; }
    else {
      const base = G.slug($("e-cli").value || titulo) || "tabela"; let id = base, i = 2;
      while (S.files[`${id}.json`]) id = `${base}-${i++}`;
      file = `${id}.json`;
    }
    const t = {id: file.replace(/\.json$/, ""), titulo, cliente: $("e-cli").value.trim(), validade: $("e-val").value,
               desconto_geral: geral, descontos: desc, observacao: $("e-obs").value.trim(),
               criado_por: old ? old.t.criado_por : S.user, criado_por_nome: old ? old.t.criado_por_nome : S.nome,
               criada: old ? old.t.criada : hoje(), atualizada: hoje(), atualizada_por: S.user};
    try {
      const body = {message: `${old ? "Atualiza" : "Cria"} tabela especial ${titulo} (${S.user})`, content: b64enc(JSON.stringify(t, null, 2))};
      if (old) body.sha = old.sha;
      const r = await api(cpath(`especiais/${file}`), {method: "PUT", body});
      S.files[file] = {sha: r.content.sha, t};
      formEsp(null); fillList(); S.app.setTabelas(visible(), t.id);
      G.toast("Tabela especial salva. Ela já está selecionada abaixo para conferir e baixar.");
    } catch (err) { G.toast("Erro ao salvar: " + err.message + (err.status === 409 ? " — alguém alterou ao mesmo tempo; entre de novo." : "")); }
  });

  /* ---------- início ---------- */
  try { const prod = await G.getJSON("data/produtos.json"); S.fams = prod.familias; }
  catch (e) { status(false, "Não foi possível carregar os produtos. Abra pelo endereço publicado."); }
  if (saved.token) $("btn-login").click();
})();
