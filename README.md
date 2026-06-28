# Serviço de Upload de Arquivos

Upload de arquivos seguro. O foco não foi guardar bytes — isso é fácil — e sim
fazer as partes que costumam virar buraco de segurança: validar o tipo pelos
**bytes reais** (não pela extensão nem pelo Content-Type), guardar com **nome
aleatório fora do webroot**, fazer streaming **sem carregar o arquivo em
memória**, e dar acesso temporário por **URL assinada**.

## Stack

- **Node + TypeScript** (ESM, modo estrito)
- **Fastify 5** + `@fastify/multipart` (upload em streaming)
- **Prisma 6 + PostgreSQL 16** (metadados)
- **Storage plugável**: filesystem local (dev) ou **S3/MinIO** (configurável)
- **`file-type`** para detecção por magic bytes, **`sharp`** para thumbnails
- **zod** na validação e como fonte do OpenAPI
- **Vitest** nos testes de integração
- **OpenAPI / Swagger UI** em `/docs`

## Endpoints

| Método | Rota                            | O que faz                       |
| ------ | ------------------------------- | ------------------------------- |
| POST   | `/v1/arquivos`                  | upload (único ou múltiplo)      |
| GET    | `/v1/arquivos/:id`              | metadados (só o dono)           |
| GET    | `/v1/arquivos/:id/conteudo`     | download (dono ou URL assinada) |
| GET    | `/v1/arquivos/:id/thumbnail`    | thumbnail webp (imagens)        |
| POST   | `/v1/arquivos/:id/url-assinada` | gera URL temporária (só o dono) |
| DELETE | `/v1/arquivos/:id`              | remove (só o dono)              |

A identidade do dono vem no header **`x-dono-id`** — assumo que um gateway de
autenticação à frente o coloca (auth de verdade é um projeto dedicado do
portfólio).

## Como rodar

Pré-requisitos: Node 20+ e Docker.

```bash
cp .env.example .env
docker compose up -d        # Postgres em 5436; MinIO em 9000/9001 (opcional)
npm install
npm run db:migrate          # aplica as migrations
npm run dev
```

A API sobe em `http://localhost:3336`, com a documentação em
`http://localhost:3336/docs` (JSON em `/docs.json`).

Por padrão o storage é **local** (`STORAGE_DIR`, fora de qualquer rota
estática). Para usar S3/MinIO, ajuste no `.env`: `STORAGE_DRIVER=s3` e as
variáveis `S3_*` (o MinIO do `docker-compose` já sobe com credenciais de dev).

### Testes

```bash
npm test
```

Integração de verdade: batem em Postgres (`upload_test`) e no filesystem. Entre
cada teste a tabela é truncada e o diretório de storage de teste é limpo.

## Segurança do upload — o ponto central (item 6 do checklist)

- **Tipo por magic bytes, não por extensão/Content-Type.** Leio só os primeiros
  ~4 KB do stream, detecto o tipo real com `file-type` e comparo com uma
  allowlist. Um `.png` que na verdade é um ZIP (ou texto) é recusado com 415,
  mesmo que a extensão e o `Content-Type` digam o contrário. Tem teste pra esse
  "magic byte falso".
- **Streaming, sem buffer.** O arquivo nunca é carregado inteiro em memória: leio
  o cabeçalho pra validar e o resto segue direto pro storage. (Ler o cabeçalho
  sem destruir o stream exigiu cuidado — `for await` com `break` destruiria o
  resto, então leio via `read()` em modo paused.)
- **Nome aleatório.** A chave no storage é aleatória (com sharding por prefixo); o
  **nome original do cliente vira só metadado**, nunca toca o disco. Isso evita
  colisão e path traversal pelo nome.
- **Fora do webroot.** O storage local fica num diretório que **não é servido
  estaticamente** — todo acesso passa por endpoint com checagem. O caminho ainda
  é validado contra path traversal (defesa em profundidade).
- **Limite de tamanho.** O multipart trunca no limite; se truncou, apago o parcial
  e respondo 413.

## Outras decisões

- **Storage atrás de uma interface.** `salvar/ler/remover/existe` com duas
  implementações (local e S3). O resto do código não sabe qual está ativa. O S3
  usa `lib-storage` (upload multipart em streaming).
- **URLs assinadas.** HMAC de `(id|expira)` com segredo do `.env`, comparação
  timing-safe e checagem de validade. Funciona igual pro local e pro S3, e dá
  acesso temporário sem precisar ser o dono.
- **Thumbnails best-effort.** Imagens ganham uma thumbnail webp (`sharp`). Se o
  `sharp` não decodificar um arquivo estranho, o upload não falha — só fica sem
  thumbnail.

## Estrutura

```
src/
  modules/arquivos/  upload, download, thumbnail, metadados/permissão
  shared/
    erros/    hierarquia de erro
    hash/     argon2id (senha — reservado para extensões)
    http/     erro central, header de dono
    storage/  interface + local (anti path traversal) + S3/MinIO
    upload/   leitura de cabeçalho + allowlist por magic bytes
    url/      URL assinada (HMAC)
    openapi/  documento gerado dos schemas zod
  app.ts      monta o Fastify (testável via inject)
  server.ts   sobe a porta
prisma/       schema + migrations
tests/        integração + unidade
```

## Segurança — checklist

- **Magic bytes + limite de tamanho + nome aleatório + fora do webroot** (acima).
- **Validação no servidor** com zod em toda entrada.
- **Permissão no download** (dono via header ou URL assinada com expiração).
- **Rate limit** no upload.
- **Segredos em `.env`** (`ASSINATURA_SECRET`, `DATABASE_URL`, `S3_*`), com
  `.env.example` versionado e `.env` no `.gitignore`.
- **Cabeçalhos de segurança** com helmet (CSP afrouxada só no `/docs`).
- **Zero SQL concatenado** — Prisma parametriza tudo.

## Backup

Backup é o Postgres (metadados) **e** o storage (os arquivos em si) — os dois
precisam ser salvos juntos, ou um aponta para o que o outro não tem.

```bash
# metadados
docker exec upload-postgres pg_dump -U upload -d upload -F c -f /tmp/upload.dump
docker cp upload-postgres:/tmp/upload.dump ./backups/upload-$(date +%F).dump

# storage local
tar czf ./backups/storage-$(date +%F).tar.gz ./dados-upload
```

Com S3/MinIO, o backup do storage é o do próprio bucket (versionamento +
replicação). Em produção eu rodaria os dois num cron diário, com retenção e
cópia para fora.
