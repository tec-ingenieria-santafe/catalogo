# Catalogo de Ingenieria Campus Santa Fe

Sitio estatico tipo catalogo para programas de Ingenieria del Tecnologico de Monterrey Campus Santa Fe.

URL de publicacion esperada:

`https://tec-ingenieria-santafe.github.io/catalogo/`

Repositorio:

`https://github.com/tec-ingenieria-santafe/catalogo`

## Estructura

```text
/index.html
/assets
/data
/js
/styles
/README.md
```

## Correr localmente

Desde la raiz del proyecto:

```bash
python -m http.server 8000
```

Abrir:

`http://localhost:8000/`

No abras `index.html` directamente como archivo local, porque el navegador puede bloquear la carga de archivos JSON.

## Publicar en GitHub Pages

1. Sube esta estructura a la rama principal del repositorio `catalogo`.
2. En GitHub, entra a `Settings > Pages`.
3. En `Build and deployment`, selecciona `Deploy from a branch`.
4. Selecciona la rama principal y la carpeta `/root`.
5. Guarda los cambios.
6. Revisa el sitio en `https://tec-ingenieria-santafe.github.io/catalogo/`.

Todas las rutas son relativas para funcionar tanto en local como desde la subruta `/catalogo/`.

## Librerias externas

El mapa interactivo de `Experiencias en el extranjero` usa `jsVectorMap`. La libreria esta incluida localmente en:

- `assets/vendor/jsvectormap/jsvectormap.min.css`
- `assets/vendor/jsvectormap/jsvectormap.min.js`
- `assets/vendor/jsvectormap/world.js`

No requiere backend ni API Key y funciona con rutas relativas en local y GitHub Pages.

## Actualizar JSON

Los datos editables estan en:

- `data/site.json`
- `data/carreras.json`
- `data/proyectos.json`
- `data/socios.json`
- `data/universidades.json`
- `data/exatecs.json`
- `data/catalyst.json`
- `data/vivencia.json`

Edita estos archivos con UTF-8 y conserva JSON valido.

## Usar el panel admin

Abrir:

`http://localhost:8000/#admin`

En GitHub Pages:

`https://tec-ingenieria-santafe.github.io/catalogo/#admin`

Tambien existe `admin/index.html`, que redirige a `../index.html#admin`.

El admin es estatico: no escribe directamente en archivos JSON. El flujo correcto es:

1. Cargar los datos actuales.
2. Editar o agregar registros en el formulario.
3. Revisar el JSON generado.
4. Descargar el JSON actualizado.
5. Reemplazar manualmente el archivo correspondiente dentro de `data`.
6. Subir el cambio a GitHub.

El panel permite editar proyectos, socios formadores, experiencias en el extranjero, Empleabilidad, actividades CATALYST y Vivencia.

## Reemplazar imagenes

Las imagenes publicas viven en `assets/images`.

Para reemplazar una imagen sin tocar codigo:

1. Usa el mismo nombre de archivo.
2. Usa la misma carpeta.
3. Sobrescribe la imagen anterior.
4. Recarga el sitio.

La guia de tamanos y nombres esta en:

`assets/images/README.md`

## Favicon

El favicon usa:

- `assets/favicon.ico`
- `assets/favicon.png`
- `assets/apple-touch-icon.png`

Si Chrome sigue mostrando el icono anterior con la letra `I`, recarga con `Ctrl + F5`. Si persiste, limpia la cache del navegador o abre el sitio con una cadena nueva, por ejemplo `index.html?v=2`.

## Subir cambios a GitHub

```bash
git status
git add .
git commit -m "Actualiza catalogo"
git push origin main
```

Despues del push, GitHub Pages puede tardar unos minutos en reflejar los cambios.

## Agregar colaboradores

1. Entra al repositorio en GitHub.
2. Abre `Settings > Collaborators and teams`.
3. Selecciona `Add people`.
4. Agrega el usuario o correo.
5. Asigna permisos segun el rol del colaborador.

## Repositorio privado de contenido

Existira otro repositorio privado llamado:

`contenido`

Ese repositorio servira para guardar material fuente que no debe publicarse directamente en el catalogo:

- videos originales
- fotos originales
- logos editables
- documentos de apoyo
- archivos de diseno
- material interno o pesado

El repositorio `catalogo` debe contener solo los archivos necesarios para publicar el sitio estatico.
