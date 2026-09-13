# PLAN-CI-CD.md — Despliegue de `tech-docs` en GitHub Pages

Plan de implementación para llevar este repo a
**https://jecaro094.github.io/tech-docs**, replicando el modelo de CI/CD que ya
usa `Src/github/portfolio`: *push a `main` → solo CI; tag `v*` → build + deploy +
release*.

Estado de partida (13-09-2026, rama `main`, commit `7f75e22`):

- Los `.md` **ya están commiteados** bajo `docs/` (decisión tomada: el contenido
  vive en este repo; se abandona la premisa "zero .md committed here" de
  `CLAUDE.md`). `DOCS_DIR=./docs`.
- El editor se bloquea hoy con `import.meta.env.DEV`, que es `false` en cualquier
  `astro build` — incluido `npm run preview` en local.
- `astro.config.mjs` tiene `site: 'https://tech-docs.local'` y **no** tiene `base`.
- La ruta de un doc es `src/pages/tech-docs/[...slug].astro`.

Decisiones ya cerradas con el usuario:

1. El contenido se commitea en este repo (opción 1 de las barajadas).
2. Las URLs de doc cuelgan directamente de la base: la ruta se mueve a
   `src/pages/[...slug].astro` para que quede
   `jecaro094.github.io/tech-docs/<slug>` y no `/tech-docs/tech-docs/<slug>`.

---

## Fase 1 — Interruptor del editor (`ENABLE_EDITOR`)

**Objetivo**: que el editor siga disponible en `npm run dev` sin configurar nada,
que se pueda encender a mano en un build local para depurar, y que el sitio
publicado por Actions sea de solo lectura. Calco de
`portfolio/src/lib/editor-enabled.ts`.

### 1.1 Declarar la variable en `astro.config.mjs`

```js
import { defineConfig, envField } from 'astro/config';

export default defineConfig({
  // …
  env: {
    schema: {
      ENABLE_EDITOR: envField.boolean({
        context: 'server',
        access: 'public',
        default: false,
      }),
    },
  },
});
```

### 1.2 Nuevo `src/lib/editor-enabled.ts`

```ts
import { ENABLE_EDITOR } from 'astro:env/server';

/**
 * El editor (enlace "Edit", `/editor/**`, `/api/preview`, `/api/save`) está
 * activo bajo `astro dev` sin configurar nada. Un build solo lo expone si
 * `ENABLE_EDITOR` es explícitamente `true`; por defecto es `false`, así que el
 * sitio publicado en Pages queda de solo lectura.
 */
export const EDITOR_ENABLED = ENABLE_EDITOR || import.meta.env.DEV;
```

### 1.3 Sustituir los cuatro guardas existentes

| Fichero | Cambio |
| --- | --- |
| `src/layouts/Layout.astro:19` | `const showEdit = EDITOR_ENABLED && Boolean(editSlug);` |
| `src/pages/api/preview.ts:30` | `if (!EDITOR_ENABLED) return new Response('Not found', { status: 404 });` |
| `src/pages/api/save.ts:28` | `if (!EDITOR_ENABLED) return json({ error: … }, 403);` |
| `src/pages/tech-docs/[...slug]/edit.astro:20` | `if (!EDITOR_ENABLED) return new Response(…, { status: 404 });` |

El orden de los guardas en `/api/save` no cambia: primero el interruptor, luego
`resolveDocPath`, luego el 404 de "no existe", luego el 422 de YAML.

### 1.4 `.env.example`

```
# Ruta al directorio con los .md. Vive dentro del repo desde que el contenido
# se commitea aquí.
DOCS_DIR=./docs

