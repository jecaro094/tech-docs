# PLAN.md — Extraer el editor a `md-editor` y consumirlo como dependencia

> **Nota de numeración.** Los comentarios del código actual citan un roadmap
> anterior (`Fase 2, point 13`, `Fase 3, point 18`…) que describía la
> construcción del visor y del editor split-view dentro de este repo. Ese
> roadmap está implementado y no se reproduce aquí. Las fases de **este**
> documento son las de la extracción y se numeran **E0–E5** para que no se
> confundan con aquéllas.

## Objetivo

1. Sacar el editor Markdown de este repo a un repo propio, `md-editor`.
2. Convertirlo en un editor **inline** — preview y edición en el mismo panel,
   al estilo de Notion — en lugar del split-view actual.
3. Volver a consumirlo aquí como dependencia para editar los `.md` de
   `DOCS_DIR`.

## Decisiones fijadas

| Eje | Decisión |
|---|---|
| Motor | CodeMirror 6 + decoraciones de live preview (fuente de verdad = Markdown) |
| Forma | Librería TS vanilla + adaptadores; `tech-docs` conserva sus rutas y el acceso a `DOCS_DIR` |
| Pipeline | Se muda al paquete; `astro.config.mjs` lo importa desde ahí |
| Consumo | Dependencia git + `npm link` en local |

## Decisión pendiente (con recomendación)

**¿Quién renderiza los bloques del preview inline?** El split-view actual
renderiza en servidor (`/api/preview`), pero el modo inline necesita renderizar
**bloque a bloque** mientras se escribe.

- El paquete define una interfaz `Renderer { render(md): Promise<string> }` y
  trae dos implementaciones: `remoteRenderer(url)` (POST a un endpoint) y
  `localRenderer()` (el mismo pipeline remark/rehype + Shiki en *fine-grained
  bundle* dentro del cliente, ~150–300 kB gz).
- **En `tech-docs` se usa el remoto**: preserva la invariante byte-a-byte con la
  build estática y no engorda el bundle. El local existe para el demo del
  paquete y para consumidores sin backend.
- Extra en `/api/preview`: aceptar `{ blocks: string[] }` además de
  `{ content }`, para renderizar N bloques en una sola petición.

---

## Repo nuevo: `md-editor`

```
src/
  markdown/        splitFrontmatter, remarkAdmonitions, rehypeCodeFrame,
                   remarkPlugins, rehypePlugins, shikiTheme, renderMarkdown
                   ← entrypoint SIN DOM ni CodeMirror (lo importa astro.config)
  core/            mountEditor(), estado dirty, toasts, barra, atajos
  inline/          extensión CodeMirror de live preview (el trabajo nuevo)
  adapters/        remoteRenderer, localRenderer, httpStorage
  styles/          editor.css (chrome) · inline.css (decoraciones) · doc.css (prosa + admonitions)
demo/              Vite standalone, sin backend, con localRenderer
```

### Export map

Clave para que Astro pueda importar el pipeline sin arrastrar CodeMirror:

```json
"exports": {
  ".":                   "./dist/index.js",
  "./markdown":          "./dist/markdown.js",
  "./adapters/http":     "./dist/adapters/http.js",
  "./styles/editor.css": "./dist/styles/editor.css",
  "./styles/doc.css":    "./dist/styles/doc.css"
}
```

Build con `tsup` + `"prepare": "tsup"`, para que
`github:usuario/md-editor#v0.1.0` funcione sin publicar en npm. CodeMirror va
como dependencia normal (no *peer*): el consumidor instala una sola cosa.

### API pública propuesta

```ts
const editor = mountEditor(el, {
  value: raw,                     // .md completo, frontmatter incluido
  mode: 'inline',                 // 'inline' | 'split' | 'source'
  renderer: remoteRenderer('/api/preview'),
  onSave: (content) => fetch('/api/save', ...),
  onDirtyChange: (dirty) => ...,
});
// editor.getValue() / setValue() / isDirty() / setMode() / destroy()
```

`doc.css` usa `var(--fg, #e6e6e6)` con *fallbacks*, así funciona standalone y
hereda los tokens de `global.css` cuando lo consume `tech-docs`. El HTML de los
widgets se inyecta dentro de un contenedor `.doc`, con lo que el modo inline
hereda exactamente los estilos de la página publicada.

---

## Fases

### Fase E0 — Scaffolding y contratos

Repo nuevo, `tsup`, tsconfig strict, export map, tipos `Renderer` /
`EditorOptions` / `EditorHandle`, demo Vite vacío. Sin lógica todavía.

