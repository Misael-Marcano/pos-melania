# GitHub Pages — sitio estático del frontend

Publica la **landing**, páginas legales (`/terminos`, `/privacidad`, `/solicitar-demo`) y el resto de rutas del frontend como **HTML estático**. No sustituye un despliegue con API (Docker, VPS, etc.): **login, panel y ventas necesitan el backend** en otra URL.

## URL publicada

Tras el primer despliegue exitoso:

`https://<usuario-github>.github.io/pos-melania/`

(Ejemplo: `https://misael-marcano.github.io/pos-melania/`)

## Activación (una vez por repositorio)

1. Sube el workflow `.github/workflows/github-pages.yml` a la rama `main`.
2. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Espera a que termine el workflow **GitHub Pages** en la pestaña Actions.
4. Abre la URL que muestra el job **Deploy to GitHub Pages**.

## Despliegue automático

Cada **push a `main`** vuelve a generar el sitio (`GITHUB_PAGES=1`, `output: 'export'`, `basePath` = `/<nombre-repo>`).

Despliegue manual: **Actions → GitHub Pages → Run workflow**.

## Build local

```powershell
cd apps\frontend
$env:GITHUB_PAGES = "1"
$env:GITHUB_REPOSITORY = "usuario/pos-melania"
npm run build
# Salida: apps\frontend\out\
npx --yes serve out -p 3456
# Abrir http://localhost:3456/pos-melania/
```

## Limitaciones

| En Pages | Requiere despliegue completo |
|----------|------------------------------|
| Landing, FAQ, planes (UI) | API Express + SQL Server |
| Términos / privacidad / demo (UI) | Login JWT, sesiones |
| Vista estática de rutas del panel | Stripe, webhooks, Redis |

Para producción del producto use `docker-compose`, `DEPLOY-LAN-UN-PC.md` o su hosting habitual.

## Variables en CI

El workflow fija `NEXT_PUBLIC_API_URL` a un host inválido a propósito: evita llamadas accidentales a `localhost` desde el navegador del visitante. Cuando tenga API pública, puede añadir un **environment** de GitHub con la URL real solo si necesita probar login contra staging desde Pages (no recomendado para visitantes).

## Contacto en landing

En CI se usan los defaults de `next.config.js` (`NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_CONTACT_WHATSAPP`). Para personalizarlos en Pages, añada esas variables al job **Build frontend** en `github-pages.yml`.