# "true" expone el editor desde un build no-dev (p.ej. `npm run build && npm run
# preview`). Sin definir → el editor solo existe bajo `npm run dev`.
# El build de GitHub Pages debe quedarse en "false".
ENABLE_EDITOR=false
```

> **Nota de seguridad**: el interruptor es *defensa en profundidad*, no la única
> barrera. Aunque alguien pusiera `ENABLE_EDITOR=true` en el build de Pages, el
> artefacto que se publica es estático (`dist/client`): `/api/save` no existe
> como endpoint ejecutable en Pages, así que no hay escritura posible. La
> protección real es que Pages no ejecuta el adaptador Node.

---

## Fase 2 — `base: '/tech-docs'` y reestructura de rutas

Este es el bloque con más superficie de cambio y el que más fácil rompe en
silencio: Astro **no** prefija automáticamente los `href` escritos a mano en las
plantillas. Solo prefija los assets que pasan por el bundler.

### 2.1 `astro.config.mjs`

```js
site: 'https://jecaro094.github.io',
base: '/tech-docs',
```

`base` también aplica en `astro dev`, así que en local el sitio pasa a servirse
en `http://localhost:4321/tech-docs/`. Es deseable: dev y producción comparten
forma de URL y no hay sorpresas solo-en-prod.

### 2.2 Mover la ruta del doc

```
src/pages/tech-docs/[...slug].astro   →  src/pages/[...slug].astro
```

`getStaticPaths()` no cambia (`params.slug = doc.id`). El import de `Layout`
pasa de `../../layouts/Layout.astro` a `../layouts/Layout.astro`.

`src/pages/index.astro` y `src/pages/[...slug].astro` conviven sin problema:
el rest param solo genera las rutas que devuelve `getStaticPaths`, e `index.astro`
gana por ser estática.

### 2.3 Mover la ruta del editor a `/editor/**`

```
src/pages/tech-docs/[...slug]/edit.astro  →  src/pages/editor/[...slug].astro
```

Dos razones:

1. Deja de haber ambigüedad entre `[...slug].astro` (que capturaría
   `mi-doc/edit` como slug) y `[...slug]/edit.astro`. Astro resolvería a favor
   del segmento estático, pero es una sutileza que no merece la pena arrastrar.
2. Alinea con `portfolio`, que ya usa `/editor/**`.

Los imports relativos bajan un nivel (`../../lib/docs`, `../../styles/global.css`).
El `onSave` del `mountEditor` sigue apuntando a `/api/save` **prefijado con la
base** (ver 2.4).

### 2.4 Helper de base y repaso de todos los enlaces absolutos

Crear `src/lib/url.ts`:

```ts
/**
 * Prefija una ruta absoluta del sitio con `base`. `import.meta.env.BASE_URL`
 * incluye siempre la barra final ('/tech-docs/'), así que la ruta que se pasa
 * NO debe empezar por '/'.
 */
export function withBase(path = ''): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}
```

Enlaces a corregir (todos hoy rotos bajo `base`):

| Fichero | Línea | Hoy | Debe ser |
| --- | --- | --- | --- |
| `src/layouts/Layout.astro` | brand | `href="/"` | `href={withBase()}` |
| `src/layouts/Layout.astro` | nav | `href="/#docs"` | `href={withBase('#docs')}` |
| `src/layouts/Layout.astro` | favicon | `href="/favicon.svg"` | `href={withBase('favicon.svg')}` |
| `src/layouts/Layout.astro` | edit link | `/tech-docs/${editSlug}/edit` | `withBase(\`editor/${editSlug}\`)` |
| `src/pages/index.astro` | tarjetas | `/tech-docs/${doc.id}` | `withBase(doc.id)` |
| `src/pages/[...slug].astro` | volver | `href="/"` | `href={withBase()}` |
| `src/pages/editor/[...slug].astro` | `mountEditor` | `'/api/preview'`, `'/api/save'` | `withBase('api/preview')`, `withBase('api/save')` |

Los `href={`#${item.slug}`}` del índice de la página (TOC) son anclas relativas
y **no** se tocan.

### 2.5 Imágenes referenciadas desde los `.md`

`docs/Others/pokeapi.md:14` tiene `![PokeAPI logo](/docs/PokeAPI.webp)`, que bajo
`base` apunta fuera del sitio. Es la única ocurrencia hoy.

