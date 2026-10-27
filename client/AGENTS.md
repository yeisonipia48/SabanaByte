# AGENTS.md

## Contexto
- SabanaByte: portal de citas médicas / EPS. SPA en `client/` con React 19, Vite 8, TypeScript 6 y Tailwind CSS v4.
- Sin backend ni router: `src/App.tsx` renderiza directamente la página pública de login (`src/features/auth`).
- El alcance funcional está en `formulacion del proyectoo.pdf` (raíz). `client/README.md` es boilerplate de Vite; no lo uses como fuente.
- UI en español; archivos, identificadores y clases en inglés.

## Regla obligatoria: usar Context7 siempre
- Antes de usar o modificar APIs de React, Tailwind, Vite, lucide-react o cualquier librería, consulta Context7 primero:
  `tools.context7["resolve-library-id"]` y luego `tools.context7["query-docs"]`.
- No asumas APIs de memoria ni copies ejemplos de versiones anteriores.

## Comandos
- No hay `package.json` en la raíz. Ejecuta desde `client/` o con `pnpm --dir client <script>`; `pnpm dev` en la raíz falla.
- `pnpm --dir client dev` — servidor Vite.
- `pnpm --dir client build` — `tsc -b && vite build`; es la única verificación de tipos.
- `pnpm --dir client lint` — ESLint (flat config).
- `pnpm --dir client preview` — sirve `dist/` (requiere build previo).
- Verificación mínima antes de entregar: `build` + `lint`. No hay tests ni CI; no inventes comandos de test.
- Usa pnpm (`pnpm-lock.yaml`), no npm ni yarn.

## Arquitectura
- `src/features/auth/` contiene el login público:
  - `authService.ts` simula el login (900 ms). Es el único punto para conectar la API real; no añadas endpoints ni `fetch` en componentes.
  - `LoginForm.tsx` concentra estado y validación; `types.ts` define `Role` y los contratos de login.
- Tailwind v4 es CSS-first en `src/index.css` (`@theme`, `@plugin`, `@utility`). No hay `tailwind.config.*`: no reintroduzcas el CDN ni crees configs paralelas.
- Iconos con `lucide-react`, nunca con el CDN de lucide. Imágenes locales en `src/assets`; no vuelvas a enlazar URLs de Stitch.
- Persistencia de UI en `localStorage` con la clave `sabanaByte.login.remember`.

## Convenciones de UI
- Estilo institucional "enterprise": **sin bordes redondeados** (evita `rounded-*`), bordes de 1 px y énfasis con franjas laterales.
- Excepción aprobada: el panel del formulario (`#login-panel` en `LoginForm.tsx`) lleva `rounded-[30px]`, borde `sky-800` de 2 px y borde superior de 4 px.
- Paleta `sky`/`slate`, marca "SabanaByte", tipografía Plus Jakarta Sans (Google Fonts en `index.html`).
- Login full-bleed de 12 columnas: hero 5 columnas en `lg+` + formulario 7. En móvil usa `MobileBrandBanner` y oculta el hero.
- Mantén el formulario sin scroll de página a 1440×900 y con scroll interno (`login-scroll`) en pantallas bajas.
- Accesibilidad: labels asociados, `aria-invalid`/`aria-describedby`, `aria-live`, foco visible y controles operables con teclado.

## TypeScript y lint
- Activos: `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` y `erasableSyntaxOnly`. Usa `import type` y no dejes variables/parámetros sin usar: rompen `build`.
- `tsc -b` usa referencias (`tsconfig.app.json`, `tsconfig.node.json`).
- ESLint incluye `eslint-plugin-react-refresh`: los archivos de componentes deben exportar componentes/hooks compatibles con Fast Refresh.
