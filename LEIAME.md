# Tabela de Preço NMC GART — site no GitHub

## Quem acessa o quê

| Perfil | O que faz | Como entra |
|---|---|---|
| **Representantes e clientes** | Consultam a **tabela oficial** e baixam em Excel ou PDF | Link público (`index.html`), sem senha |
| **Supervisores** | Criam tabelas especiais com desconto e baixam em Excel/PDF para o cliente. Cada um vê **só as tabelas que criou** | `especiais.html` + token pessoal |
| **Administração (Ziza)** | Vê **todas** as tabelas especiais; faz reajuste, título e revisão da tabela oficial | `admin.html` e `especiais.html` + token |

Por isso o projeto usa **dois repositórios**:

- **`tabela-preco` (público)** — o site e a tabela oficial (`produtos.json`, `config.json`). Qualquer pessoa com o link vê.
- **`tabela-preco-especiais` (privado)** — as tabelas especiais. Só quem tem acesso ao repositório consegue abrir. Elas **não** ficam no site público.

Conteúdo do pacote:

| Arquivo | Vai para |
|---|---|
| `index.html`, `admin.html`, `especiais.html`, `app.css`, `common.js`, `app.js`, `admin.js`, `especiais.js`, `produtos.json`, `config.json`, `LEIAME.md` | repositório **público** `tabela-preco` (todos soltos na raiz, sem pastas) |
| `repositorio-privado/acesso.json` e `repositorio-privado/LEIAME.md` | repositório **privado** `tabela-preco-especiais` (na raiz, sem a pasta `repositorio-privado`) |

---

## 1. Criar a organização (uma vez só)

A organização permite que cada supervisor use a própria conta do GitHub, com um token só para o repositório privado. É gratuita.

1. Entre em **github.com** com a sua conta (ou crie em *Sign up*).
2. Clique na sua foto → **Your organizations** → **New organization** → plano **Free**.
   - Nome sugerido: `nmc-gart`. E-mail: o seu.
3. Na organização: **Settings → Personal access tokens → Settings** → em *Fine-grained personal access tokens*, marque **Allow access via fine-grained personal access tokens**. (Se marcar "Require administrator approval", você aprova cada token de supervisor.)

## 2. Criar o repositório público e publicar o site

1. Na organização: **New repository** → nome `tabela-preco` → **Public** → **Create repository**.
2. **uploading an existing file** (Fazer upload de arquivos) → selecione **todos os 11 arquivos** desta pasta e arraste juntos → **Commit changes**. Não há pastas: tudo fica solto na raiz. Confira se os nomes ficaram exatamente `index.html`, `admin.html`, `especiais.html` (sem "[1]" ou "(1)").
3. **Settings → Pages** → *Source*: **Deploy from a branch** → *Branch*: **main**, pasta **/ (root)** → **Save**.
4. Em 1 a 2 minutos o endereço aparece: `https://nmc-gart.github.io/tabela-preco/`

Links:
- Tabela oficial (enviar a representantes e clientes): `https://nmc-gart.github.io/tabela-preco/`
- Tabelas especiais (só supervisores e administração): `https://nmc-gart.github.io/tabela-preco/especiais.html`
- Administração: `https://nmc-gart.github.io/tabela-preco/admin.html`

## 3. Criar o repositório privado das tabelas especiais

1. Na organização: **New repository** → nome `tabela-preco-especiais` → **Private** → **Create repository**.
2. Antes de enviar, abra `repositorio-privado/acesso.json` num editor de texto (Bloco de Notas) e ajuste:
   - `admins`: o seu usuário do GitHub (ex.: `["ziza-gart"]`).
   - `supervisores`: o usuário do GitHub de cada supervisor e o nome que aparece na tabela.
3. Envie `acesso.json` e `LEIAME.md` (da pasta `repositorio-privado`) para a **raiz** do repositório privado.

A pasta `especiais/` é criada sozinha quando a primeira tabela especial for salva.

## 4. Dar acesso aos supervisores

Para cada supervisor:

