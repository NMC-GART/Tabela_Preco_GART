/* Tabela de Preço NMC GART — lógica compartilhada (consulta e administração) */
const GART = (() => {
  const UFN = {AC:"Acre",AL:"Alagoas",AP:"Amapá",AM:"Amazonas",BA:"Bahia",CE:"Ceará",DF:"Distrito Federal",ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MT:"Mato Grosso",MS:"Mato Grosso do Sul",MG:"Minas Gerais",PA:"Pará",PB:"Paraíba",PR:"Paraná",PE:"Pernambuco",PI:"Piauí",RJ:"Rio de Janeiro",RN:"Rio Grande do Norte",RS:"Rio Grande do Sul",RO:"Rondônia",RR:"Roraima",SC:"Santa Catarina",SP:"São Paulo",SE:"Sergipe",TO:"Tocantins"};
  const SW = {"002":"#B8A29C","003":"#1F1F1F","005":"#D9CBA6","009":"#A4A7A9","010":"#5B5F63","011":"#3C3F43","012":"#BBA98E","014":"#F5F5F1"};

  async function getJSON(path) {
    const r = await fetch(path + "?v=" + Date.now(), {cache: "no-store"});
    if (!r.ok) throw new Error("Não foi possível carregar " + path);
    return r.json();
  }
  function rowsOf(prod) {
    return prod.linhas.map(a => Object.fromEntries(prod.campos.map((k, i) => [k, a[i]])));
  }
  async function load() {
    if (window.GART_DATA) { const {prod, cfg} = window.GART_DATA; return {prod, cfg, rows: rowsOf(prod)}; }  // versão de prévia (arquivo único)
    const [prod, cfg] = await Promise.all([getJSON("data/produtos.json"), getJSON("data/config.json")]);
    return {prod, cfg, rows: rowsOf(prod)};
  }

  /* Preço — mesma regra do Formulário de Orçamento 2026:
     Revenda: coluna de preço pelo ICMS da UF; AM = × fator Suframa; IPI e ST sobre o preço (já com desconto, se houver).
     Construtora: preço único (ICMS 18% incluso), sem ST. */
  function price(x, ctx) {
    const {canal, uf, prod, desconto} = ctx;
    const t = prod.ufs[uf];
    const icms = canal === "Construtora" ? 0.18 : t.icms;
    const cheio = icms === 0.18 ? x.p18 : icms === 0.12 ? x.p12 : x.p7;
    const d = desconto ? (desconto(x) || 0) : 0;
    const base = cheio * (1 - d / 100);
    const suf = canal === "Revenda" && uf === "AM";
    const st = canal === "Construtora" ? 0 : (t[x.st_cat] || 0);
    const tab = suf ? base * prod.suframa : base;
    const com = tab + base * (x.ipi + st);
    return {icms, st, cheio, desc: d, tab, com, m: x.med_qtd ? tab / x.med_qtd : null, mc: x.med_qtd ? com / x.med_qtd : null};
  }
  function descontoFn(tabela) {
    if (!tabela) return null;
    return x => {
      const f = tabela.descontos && tabela.descontos[x.familia];
      return (f !== undefined && f !== null && f !== "") ? Number(f) : Number(tabela.desconto_geral || 0);
    };
  }

  const brl = v => v == null ? "" : v.toLocaleString("pt-BR", {style: "currency", currency: "BRL"});
  const pct = v => v ? (v * 100).toLocaleString("pt-BR", {maximumFractionDigits: 2}) + "%" : "–";
  const mm = v => v == null ? "–" : Number(v).toLocaleString("pt-BR");
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
  const dataBR = iso => { if (!iso) return ""; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };

  /* Colunas disponíveis (o usuário escolhe quais aparecem; o export segue a mesma escolha) */
  const COLS = [
    {k: "modelo", t: "Modelo", fixo: true},
    {k: "cor", t: "Cor"},
    {k: "codigo", t: "Código"},
    {k: "ean", t: "EAN"},
    {k: "linha", t: "Descrição"},
    {k: "esp", t: "Espessura (mm)", num: true},
    {k: "alt", t: "Altura (mm)", num: true},
    {k: "comp", t: "Comprimento (mm)", num: true},
    {k: "unidade", t: "Unidade de venda"},
    {k: "embalagem", t: "Embalagem (cx)"},
    {k: "ipi", t: "IPI", imp: true},
    {k: "st", t: "ST", imp: true},
    {k: "tab", t: "Preço tabela (unid.)", money: true},
    {k: "com", t: "Preço c/ impostos (unid.)", money: true, imp: true},
    {k: "m", t: "Preço tabela (por m)", money: true, metro: true},
    {k: "mc", t: "Preço c/ impostos (por m)", money: true, imp: true, metro: true},
  ];
  const PRESETS = {
    "Completa": COLS.map(c => c.k),
    "Sem impostos": COLS.filter(c => !c.imp).map(c => c.k),
    "Com EAN": ["modelo", "cor", "codigo", "ean", "linha", "unidade", "embalagem", "tab", "com"],
    "Compacta": ["modelo", "cor", "codigo", "linha", "unidade", "tab", "com"],
  };
  /* valor "cru" de uma coluna, usado no Excel/PDF */
  function value(x, p, k) {
    switch (k) {
      case "ipi": return x.ipi;
      case "st": return p.st;
      case "tab": return p.tab;
      case "com": return p.com;
      case "m": return p.m;
      case "mc": return p.mc;
      case "unidade": return x.unidade + (x.composicao ? ` (${x.composicao})` : "");
      default: return x[k] ?? "";
    }
  }
  function slug(s) {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  }
  function toast(msg) {
    const el = document.createElement("div"); el.className = "toast"; el.textContent = msg;
    document.body.appendChild(el); setTimeout(() => el.remove(), 3200);
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  return {UFN, SW, load, getJSON, rowsOf, price, descontoFn, brl, pct, mm, esc, dataBR, COLS, PRESETS, value, slug, toast, store};
})();
