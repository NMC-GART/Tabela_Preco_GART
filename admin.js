/* Tabela de Preço NMC GART — administração */
(async () => {
  const G = GART, $ = id => document.getElementById(id);
  const FILES = {prod: "data/produtos.json", cfg: "data/config.json"};
  const S = {conn: null, data: {}, sha: {}, dirty: new Set()};
  const hoje = () => new Date().toISOString().slice(0, 10);

  /* ---------- GitHub (API de conteúdo) ---------- */
  const b64enc = str => { const bytes = new TextEncoder().encode(str); let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); };
  const b64dec = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), c => c.charCodeAt(0)));
  async function gh(path, opts = {}) {
    const c = S.conn;
    const url = `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${path}` + (opts.method ? "" : `?ref=${encodeURIComponent(c.branch)}`);
    const r = await fetch(url, {method: opts.method || "GET", headers: {Authorization: `Bearer ${c.token}`, Accept: "application/vnd.github+json"}, body: opts.body ? JSON.stringify(opts.body) : undefined});
    if (!r.ok) { const t = await r.json().catch(() => ({})); throw new Error(`${r.status} ${t.message || ""}`.trim()); }
    return r.json();
  }
  async function loadFromGitHub() {
    for (const [k, p] of Object.entries(FILES)) {
      const j = await gh(p); S.sha[k] = j.sha; S.data[k] = JSON.parse(b64dec(j.content));
    }
  }
  async function loadFromSite() {
    for (const [k, p] of Object.entries(FILES)) S.data[k] = await G.getJSON(p);
  }

  /* ---------- conexão ---------- */
  const guess = () => {
    const h = location.hostname, parts = location.pathname.split("/").filter(Boolean);
    return h.endsWith(".github.io") ? {owner: h.split(".")[0], repo: parts[0] || ""} : {owner: "", repo: ""};
  };
  const saved = G.store.get("gart.admin", null) || {};
  const g0 = guess();
  $("gh-owner").value = saved.owner || g0.owner; $("gh-repo").value = saved.repo || g0.repo;
  $("gh-branch").value = saved.branch || "main"; $("gh-token").value = saved.token || ""; $("remember").checked = !!saved.token;

  function setStatus(ok, txt) { $("dot").classList.toggle("on", ok); $("conn-status").textContent = txt; $("btn-save").disabled = !ok; }
  $("btn-connect").addEventListener("click", async () => {
    const c = {owner: $("gh-owner").value.trim(), repo: $("gh-repo").value.trim(), branch: $("gh-branch").value.trim() || "main", token: $("gh-token").value.trim()};
    if (!c.owner || !c.repo || !c.token) return G.toast("Preencha usuário, repositório e token.");
    if (S.dirty.size && !window.__confirmReload) { G.toast("Há alterações não salvas. Salve, baixe ou descarte antes de entrar."); return; }
    S.conn = c;
    try {
      setStatus(false, "Conectando…");
      await loadFromGitHub();
      G.store.set("gart.admin", $("remember").checked ? c : {owner: c.owner, repo: c.repo, branch: c.branch});
      setStatus(true, `Conectado a ${c.owner}/${c.repo} (${c.branch}) — as alterações são gravadas direto no site`);
      S.dirty.clear(); refreshAll();
    } catch (e) { S.conn = null; setStatus(false, "Não foi possível entrar: " + e.message + ". Confira usuário, repositório e token."); }
  });
  $("btn-logout").addEventListener("click", () => { G.store.del("gart.admin"); $("gh-token").value = ""; S.conn = null; setStatus(false, "Sem conexão — modo de edição com download dos arquivos"); });

  /* ---------- alterações pendentes ---------- */
  function markDirty(k) { S.dirty.add(k); pending(); }
  function pending() {
    const n = S.dirty.size; $("pending").hidden = !n;
    const nomes = {prod: "preços", cfg: "título/revisão"};
    $("pending-txt").innerHTML = `<b>Alterações ainda não publicadas:</b> ${[...S.dirty].map(k => nomes[k]).join(", ")}.` + (S.conn ? "" : " Sem conexão: baixe os arquivos e envie para a pasta data/ do repositório.");
  }
  $("btn-save").addEventListener("click", async () => {
    if (!S.conn) return;
    const msg = `Tabela de preço: ${S.data.cfg.revisao} (${[...S.dirty].join(", ")}) — ${hoje()}`;
    try {
      for (const k of [...S.dirty]) {
        const body = {message: msg, content: b64enc(JSON.stringify(S.data[k], null, k === "prod" ? 0 : 2)), branch: S.conn.branch, sha: S.sha[k]};
        const r = await gh(FILES[k], {method: "PUT", body}); S.sha[k] = r.content.sha; S.dirty.delete(k);
      }
      pending(); G.toast("Salvo no GitHub. O site atualiza em 1 a 2 minutos.");
    } catch (e) { G.toast("Erro ao salvar: " + e.message + ". Se alguém alterou ao mesmo tempo, clique em Entrar de novo."); }
  });
  $("btn-download").addEventListener("click", () => {
    for (const k of S.dirty) {
      const blob = new Blob([JSON.stringify(S.data[k], null, k === "prod" ? 0 : 2)], {type: "application/json"});
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = FILES[k].split("/")[1]; document.body.appendChild(a); a.click(); a.remove();
    }
    G.toast("Arquivos baixados. Envie-os para a pasta data/ do repositório (Add file → Upload files).");
  });
  $("btn-discard").addEventListener("click", async () => { S.dirty.clear(); pending(); if (S.conn) await loadFromGitHub(); else await loadFromSite(); refreshAll(); G.toast("Alterações descartadas."); });
  window.addEventListener("beforeunload", e => { if (S.dirty.size) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------- abas ---------- */
  document.querySelectorAll(".tabs button").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".tabs button").forEach(x => x.setAttribute("aria-selected", String(x === b)));
    document.querySelectorAll("[data-panel]").forEach(p => p.hidden = p.dataset.panel !== b.dataset.tab);
  }));

  /* ---------- título e revisão ---------- */
  function fillCfg() {
    const c = S.data.cfg;
    $("c-titulo").value = c.titulo || ""; $("c-rev").value = c.revisao || ""; $("c-vig").value = c.vigencia || "";
    $("c-emp").value = c.empresa || ""; $("c-obs").value = c.observacao || "";
  }
  $("btn-cfg").addEventListener("click", () => {
    const c = S.data.cfg;
    const novo = {titulo: $("c-titulo").value.trim(), revisao: $("c-rev").value.trim(), vigencia: $("c-vig").value, empresa: $("c-emp").value.trim(), observacao: $("c-obs").value.trim()};
    if (!novo.titulo) return G.toast("O título não pode ficar vazio.");
    const mudou = Object.keys(novo).filter(k => novo[k] !== (c[k] || ""));
    if (!mudou.length) return G.toast("Nada mudou.");
    Object.assign(c, novo);
    (c.historico = c.historico || []).push({data: hoje(), revisao: c.revisao, descricao: "Título/revisão/vigência alterados: " + mudou.join(", "), percentuais: {}});
    markDirty("cfg"); refreshAll(); G.toast("Aplicado. Lembre de salvar.");
  });

  /* ---------- reajuste ---------- */
  function rows() { return G.rowsOf(S.data.prod); }
  function fillReaj() {
    const c = S.data.cfg, prod = S.data.prod, rs = rows();
    $("r-tit").value = c.titulo; $("r-rev").value = nextRev(c.revisao); $("r-vig").value = hoje();
    $("r-body").innerHTML = prod.familias.map(f => {
      const ex = rs.find(x => x.familia === f && x.canal === "Revenda") || rs.find(x => x.familia === f);
      const n = rs.filter(x => x.familia === f).length;
      return `<tr data-f="${G.esc(f)}"><td><b>${G.esc(f)}</b></td><td><input type="number" step="0.01" value="" placeholder="0"></td><td>${n}</td><td class="small">${ex ? G.esc(ex.canal + " · " + ex.modelo + (ex.cor ? " " + ex.cor : "")) : ""}</td><td class="num">${ex ? G.brl(ex.p18) : ""}</td><td class="num depois"></td></tr>`;
    }).join("");
    preview();
  }
  const nextRev = r => { const m = String(r || "").match(/(\d+)\s*$/); return m ? r.replace(/(\d+)\s*$/, String(Number(m[1]) + 1).padStart(m[1].length, "0")) : (r ? r + " (reajuste)" : "Rev. 02"); };
  function pcts() { const o = {}; document.querySelectorAll("#r-body tr").forEach(tr => { const v = parseFloat(tr.querySelector("input").value.replace(",", ".")); if (!isNaN(v) && v) o[tr.dataset.f] = v; }); return o; }
  function preview() {
    const P = pcts(), rs = rows(), canal = $("r-canal").value; let n = 0;
    document.querySelectorAll("#r-body tr").forEach(tr => {
      const f = tr.dataset.f, ex = rs.find(x => x.familia === f && (canal === "ambos" || x.canal === canal));
      const p = P[f] || 0, td = tr.querySelector(".depois");
      td.innerHTML = ex && p ? `${G.brl(ex.p18 * (1 + p / 100))} <span class="${p > 0 ? "up" : "down"}">${p > 0 ? "+" : ""}${String(p).replace(".", ",")}%</span>` : "";
      if (p) n += rs.filter(x => x.familia === f && (canal === "ambos" || x.canal === canal)).length;
    });
    $("r-sum").textContent = n ? `${n} itens serão reajustados` : "Nenhum percentual informado";
  }
  $("r-body").addEventListener("input", preview); $("r-canal").addEventListener("change", preview);
  $("r-geral").addEventListener("input", e => { document.querySelectorAll("#r-body input").forEach(i => i.value = e.target.value); preview(); });
  $("btn-reaj").addEventListener("click", () => {
    const P = pcts(), canal = $("r-canal").value;
    if (!Object.keys(P).length) return G.toast("Informe ao menos um percentual.");
    const prod = S.data.prod, ci = Object.fromEntries(prod.campos.map((k, i) => [k, i]));
    let n = 0;
    prod.linhas.forEach(l => {
      const p = P[l[ci.familia]]; if (!p || (canal !== "ambos" && l[ci.canal] !== canal)) return;
      for (const k of ["p18", "p12", "p7"]) l[ci[k]] = Math.round(l[ci[k]] * (1 + p / 100) * 10000) / 10000;
      n++;
    });
    prod.versao = hoje();
    const c = S.data.cfg;
    c.titulo = $("r-tit").value.trim() || c.titulo; c.revisao = $("r-rev").value.trim() || c.revisao; c.vigencia = $("r-vig").value || c.vigencia;
    (c.historico = c.historico || []).push({data: hoje(), revisao: c.revisao, descricao: `Reajuste (${canal === "ambos" ? "Revenda e Construtora" : canal}) em ${n} itens`, percentuais: P});
    markDirty("prod"); markDirty("cfg"); refreshAll(); G.toast(`Reajuste aplicado em ${n} itens. Lembre de salvar.`);
  });

  /* ---------- histórico ---------- */
  function fillHist() {
    const H = [...(S.data.cfg.historico || [])].reverse();
    $("hist").innerHTML = H.map(h => `<li><b>${G.dataBR(h.data)} · ${G.esc(h.revisao || "")}</b> — ${G.esc(h.descricao || "")}${h.percentuais && Object.keys(h.percentuais).length ? `<div class="small">${Object.entries(h.percentuais).map(([f, p]) => `${G.esc(f)} ${p > 0 ? "+" : ""}${String(p).replace(".", ",")}%`).join(" · ")}</div>` : ""}</li>`).join("") || "<li>Sem registros.</li>";
  }

  function refreshAll() { fillCfg(); fillReaj(); fillHist(); pending(); }

  try { await loadFromSite(); refreshAll(); setStatus(false, "Sem conexão — modo de edição com download dos arquivos"); }
  catch (e) { G.toast("Não foi possível carregar os dados: " + e.message); }
  if (saved.token) $("btn-connect").click();
})();