1. Ele cria uma conta gratuita no GitHub e te passa o usuário.
2. Na organização: **People → Invite member** → convide o usuário (papel *Member*).
3. No repositório `tabela-preco-especiais`: **Settings → Collaborators and teams → Add people** → o usuário → papel **Write**.
4. Entre em `especiais.html` com o seu token e, no quadro **Gerenciar acessos** (só a administração vê), digite o usuário do GitHub e o nome do supervisor → **Adicionar**. A página grava o `acesso.json` sozinha e confere se o usuário existe no GitHub.
5. O supervisor cria o token dele (passo 5, escolhendo **só** o repositório `tabela-preco-especiais`).

Para tirar o acesso de alguém: no quadro **Gerenciar acessos**, clique em **Remover** (duas vezes, para confirmar) e remova a pessoa da organização no GitHub. As tabelas que ela criou continuam visíveis para a administração.

## 5. Criar o token (a "senha")

Cada pessoa cria o próprio token:

1. Foto → **Settings** → **Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Preencha:
   - *Token name*: `tabela de preço`
   - *Resource owner*: a organização **nmc-gart**
   - *Expiration*: 1 ano (ou o prazo que preferir)
   - *Repository access*: **Only select repositories**
     - **Administração**: `tabela-preco` e `tabela-preco-especiais`
     - **Supervisor**: só `tabela-preco-especiais`
   - *Permissions → Repository permissions → Contents*: **Read and write**
3. **Generate token** e copie (começa com `github_pat_`). Ele só aparece uma vez — guarde em local seguro.

Token vazou? Em *Fine-grained tokens*, apague e gere outro.

## 6. Usar as tabelas especiais (supervisores e administração)

1. Abra `especiais.html`, preencha a organização (`nmc-gart`), o repositório (`tabela-preco-especiais`) e o seu token → **Entrar**.
2. Em **Nova tabela especial**: título (ex.: "Tabela especial – Cliente XXXX"), cliente, validade, desconto geral e/ou por família → **Salvar tabela especial**.
3. A tabela já fica selecionada embaixo: escolha **Canal** e **UF**, as **Colunas**, e clique em **Baixar Excel** ou **Baixar PDF** para enviar ao cliente.
4. Em **Minhas tabelas especiais** você pode ver/baixar, editar ou excluir. A administração vê a lista de todos, com o nome de quem criou.

O desconto é calculado sobre a tabela oficial do momento: se houver reajuste, as tabelas especiais acompanham. IPI e ST são calculados sobre o preço com desconto; Suframa (AM) depois.

## 7. Administração da tabela oficial

1. Abra `admin.html`, preencha organização (`nmc-gart`), repositório (`tabela-preco`), branch (`main`) e o seu token → **Entrar**.
2. **Título e revisão** — ex.: "Tabela de Preço Nacional 2027", "Rev. 02", vigência.
3. **Reajuste por família** — % por família (ou o mesmo % para todas), confira a prévia e **Aplicar reajuste**.
4. Clique em **Salvar no GitHub**. O site atualiza em 1 a 2 minutos.

Sem token: faça as alterações, clique em **Baixar arquivos alterados** e envie para o repositório público, substituindo os arquivos com o mesmo nome.

Tudo fica no **Histórico** e o GitHub guarda as versões anteriores de cada arquivo.

## 8. Regras de cálculo

- **Revenda:** a UF define a coluna de preço (ICMS 18%, 12% ou 7%). No AM, desconto Suframa (fator 0,9075). IPI e ST conforme a categoria do produto e a UF.
- **Construtora:** preço único com ICMS cheio de 18% incluso, sem DIFAL à parte e sem ST.
- **Preço c/ impostos** = preço tabela + IPI + ST.

## 9. Quando o Formulário de Orçamento mudar

Envie o formulário atualizado ao Claude no projeto "Tabela de preço NMC GART – Nacional". Ele gera um novo `produtos.json` (e o Excel) para enviar ao repositório público, substituindo o antigo. Se você fez reajuste pelo site, atualize os preços no formulário antes (ou peça ao Claude para aplicar o mesmo percentual).

## 10. Bom saber

- A separação entre supervisores é feita pela página: cada um só vê as próprias tabelas. Quem tem acesso ao repositório privado ainda conseguiria abrir os arquivos direto no GitHub. Se precisar de separação total, dá para usar um repositório privado por supervisor — peça ao Claude para adaptar.
- Representantes e clientes não precisam de conta nem senha.
- As colunas escolhidas ficam lembradas no navegador de cada pessoa.
- Endereço próprio (ex.: `tabela.gart.com.br`): *Settings → Pages → Custom domain*.
