# Gerador de Comprovantes de Rematrícula

Aplicação da secretaria da **Escola Municipal Walda Miranda de Paiva** para pesquisar um aluno, conferir seus dados e emitir o comprovante da Prefeitura Municipal de Formosa.

## Primeiro uso

1. Extraia o ZIP em uma pasta. Abra o arquivo `index.html` no Chrome ou no Edge, ou acesse o endereço publicado pela escola.
2. Clique em **Importar CSV**. Para experimentar, escolha `exemplos/dados-ficticios.csv`, que contém cinco cadastros criados para demonstração.
3. Confira o resumo e clique em **Voltar à emissão**. Pesquise pelo nome, por parte dele ou pela matrícula. Use as setas e **Enter** para selecionar.
4. Na ficha, alterne entre **Dados do aluno**, **Endereço** e **Rematrícula**. A pré-visualização acompanha cada alteração. No celular, use **Pré-visualização** para conferir a folha, salvar o PDF ou imprimir.
5. Clique em **Imprimir**. Para gerar um arquivo, clique em **Salvar em PDF** e escolha o destino PDF na janela do navegador. Para continuar o atendimento, use **Ctrl + K**.

A operação diária dispensa instalação. Com o site já aberto, importação, edição, exportação e impressão funcionam sem conexão. Para iniciar uma sessão sem internet, use a pasta extraída.

## Publicar no GitHub Pages

1. Crie ou abra o repositório da escola com permissão para configurar Pages.
2. Coloque o **conteúdo extraído** na raiz da ramificação escolhida. O arquivo `index.html` deve ficar nessa raiz, junto às pastas `css`, `js`, `vendor`, `assets` e `exemplos`. Inclua `.gitignore` e `.nojekyll`.
3. Revise os arquivos que serão enviados. O único CSV destinado ao repositório é `exemplos/dados-ficticios.csv`. Mantenha a base real, as exportações e os comprovantes emitidos fora da pasta do projeto.
4. Em **Settings → Pages**, escolha **Deploy from a branch**, selecione a ramificação, por exemplo `main`, e a pasta **/(root)**. Salve.
5. Quando o GitHub indicar que o site está publicado, abra o endereço mostrado em Pages. Importe o CSV fictício e emita um PDF de conferência.