**Decisión: reescribir la ruta en el Markdown** a `/tech-docs/docs/PokeAPI.webp`,
y documentar esa convención en `CLAUDE.md`.

La alternativa (un plugin rehype en `astro.config.mjs` que prefije `BASE_URL` a
todo `src` que empiece por `/`) se descarta a propósito: el preview del editor
llama a `renderMarkdown()` del paquete `@jecaro/md-editor`, que no vería ese
plugin, y preview y página publicada divergirían — exactamente lo que la
arquitectura actual se esfuerza en evitar. Coste de la decisión: si algún día
cambia `base`, hay que pasar un `sed` por los `.md`.

### 2.6 Colisión de nombres `docs/`

Ojo a que ahora conviven dos cosas llamadas `docs`:

- `docs/` en la raíz del repo → el contenido Markdown (`DOCS_DIR`), **no** se
  publica como tal.
- `public/docs/` → las imágenes, que se sirven en `/tech-docs/docs/*`.

No hay conflicto técnico (una es fuente, la otra es estático servido), pero
conviene dejarlo escrito en `CLAUDE.md` para no confundirlas al mantener.

---

## Fase 3 — El workflow

Crear `.github/workflows/deploy.yml`, calcado del de `portfolio` con dos
diferencias: se añade `DOCS_DIR` al entorno de build, y `fetch-depth` por defecto
basta porque el contenido está en el propio repo.

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
    tags: ['v*']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  # Push a main: solo valida que compila. No publica nada.
  ci:
    if: github.ref_type == 'branch'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 21
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          DOCS_DIR: ./docs
          ENABLE_EDITOR: ${{ vars.ENABLE_EDITOR || 'false' }}

  build:
    if: github.ref_type == 'tag' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 21
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          DOCS_DIR: ./docs
          ENABLE_EDITOR: ${{ vars.ENABLE_EDITOR || 'false' }}
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          # El adaptador Node parte el build en dist/client (el sitio
          # prerenderizado) y dist/server (solo lo usan las rutas del editor).
          # Pages sirve la mitad client.
          path: dist/client

  deploy:
    needs: build
    if: github.ref_type == 'tag' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4

  release:
    needs: deploy
    if: github.ref_type == 'tag'
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
```

### 3.1 Por qué `DOCS_DIR` va explícito en el workflow

`astro.config.mjs` usa `loadEnv(mode, cwd, '')`, que lee `.env` / `.env.local` —
**no** `.env.example`. En el runner no hay `.env` (está gitignoreado), así que sin
esta variable `content.config.ts` lanzaría
`"DOCS_DIR is not set"` y el build fallaría. Pasarla por `env:` mantiene el
`throw` como red de seguridad en local y deja la configuración de CI a la vista.

> Alternativa descartada: poner un fallback `?? './docs'` en `astro.config.mjs`.
> Funcionaría, pero convierte un fallo ruidoso en uno silencioso (un `DOCS_DIR`
> mal escrito construiría un sitio vacío en vez de romper).

---

## Fase 4 — Configuración en GitHub (manual, una sola vez)

1. **Settings → Pages → Build and deployment → Source: `GitHub Actions`**.
   Sin esto, `deploy-pages` falla con un error de entorno poco descriptivo.
2. **Settings → Environments → `github-pages`**: si tiene *deployment branch
   rules*, hay que permitir tags (o dejarlo sin restricción), o el job `deploy`
   se queda bloqueado esperando aprobación en un push de tag.
3. Opcional: **Settings → Secrets and variables → Actions → Variables** →
   `ENABLE_EDITOR` solo si algún día se quisiera forzar (no debería hacer falta;
   el `|| 'false'` del workflow ya cubre el caso de que no exista).
4. `@jecaro/md-editor` es un repo **público**, así que `npm ci` lo resuelve sin
   token. Si alguna vez pasara a privado, habría que añadir un PAT y reescribir
   la URL del lockfile, o publicarlo en un registry.

---

## Fase 5 — Verificación

### Local, antes de tocar nada remoto

```sh
npm run dev
#   → http://localhost:4321/tech-docs/   (ojo: ahora con base)
#   → el enlace "Edit" aparece y /tech-docs/editor/<slug> abre el editor
#   → guardar un doc sigue escribiendo en docs/