**Control:** `npm pack` produce un tarball con los cuatro subpaths resolubles.

### Fase E1 — Mudanza del pipeline (paridad 1:1, cero cambios de comportamiento)

`src/lib/markdown.ts` se copia tal cual al paquete. Aquí: `npm link`,
`astro.config.mjs` y las dos rutas API importan de
`@…/md-editor/markdown`, y se borra el fichero local. `content.css` se parte: la
prosa y las admonitions se van a `doc.css` del paquete; `.doc-back` y lo
específico del sitio se quedan.

**Control:** guardar `dist/` antes, rebuild, `diff -r` vacío.

### Fase E2 — Mudanza del editor actual como `mode: 'split'`

Todo el `<script>` de `edit.astro` (CodeMirror, debounce de ~200 ms, dirty flag,
toasts, `wireCopyButtons`, toggle de preview, snippets `:::`) pasa a `core/`.
`editor.css` se muda. Aquí queda un `edit.astro` de ~50 líneas: guard de DEV,
`resolveDocPath` + `fs.readFile`, render inicial y `mountEditor`.

**Control:** paridad funcional manual — editar, `Mod-S`, toggle, YAML inválido →
422, slug con `..` → 400.

> `resolveDocPath`, el guard `import.meta.env.DEV` y el acceso a disco **no se
> mudan**: el paquete nunca toca el filesystem, así el consumidor conserva la
> frontera de seguridad.

### Fase E3 — Modo inline (el trabajo real)

Un `ViewPlugin` que recorre `syntaxTree` sobre `view.visibleRanges` y produce un
`DecorationSet`:

1. **Sintaxis inline, sin HTML** — `Decoration.mark` para `ATXHeading1..6`,
   `StrongEmphasis`, `Emphasis`, `InlineCode`, `Link`, `Strikethrough`;
   `Decoration.replace` sobre los nodos marcadores (`HeaderMark`,
   `EmphasisMark`, `CodeMark`, `LinkMark`, `QuoteMark`), revelados cuando la
   selección toca esa línea. Es la regla «cursor dentro → fuente cruda; fuera →
   renderizado». Barato y síncrono.
2. **Widgets de bloque** — `Decoration.replace({ widget, block: true })` para
   `FencedCode` (Shiki), `Table`, imagen sola, `HorizontalRule` y los bloques
   `:::`. Asíncrono contra el `Renderer`, con caché `Map<hash(bloque), html>` y
   *fallback* al texto fuente mientras llega. `atomicRanges` para la navegación
   con flechas; un click en un widget devuelve el cursor a la fuente.
3. **Parser Lezer para `:::`** — `@lezer/markdown` no conoce las directivas de
   contenedor; hay que añadir un `MarkdownConfig` con `defineNodes` +
   `parseBlock` (~100 líneas). Es la pieza con más riesgo de la fase.
4. **Slash menu `/`** — sustituye y amplía el autocompletado `:::` actual:
   encabezados, lista, tabla, fence y las cinco admonitions.
5. **Atajos** — `Mod-B`, `Mod-I`, `Mod-K` (link sobre la selección) y pegado de
   URL sobre texto seleccionado.

**Límite honesto:** esto da edición inline al estilo de Obsidian Live Preview,
no bloques arrastrables con *handle* como Notion. Los drag handles se pueden
añadir después como *gutter markers*, pero no entran en esta fase.

**Riesgo conocido:** renderizar bloque a bloque puede divergir del render del
documento completo (definiciones de link `[a]: url`, numeración de listas).
Mitigación: sólo se convierten en widget los bloques autocontenidos; el resto va
por decoraciones de sintaxis.

### Fase E4 — Release y consumo por tag

README con la API, demo desplegable, `v0.1.0`. Aquí se sustituye el `npm link`
por `"@…/md-editor": "github:…#v0.1.0"`, dejando documentado el flujo de link
para iterar en local.

### Fase E5 — Limpieza en `tech-docs`

Quitar de `package.json` las dependencias de CodeMirror/remark que ya aporta el
paquete, actualizar `CLAUDE.md` (las secciones «Markdown pipeline» y «El editor»
pasan a describir una dependencia), y revisar el chunk muerto de CodeMirror en
la build.

---

## Cuestiones abiertas menores

1. **Nombre y scope del paquete** — se asume `@jecaro/md-editor` en un repo
   `md-editor`; pendiente de confirmar.
2. **Licencia** — MIT por defecto si el repo es público.
3. **¿Se mantiene `mode: 'split'`?** Recomendado que sí, como toggle en la
   barra: es la red de seguridad mientras el modo inline madura.
