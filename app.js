/* Tabela de Preço NMC GART — página de consulta (tabela oficial) e visualização das tabelas especiais.
   Na página pública (index.html) não há tabelas especiais: elas só aparecem em especiais.html, após login. */
window.GART_APP = async (opts = {}) => {
  const G = GART, $ = id => document.getElementById(id);
  let D;
  try { D = await G.load(); }
  catch (e) { document.querySelector(".wrap").insertAdjacentHTML("beforeend", `<div class="banner"><b>Erro:</b> ${G.esc(e.message)}. Abra a página pelo endereço publicado (GitHub Pages), não direto do computador.</div>`); return; }
  const {prod, cfg, rows} = D;
  const esp = {tabelas: opts.tabelas || []};
  const FK = ["familia", "modelo", "cor", "codigo", "esp", "alt", "comp"];
  const params = new URLSearchParams(location.search);
  const st = {canal: "", uf: "", q: "", tab: params.get("tabela") || "", f: Object.fromEntries(FK.map(k => [k, ""])),
              cols: G.store.get("gart.cols", G.PRESETS["Completa"])};

  /* ---------- cabeçalho / textos ---------- */
  function header() {
    const t = currentTab();
    $("titulo").textContent = t ? t.titulo : cfg.titulo;
    document.title = (t ? t.titulo : cfg.titulo) + " · " + cfg.revisao;
    $("rev").textContent = `${cfg.revisao} · vigência ${G.dataBR(cfg.vigencia)}`;
    $("subtitulo").textContent = t
      ? `Baseada na ${cfg.titulo} (${cfg.revisao}) ${t.cliente ? " · " + t.cliente : ""}`
      : `${cfg.empresa || "NMC GART"} · preço por unidade de venda e por metro linear, com IPI e ST da UF de destino · coloridos por cor, com código e EAN`;
    const info = [cfg.observacao, `Atualizada em ${G.dataBR(prod.versao)}.`].filter(Boolean);
    if (t && t.observacao) info.unshift(t.observacao);
    if (t && t.validade) info.unshift(`Condição válida até ${G.dataBR(t.validade)}.`);
    $("info").innerHTML = info.map(i => `<li>${G.esc(i)}</li>`).join("");
    $("foot-l").textContent = `${cfg.titulo} · ${cfg.revisao}`;
    const b = $("banner");
    if (t) {
      const fams = Object.entries(t.descontos || {}).filter(([, v]) => Number(v)).map(([f, v]) => `${f} ${String(v).replace(".", ",")}%`);
      const geral = Number(t.desconto_geral || 0);
      b.innerHTML = `<b>${G.esc(t.titulo)}</b> — desconto ${geral ? `geral de ${String(geral).replace(".", ",")}%` : ""}${geral && fams.length ? "; " : ""}${fams.length ? "por família: " + G.esc(fams.join(", ")) : ""}${!geral && !fams.length ? "não definido" : ""}. Preços já com desconto; IPI e ST calculados sobre o preço com desconto.`;
      b.hidden = false;
    } else b.hidden = true;
  }
  const currentTab = () => (esp.tabelas || []).find(t => t.id === st.tab) || null;
  function fillTabs() {
    const sel = $("tabela"); sel.innerHTML = `<option value="">Tabela oficial</option>`;
    (esp.tabelas || []).forEach(t => { const o = document.createElement("option"); o.value = t.id; o.textContent = t.titulo + (t.criado_por_nome || t.criado_por ? ` (${t.criado_por_nome || t.criado_por})` : ""); sel.appendChild(o); });
    if (!currentTab()) st.tab = "";
    sel.value = st.tab;
    $("f-tab").hidden = !(esp.tabelas || []).length;
  }
  fillTabs();
  Object.keys(prod.ufs).sort().forEach(u => { const o = document.createElement("option"); o.value = u; o.textContent = `${u} · ${G.UFN[u] || ""}`; $("uf").appendChild(o); });

  /* ---------- eventos ---------- */
  const clearF = () => FK.forEach(k => st.f[k] = "");
  document.querySelectorAll(".seg button").forEach(b => b.addEventListener("click", () => { if (st.canal !== b.dataset.canal) { st.canal = b.dataset.canal; clearF(); } render(); }));
  $("uf").addEventListener("change", e => { st.uf = e.target.value; render(); });
  $("tabela").addEventListener("change", e => {
    st.tab = e.target.value;
    const u = new URL(location.href); if (st.tab) u.searchParams.set("tabela", st.tab); else u.searchParams.delete("tabela");
    history.replaceState(null, "", u); header(); render();
  });
  $("q").addEventListener("input", e => { st.q = e.target.value.trim().toLowerCase(); render(); });
  FK.forEach(k => $("fl-" + k).addEventListener("change", e => { st.f[k] = e.target.value; render(); }));
  $("clear").addEventListener("click", () => { clearF(); st.q = ""; $("q").value = ""; render(); });

  /* ---------- colunas ---------- */
  function colMenu() {
    $("presets").innerHTML = Object.keys(G.PRESETS).map(n => `<button type="button" data-p="${n}">${n}</button>`).join("");
    $("cols").innerHTML = G.COLS.map(c => `<label><input type="checkbox" data-k="${c.k}" ${st.cols.includes(c.k) ? "checked" : ""} ${c.fixo ? "disabled" : ""}> ${c.t}</label>`).join("");
  }
  $("btn-cols").addEventListener("click", e => {
    const m = $("colmenu"); m.hidden = !m.hidden; $("btn-cols").setAttribute("aria-expanded", String(!m.hidden)); e.stopPropagation();
  });
  const closeMenu = () => { $("colmenu").hidden = true; $("btn-cols").setAttribute("aria-expanded", "false"); };
  $("colmenu").addEventListener("click", e => e.stopPropagation());
  document.addEventListener("click", () => { if (!$("colmenu").hidden) closeMenu(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("colmenu").hidden) closeMenu(); });
  $("presets").addEventListener("click", e => { const p = e.target.dataset.p; if (!p) return; st.cols = [...G.PRESETS[p]]; G.store.set("gart.cols", st.cols); colMenu(); render(); });
  $("cols").addEventListener("change", e => {
    const k = e.target.dataset.k; if (!k) return;
    st.cols = G.COLS.map(c => c.k).filter(c => c === "modelo" || (c === k ? e.target.checked : st.cols.includes(c)));
    G.store.set("gart.cols", st.cols); render();
  });
  const activeCols = () => G.COLS.filter(c => c.fixo || st.cols.includes(c.k));

  /* ---------- filtros ---------- */
  const key = (x, k) => x[k] == null || x[k] === "" ? "__vazio" : String(x[k]);
  const passQ = x => !st.q || [x.modelo, x.codigo, x.linha, x.ean, x.cor].join(" ").toLowerCase().includes(st.q);
  const pass = (x, skip) => FK.every(k => k === skip || !st.f[k] || key(x, k) === st.f[k]) && passQ(x);
  function fillFilters(list) {
    for (const k of FK) {
      const sel = $("fl-" + k), opts = new Map();
      list.filter(x => pass(x, k)).forEach(x => { const v = key(x, k); opts.set(v, (opts.get(v) || 0) + 1); });
      let vals = [...opts.keys()];
      const num = ["esp", "alt", "comp"].includes(k);
      if (k === "familia") vals.sort((a, b) => prod.familias.indexOf(a) - prod.familias.indexOf(b));
      else if (num) vals.sort((a, b) => (a === "__vazio") - (b === "__vazio") || Number(a) - Number(b));
      else vals.sort((a, b) => a.localeCompare(b, "pt-BR", {numeric: true}));
      if (st.f[k] && !opts.has(st.f[k])) vals.unshift(st.f[k]);
      const lab = v => v === "__vazio" ? (k === "cor" ? "(sem cor)" : "(sem medida)") : (num ? Number(v).toLocaleString("pt-BR") + " mm" : v);
      sel.innerHTML = `<option value="">Todos</option>` + vals.map(v => `<option value="${G.esc(v)}"${v === st.f[k] ? " selected" : ""}>${G.esc(lab(v))} (${opts.get(v) || 0})</option>`).join("");
      sel.classList.toggle("on", !!st.f[k]);
    }
  }
  const ctx = () => ({canal: st.canal, uf: st.uf, prod, desconto: G.descontoFn(currentTab())});
  const visible = () => rows.filter(x => x.canal === st.canal).filter(x => pass(x, null));

  /* ---------- tabela ---------- */
  function cell(c, x, p) {
    const u = x.med_un || "m";
    switch (c.k) {
      case "modelo": return `<td class="mod">${G.esc(x.modelo)}</td>`;
      case "cor": return `<td class="cor">${x.cor ? (x.cor_cod ? `<span class="sw" style="background:${G.SW[x.cor_cod] || "transparent"}" title="tom aproximado"></span>` : "") + G.esc(x.cor) : `<span class="small">–</span>`}</td>`;
      case "codigo": { const fl = [x.cod_obs, x.ean_obs].filter(Boolean).join(" · "); return `<td class="cod">${G.esc(x.codigo)}${fl ? `<span class="flag" title="${G.esc(fl)}">!</span>` : ""}</td>`; }
      case "ean": return `<td class="cod">${G.esc(x.ean) || "–"}</td>`;
      case "linha": return `<td class="lin">${G.esc(x.linha)}</td>`;
      case "esp": case "alt": case "comp": return `<td class="num dim">${G.mm(x[c.k])}</td>`;
      case "unidade": return `<td>${G.esc(x.unidade)}${x.composicao ? `<div class="small">${G.esc(x.composicao)}</div>` : ""}</td>`;
      case "embalagem": return `<td class="small">${G.esc(x.embalagem)}</td>`;
      case "ipi": return `<td class="c tax">${G.pct(x.ipi)}</td>`;
      case "st": return `<td class="c tax">${G.pct(p.st)}</td>`;
      case "tab": return `<td class="num money sep">${G.brl(p.tab)}</td>`;
      case "com": return `<td class="num money strong">${G.brl(p.com)}</td>`;
      case "m": return p.m == null ? `<td class="num money sep small">–</td>` : `<td class="num money sep">${G.brl(p.m)}<span class="u">/${u}</span></td>`;
      case "mc": return p.mc == null ? `<td class="num money small">–</td>` : `<td class="num money strong">${G.brl(p.mc)}<span class="u">/${u}</span></td>`;
    }
  }
  function head(cols) {
    const grp = [["Produto", c => ["modelo", "cor", "codigo", "ean", "linha"].includes(c.k), ""], ["Medidas (mm)", c => ["esp", "alt", "comp"].includes(c.k), "c dims"],
                 ["Venda", c => ["unidade", "embalagem"].includes(c.k), ""], ["Impostos", c => ["ipi", "st"].includes(c.k), "c"],
                 ["Por unidade de venda", c => ["tab", "com"].includes(c.k), "c money"], ["Por metro linear", c => ["m", "mc"].includes(c.k), "c money"]];
    let g = "";
    for (const [t, f, cls] of grp) { const n = cols.filter(f).length; if (n) g += `<th colspan="${n}" class="${cls}">${t}</th>`; }
    const short = {esp: "Espessura", alt: "Altura", comp: "Compr.", tab: "Preço tabela", com: "C/ impostos", m: "Preço tabela", mc: "C/ impostos", linha: "Descrição"};
    const r2 = cols.map(c => `<th class="${c.num || c.money ? "num" : ""}${["esp", "alt", "comp"].includes(c.k) ? " dims" : ""}${["ipi", "st"].includes(c.k) ? " c" : ""}">${short[c.k] || c.t}</th>`).join("");
    return `<tr class="grp">${g}</tr><tr>${r2}</tr>`;
  }
  function render() {
    document.querySelectorAll(".seg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.canal === st.canal));
    $("f-canal").classList.toggle("need", !st.canal);
    $("f-uf").classList.toggle("need", !st.uf);
    const ready = st.canal && st.uf;
    $("gate").hidden = !!ready; $("tablebox").hidden = !ready; $("filters").hidden = !ready; $("toolbar").hidden = !ready;
    const facts = $("facts"); facts.innerHTML = "";
    if (!ready) return;
    const t = prod.ufs[st.uf];
    const chips = st.canal === "Revenda"
      ? [["ok", `Coluna ICMS ${Math.round(t.icms * 100)}%`], [t.st_padrao ? "warn" : "", t.st_padrao ? `ST padrão ${G.pct(t.st_padrao)}` : "Sem ST padrão na UF"], ...(st.uf === "AM" ? [["ok", "Suframa −9,25%"]] : [])]
      : [["ok", "ICMS cheio 18% incluso · sem DIFAL"], ["", "Sem ST · preço nacional"]];
    facts.innerHTML = chips.map(([c, x]) => `<span class="chip ${c}">${x}</span>`).join("");
    const list = rows.filter(x => x.canal === st.canal);
    fillFilters(list);
    const vis = list.filter(x => pass(x, null));
    const active = FK.some(k => st.f[k]) || st.q;
    $("count").textContent = active ? `${vis.length} de ${list.length} itens` : `${list.length} itens`;
    $("clear").hidden = !active;
    const cols = activeCols(), C = ctx();
    $("th").innerHTML = head(cols);
    let h = "", cur = "", prevMod = "";
    const counts = {}; vis.forEach(x => counts[x.familia] = (counts[x.familia] || 0) + 1);
    for (const x of vis) {
      if (x.familia !== cur) { cur = x.familia; prevMod = ""; h += `<tr class="fam"><td colspan="${cols.length}">${G.esc(cur)}<span>${counts[cur]} itens</span></td></tr>`; }
      const nm = prevMod && x.modelo !== prevMod ? " nm" : ""; prevMod = x.modelo;
      const p = G.price(x, C);
      h += `<tr class="p${nm}">` + cols.map(c => cell(c, x, p)).join("") + `</tr>`;
    }
    $("tb").innerHTML = h || `<tr><td colspan="${cols.length}" class="empty">Nenhum produto com esses filtros. Use “Limpar filtros”.</td></tr>`;
  }

  /* ---------- exportação ---------- */
  function exportData() {
    const cols = activeCols(), C = ctx(), tab = currentTab();
    const titulo = tab ? tab.titulo : cfg.titulo;
    const linha2 = `${cfg.revisao} · vigência ${G.dataBR(cfg.vigencia)} · Canal: ${st.canal} · UF: ${st.uf}${st.canal === "Revenda" ? ` (ICMS ${Math.round(prod.ufs[st.uf].icms * 100)}%)` : " (ICMS 18% incluso)"}`;
    const filtros = FK.filter(k => st.f[k]).map(k => `${k}: ${st.f[k] === "__vazio" ? "vazio" : st.f[k]}`).concat(st.q ? [`busca: ${st.q}`] : []);
    const vis = visible();
    return {cols, titulo, linha2, filtros, data: vis.map(x => { const p = G.price(x, C); return {x, p, v: cols.map(c => G.value(x, p, c.k))}; })};
  }
  const fileName = ext => `${G.slug(currentTab() ? currentTab().titulo : cfg.titulo)}-${G.slug(cfg.revisao)}-${st.canal.toLowerCase()}-${st.uf}.${ext}`;

  $("btn-xlsx").addEventListener("click", () => {
    if (!window.XLSX) return G.toast("Não foi possível carregar o gerador de Excel. Verifique a internet.");
    const E = exportData();
    const aoa = [[E.titulo], [E.linha2], [E.filtros.length ? "Filtros: " + E.filtros.join(" · ") : ""], [],
                 ["Família", ...E.cols.map(c => c.t)]];
    E.data.forEach(r => aoa.push([r.x.familia, ...r.v.map(v => v === "" ? null : v)]));
    aoa.push([], ["Preço c/ impostos = preço tabela + IPI + ST. " + (cfg.observacao || "")]);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const R0 = 5; // 1ª linha de dados (0-based)
    E.cols.forEach((c, j) => {
      const col = j + 1;
      for (let i = 0; i < E.data.length; i++) {
        const ref = XLSX.utils.encode_cell({r: R0 + i, c: col}); const cellv = ws[ref]; if (!cellv) continue;
        if (c.money && typeof cellv.v === "number") cellv.z = '"R$" #,##0.00';
        if ((c.k === "ipi" || c.k === "st") && typeof cellv.v === "number") cellv.z = "0.00%";
        if (c.k === "ean" || c.k === "codigo") { cellv.t = "s"; cellv.v = String(cellv.v); }
      }
    });
    ws["!cols"] = [{wch: 18}, ...E.cols.map(c => ({wch: c.money ? 14 : c.k === "linha" ? 26 : c.k === "unidade" ? 22 : 13}))];
    ws["!autofilter"] = {ref: XLSX.utils.encode_range({s: {r: 4, c: 0}, e: {r: 4 + E.data.length, c: E.cols.length}})};
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Tabela de Preço");
    XLSX.writeFile(wb, fileName("xlsx"));
  });

  $("btn-pdf").addEventListener("click", () => {
    if (!window.jspdf) return G.toast("Não foi possível carregar o gerador de PDF. Verifique a internet.");
    const E = exportData();
    const doc = new jspdf.jsPDF({orientation: "landscape", unit: "mm", format: "a4"});
    const W = doc.internal.pageSize.getWidth();
    // cabeçalho na identidade GART: faixa petróleo, marca "GART." com ponto laranja, filete laranja
    const PETROL = [0, 90, 105], PETROL_DK = [0, 67, 78], ORANGE = [255, 103, 31];
    doc.setFillColor(...PETROL); doc.rect(0, 0, W, 24, "F");
    doc.setFillColor(...ORANGE); doc.rect(0, 24, W, 1.2, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255); doc.text("GART", 12, 8.5);
    doc.setTextColor(...ORANGE); doc.text(".", 12 + doc.getTextWidth("GART"), 8.5);
    doc.setFontSize(14); doc.setTextColor(255, 255, 255); doc.text(E.titulo.toUpperCase(), 12, 15.5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(207, 234, 239); doc.text(E.linha2, 12, 21);
    doc.setTextColor(107, 102, 104);
    if (E.filtros.length) doc.text("Filtros: " + E.filtros.join(" · "), 12, 30);
    const body = []; let cur = "";
    E.data.forEach(r => {
      if (r.x.familia !== cur) { cur = r.x.familia; body.push([{content: cur.toUpperCase(), colSpan: E.cols.length, styles: {fillColor: [224, 238, 240], fontStyle: "bold", textColor: PETROL_DK}}]); }
      body.push(E.cols.map((c, j) => {
        const v = r.v[j];
        if (v === null || v === "" || v === undefined) return "–";
        if (c.money) return G.brl(v) + (c.metro ? "/" + (r.x.med_un || "m") : "");
        if (c.k === "ipi" || c.k === "st") return G.pct(v);
        if (c.num) return G.mm(v);
        return String(v);
      }));
    });
    doc.autoTable({
      head: [E.cols.map(c => c.t)], body, startY: E.filtros.length ? 33 : 29, theme: "grid",
      styles: {fontSize: E.cols.length > 12 ? 6.4 : 7.5, cellPadding: 1.4, lineColor: [227, 225, 223], lineWidth: .1, textColor: [35, 31, 32]},
      headStyles: {fillColor: PETROL_DK, textColor: 255, fontStyle: "bold", halign: "center"},
      columnStyles: Object.fromEntries(E.cols.map((c, j) => [j, c.money || c.num ? {halign: "right"} : (c.k === "ipi" || c.k === "st") ? {halign: "center"} : {}])),
      margin: {left: 10, right: 10, bottom: 14},
      didDrawPage: () => {
        const H = doc.internal.pageSize.getHeight();
        doc.setFontSize(7.5); doc.setTextColor(120);
        doc.text(`${cfg.empresa || "NMC GART"} · ${cfg.titulo} · ${cfg.revisao} · Preço c/ impostos = preço tabela + IPI + ST · ${cfg.observacao || ""}`, 10, H - 7);
        doc.text(`Página ${doc.internal.getNumberOfPages()}`, W - 10, H - 7, {align: "right"});
      },
    });
    doc.save(fileName("pdf"));
  });

  colMenu(); header(); render();
  return {
    setTabelas(list, selectId) { esp.tabelas = list || []; if (selectId !== undefined) st.tab = selectId; fillTabs(); header(); render(); },
  };
};
if (!window.GART_DEFER) window.GART_APP();