npm run build && npm run preview
#   → el enlace "Edit" NO aparece
#   → /tech-docs/editor/<slug> devuelve 404
#   → POST /tech-docs/api/save devuelve 403
#   → grep -r 'href="/' dist/client/index.html   ← no debe salir nada sin prefijo
```

Comprobación de rutas del artefacto:

```sh
find dist/client -name '*.html' | sort
# Esperado: index.html + un <slug>/index.html por doc.
# NO debe existir dist/client/tech-docs/  (eso sería la URL duplicada).
```

### Remoto

1. Push a `main` → debe correr **solo** el job `ci`, en verde, sin desplegar.
2. `git tag v0.1.0 && git push origin v0.1.0` → `build` → `deploy` → `release`.
3. Abrir `https://jecaro094.github.io/tech-docs/` y verificar:
   - el índice lista los docs y el buscador filtra;
   - un doc abre, el TOC ancla bien, la imagen de PokeAPI carga;
   - no hay enlace "Edit";
   - `…/tech-docs/editor/others/pokeapi` da 404 de Pages.

---

## Riesgos y puntos de atención

| Riesgo | Mitigación |
| --- | --- |
| Enlaces absolutos olvidados → 404 solo en producción | `base` aplica también en `astro dev`, así que se detectan en local. Rematar con el `grep` de la Fase 5. |
| `npm ci` falla porque el `prepare` de `@jecaro/md-editor` no construye en el runner | El job `ci` en cada push a `main` lo detecta antes de que exista un tag. Si diera guerra, fijar la versión de Node a la misma que se usa en local. |
| El `github-pages` environment bloquea deploys desde tags | Fase 4, punto 2. |
| El chunk del editor (~650 kB) se sigue emitiendo en `dist/client/_astro/` | Sin cambios: es peso muerto que ninguna página referencia. Ya está razonado en `CLAUDE.md`. |
| `portfolio` y `tech-docs` comparten el mismo `github-pages` de la cuenta | No colisionan: `portfolio` es el *user page* (raíz) y `tech-docs` un *project page* (`/tech-docs`), cada uno con su propio environment de repo. |

---

## Documentación a actualizar al cerrar

- **`CLAUDE.md`**:
  - "What this is": los `.md` ya **no** viven fuera del repo; `DOCS_DIR=./docs`.
  - Nueva sección de despliegue (tag → Pages) y del interruptor `ENABLE_EDITOR`.
  - Rutas nuevas: `/<slug>` para el doc, `/editor/<slug>` para el editor.
  - La convención de imágenes con la base incluida y la nota sobre los dos `docs/`.
- **`README.md`**: URL pública y cómo publicar (`git tag vX.Y.Z && git push --tags`).
- **`PLAN.md`**: añadir esta fase de CI/CD como continuación de las Fases E0–E5.

---

## Orden de ejecución sugerido

1. Fase 1 completa (editor gating) → `npm run build && npm run preview`, comprobar
   que el editor desaparece. **Commit.**
2. Fase 2.1–2.3 (base + mover rutas) → `npm run dev`, comprobar que todo carga en
   `/tech-docs/`. **Commit.**
3. Fase 2.4–2.6 (enlaces e imágenes) → repasar el sitio entero a mano. **Commit.**
4. Fase 3 (workflow) → push a `main`, ver el job `ci` en verde. **Commit.**
5. Fase 4 (ajustes en GitHub).
6. Primer tag `v0.1.0` y verificación de la Fase 5.
7. Fase de documentación. **Commit.**