Os caminhos relativos permitem publicar no endereço de um projeto, como `https://organizacao.github.io/repositorio/`. A publicação usa arquivos estáticos. A configuração de Pages depende das permissões e do plano do repositório. [Documentação do GitHub Pages](https://docs.github.com/pt/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Base compartilhada na rede da escola

1. Coloque o gerador em um servidor acessível apenas pela rede interna da escola. Abra o endereço interno do gerador nos computadores da secretaria.
2. Na pasta do servidor onde está o `index.html`, coloque o CSV da escola com o nome `base-secretaria.csv`. Ao abrir o endereço, o gerador carrega esse arquivo automaticamente. Para atualizar a base, substitua o arquivo no servidor e recarregue a página em cada computador.
3. Deixe **Lembrar a base neste computador** desmarcado para receber a versão do servidor a cada abertura. Se já houver uma cópia lembrada no navegador, exporte as alterações que deseja guardar, desmarque essa opção e recarregue a página.

As edições no gerador ficam no navegador. Para compartilhar uma atualização, exporte o CSV e substitua o arquivo no servidor. **Importar CSV** continua disponível para abrir outro arquivo na sessão atual.

Use CSVs fictícios para testar o carregamento no GitHub Pages público. O arquivo da escola fica no servidor interno, pois qualquer visitante do site público pode baixar os arquivos publicados.

## Cadastros e busca

A importação reconhece os 26 nomes de coluna e aceita que estejam em outra ordem. O arquivo precisa usar ponto e vírgula, com os campos entre aspas quando contêm o separador, aspas ou quebras de linha. O leitor aceita UTF-8 com ou sem BOM e, como alternativa, Windows-1252. Um arquivo incompatível gera uma mensagem e preserva a sessão anterior.

Cada linha recebe um identificador independente. Nomes iguais, matrículas ausentes e registros desativados continuam disponíveis. As buscas ignoram acentos e diferenças entre maiúsculas e minúsculas. Os botões **Aluno anterior** e **Próximo aluno** percorrem os resultados da consulta e dos filtros atuais. Limpe a busca para percorrer todos os alunos visíveis.

O filtro inicial mostra os cadastros sem data de desativação. **Filtros** permite escolher série, turma, composição de ensino, situação no livro e data de desativação. Para pesquisar todos, marque **Incluir alunos desativados**. Selecionar uma data de desativação também ativa essa opção.

Em **Base de dados**, os totais têm estes significados.

- **Possíveis duplicidades** conta as linhas que compartilham nome normalizado ou matrícula preenchida com outra linha. Uma linha que atende aos dois critérios é contada uma vez.
- **Cadastros incompletos** conta as linhas com ausência de dados cadastrais utilizados na ficha, como matrícula, nascimento, responsável, endereço ou telefone. Telefone e celular da mãe são alternativas. Campos operacionais da rematrícula ficam fora desse indicador.
- **Sem desativação** indica que a coluna de data de desativação está vazia. A situação no livro é exibida separadamente, conforme o CSV.

## Edição e integridade dos dados

**Alterar somente o comprovante** é o modo inicial. Edite os dados do aluno e imprima. O código, a data e a hora do cadastro são automáticos. A legenda identifica campos automáticos, vazios e editados. A troca de aluno ou a criação de um **Novo** comprovante pede confirmação quando há alterações a descartar. Um comprovante iniciado em branco pode ser preenchido e impresso.

**Salvar na base local** grava, após confirmação, os campos exibidos no cadastro selecionado, incluindo padrões e data do comprovante. **Exportar CSV** baixa uma cópia dos cadastros salvos. Para incluir uma alteração feita na ficha, salve-a na base antes de exportar.

**Restaurar originais** recupera na ficha os valores da importação atual, inclusive campos vazios. A ação também está disponível após salvar o cadastro. Para confirmar uma restauração na base, clique em **Salvar na base local**. Uma nova importação passa a ser a referência das próximas restaurações.

- A data do comprovante recebe a data local do computador quando estiver vazia e não houver padrão definido. A data e a hora do cadastro acompanham o relógio local do computador e são atualizadas ao imprimir e ao confirmar a gravação do cadastro. A data da matrícula anterior continua em sua própria coluna.
- O código de rematrícula é sempre **2**, tanto no cabeçalho quanto na última seção. Essa regra vale inclusive ao restaurar um cadastro antigo.
- Nos telefones da mãe, do responsável e da residência, digite os algarismos. A ficha e o comprovante aplicam a máscara de telefone fixo ou celular. Números com oito ou nove dígitos aparecem sem DDD. Para acrescentar o DDD, coloque o cursor no início e digite os dois algarismos. Letras são descartadas também ao colar texto.
- Quando falta o telefone da mãe, a ficha usa o celular disponível. Com dois números, o seletor permite escolher qual imprimir. Ao editar esse número e salvar, o sistema atualiza a coluna de origem escolhida e preserva a outra. A preferência de exibição vale para o comprovante atual.
- O nome e o telefone do responsável vêm de suas próprias colunas. **Copiar mãe para responsável** é uma ação explícita e pede confirmação se já houver dados do responsável.
- As seis colunas auxiliares são preservadas na exportação. O celular da mãe também serve como alternativa ao telefone impresso.

### Configurações e armazenamento

Em **Configurações**, defina os padrões de unidade, cidade, estado, composição e data do comprovante. Um padrão em branco é ignorado. A regra inicial só preenche campos vazios. O modo de substituição pede confirmação e passa a valer nos comprovantes. Para atualizar também os cadastros carregados, marque a opção correspondente e confira a quantidade informada na confirmação.

A sessão começa em memória. Fechar ou recarregar a página encerra essa sessão. Para guardar as alterações em arquivo, use **Exportar CSV**. Com autorização da escola, **Lembrar a base neste computador** grava os cadastros atuais, os originais importados e as configurações em IndexedDB. O rascunho de um comprovante é temporário. Use um perfil de navegador reservado à secretaria. Abra a base em uma aba por vez para facilitar a conferência de edições.

Desativar a opção de lembrar remove a cópia persistente e mantém a sessão aberta. **Base de dados → Limpar base de dados** apaga os cadastros, os originais, os padrões e o rascunho deste aplicativo no perfil atual. Gerencie separadamente os CSVs e PDFs baixados. O navegador pode bloquear a persistência no modo privado ou ao abrir um arquivo local.

### Colunas reconhecidas e exportadas

| Nº | Cabeçalho | Uso |
|---:|---|---|
| 1 | Nome do aluno | Nome |
| 2 | Matrícula | Matrícula |
| 3 | Data de nascimento | Nascimento |
| 4 | Série atual | Série |
| 5 | Turma | Busca e filtro |
| 6 | Unidade de ensino | Unidade |
| 7 | Composição de ensino | Composição e filtro |
| 8 | Nome da mãe | Mãe |
| 9 | Telefone da mãe | Telefone da mãe |
| 10 | Celular da mãe | Telefone alternativo |
| 11 | Nome do responsável | Responsável |
| 12 | Telefone do responsável | Telefone do responsável |
| 13 | Endereço | Endereço |
| 14 | Bairro | Bairro |
| 15 | CEP | CEP |
| 16 | Estado | Estado |
| 17 | Cidade | Cidade |
| 18 | Telefone residencial | Telefone no endereço |
| 19 | Código da rematrícula | Código no cabeçalho e na última seção |
| 20 | Data do cadastro | Data do cadastro da rematrícula |
| 21 | Hora do cadastro | Hora do cadastro da rematrícula |
| 22 | Data do comprovante | Data na última linha |
| 23 | Situação no livro | Identificação e filtro |
| 24 | Data da matrícula | Histórico cadastral |
| 25 | Data de desativação | Identificação e filtro |
| 26 | Cruzamento dos relatórios | Histórico da importação |

A exportação usa a ordem acima, ponto e vírgula, UTF-8 com BOM e campos textuais para preservar os zeros à esquerda. Células que uma planilha pode interpretar como fórmula recebem um apóstrofo de proteção na cópia exportada. Ao abrir no Excel, importe as colunas de matrícula, CEP e telefones como **Texto** para o próprio Excel preservar os zeros.

## Impressão

O desenho usa o logotipo extraído do Word e as medidas da página exportada pelo Microsoft Word. Os rótulos, as fontes, as três barras, a linha de assinatura, a numeração e o rodapé seguem essa referência. O texto permanece selecionável no PDF.

Use **A4**, orientação **retrato**, escala **100%** e desative os cabeçalhos e rodapés adicionados pelo navegador, caso estejam ativados. Os controles de zoom ajustam apenas a visualização em tela. Nomes e endereços longos ocupam linhas adicionais. A assinatura acompanha a altura da tabela e o rodapé mantém sua posição. Caso um texto excepcional exceda a área de uma página, a ficha sinaliza o campo de trabalho para revisão e bloqueia a emissão até que o conteúdo caiba.

| Atalho | Ação |
|---|---|
| Ctrl + K | Abrir e focar a pesquisa |
| ↑ e ↓ | Navegar nos resultados com a pesquisa em foco |
| Enter | Selecionar o resultado destacado |
| Esc | Fechar a janela, a lista ou os filtros |
| Ctrl + P | Imprimir o comprovante |

## Privacidade

O navegador lê o arquivo escolhido. A aplicação não envia cadastros pela rede, não registra dados pessoais no console e não se conecta ao Prodata. Os arquivos reais da escola ficam fora do repositório. O link do exemplo aponta para um arquivo local do próprio site. Os textos importados são inseridos como nós de texto ou valores de campos.

O `.gitignore` ignora CSVs, exceto o exemplo fictício, e também documentos e PDFs. A exclusão do Git se aplica a arquivos ainda não rastreados. Confira também os uploads feitos pela interface web do GitHub.

## Arquivos e manutenção

| Arquivo ou pasta | Finalidade |
|---|---|
| `index.html` | Interface, diálogos e estrutura da página |
| `css/style.css` e `css/print.css` | Tela e impressão |
| `js/app.js` | Fluxo de emissão, edição, padrões e controles |
| `js/csv.js` | Esquema, importação e exportação |
| `js/search.js` | Busca, indicadores e filtros |
| `js/storage.js` | Persistência em IndexedDB e controle de gravações concorrentes |
| `js/document.js` | Rótulos e coordenadas do comprovante, em pontos da referência |
| `assets/logo.png` | Imagem institucional extraída do DOCX |
| `vendor/` | Papa Parse 5.5.3 e sua licença MIT |
| `exemplos/` | Base fictícia com cinco registros |
| `testes/` | Suíte opcional para o mantenedor, independente do site |

Para atualizar a aplicação, preserve os caminhos relativos e publique os arquivos alterados na mesma ramificação. Feche o atendimento em andamento, exporte a base se necessário e recarregue o site depois da publicação. Mudanças no CSV exigem revisar o esquema, os índices de mapeamento, os filtros, a exportação e os testes. Para alterar o modelo institucional, use o novo Word aprovado, confira sua exportação em PDF e compare o comprovante em A4.

### Verificação pelo mantenedor

A suíte exercita a interface no Chromium com dados fictícios. Inclui importação de 573 registros sintéticos, cabeçalhos reordenados e inválidos, pesquisa, homônimos, filtros, telefones alternativos, edição, cancelamento, restauração, exportação, padrões, IndexedDB, limpeza, impressão, modo sem rede, abertura local e largura de tela móvel. Ela grava os resultados em uma pasta temporária indicada no terminal.

Para repetir os testes em um ambiente de desenvolvimento com Node.js, execute na pasta `testes`:

```sh
npm install
npx playwright install chromium
npm test
```

A variável opcional `CHROME_PATH` permite usar um Chrome já instalado. As dependências de teste são exclusivas do mantenedor. Para conferir a impressão manualmente, emita o exemplo, selecione A4 e verifique a página, a assinatura, o rodapé e a seleção do nome no PDF.

