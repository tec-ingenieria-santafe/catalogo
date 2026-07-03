# Guia de imagenes

Esta carpeta centraliza las imagenes editables del sitio. Para cambiar una imagen sin tocar codigo ni JSON, reemplaza el archivo manteniendo exactamente el mismo nombre y extension.

## Estructura

- `carreras/`: imagenes cover y secciones organizadas por programa.
- `proyectos/`: thumbnails o fotos de proyectos estudiantiles.
- `socios/`: fotos o imagenes de interaccion con socios formadores.
- `universidades/`: imagenes de universidades o campus internacionales.
- `exatecs/`: fotos de perfiles EXATEC.
- `catalyst/`: imagenes de actividades CATALYST.
- `vivencia/`: imagenes de experiencias generales del campus.

## Tamaños recomendados

- Carreras cover y secciones: 1600 x 1000 px, horizontal.
- Proyectos: 1200 x 800 px, horizontal.
- Socios formadores: 1200 x 800 px, horizontal.
- Universidades: 1400 x 900 px, horizontal.
- EXATECs: 900 x 900 px, cuadrada.
- CATALYST actividades: 1200 x 800 px, horizontal.
- Vivencia: 1600 x 1000 px, horizontal.

## Imagenes por carrera

Cada carrera tiene su propia carpeta dentro de `carreras/`. Esa carpeta contiene un archivo para el hero superior y cinco archivos para las fichas de seccion:

- `cover.jpg`: hero/banner y tarjeta principal de la carrera.
- `proyectos.jpg`: ficha Proyectos de estudiantes.
- `socios.jpg`: ficha Socios formadores.
- `universidades.jpg`: ficha Universidades extranjeras.
- `exatecs.jpg`: ficha EXATECs destacados.
- `santafe.jpg`: ficha Por que estudiar esta carrera en Santa Fe.

Carpetas de carreras:

- `carreras/mecanica/`
- `carreras/mecatronica/`
- `carreras/industrial/`
- `carreras/civil/`
- `carreras/sustentable/`
- `carreras/innovacion/`
- `carreras/computacionales/`
- `carreras/transformacion-digital/`

Ejemplo para Mecatronica:

- `assets/images/carreras/mecatronica/cover.jpg`
- `assets/images/carreras/mecatronica/proyectos.jpg`
- `assets/images/carreras/mecatronica/socios.jpg`
- `assets/images/carreras/mecatronica/universidades.jpg`
- `assets/images/carreras/mecatronica/exatecs.jpg`
- `assets/images/carreras/mecatronica/santafe.jpg`

## Imagenes de CATALYST

CATALYST tambien tiene su propia carpeta:

- `carreras/catalyst/cover.jpg`: hero/banner y tarjeta principal.
- `carreras/catalyst/proyectos.jpg`: ficha Proyectos y experiencias.
- `carreras/catalyst/actividades.jpg`: ficha Actividades y comunidad.
- `carreras/catalyst/testimonios.jpg`: ficha Testimonios de estudiantes.
- `carreras/catalyst/comunidad.jpg`: imagen de comunidad CATALYST.

## Imagenes de Vivencia

La pagina global de Vivencia usa imagenes dentro de `vivencia/`:

- `vivencia/bootcamps.jpg`: Bootcamps.
- `vivencia/certificaciones.jpg`: Certificaciones.
- `vivencia/arte-cultura.jpg`: Arte y cultura.
- `vivencia/deportes.jpg`: Deportes.
- `vivencia/premios.jpg`: Premios.
- `vivencia/grupo-estudiantil.jpg`: Grupo estudiantil.
- `vivencia/escuderia.jpg`: Escuderia.
- `vivencia/biblioteca.jpg`: Biblioteca.

## Formato recomendado

- Usa `.jpg` para fotografias.
- Usa `.png` solo si necesitas transparencia o graficos con texto muy fino.
- Mantén cada archivo por debajo de 500 KB cuando sea posible.
- Usa nombres en minusculas, sin espacios y con guiones.

## Como reemplazar imagenes

1. Prepara la nueva imagen con el tamaño recomendado.
2. Renombrala exactamente igual que el archivo que quieres reemplazar.
3. Copiala en la misma carpeta, sobrescribiendo el archivo anterior.
4. Recarga el sitio en el navegador.

Ejemplo: para cambiar la imagen principal de Mecatronica, reemplaza:

`assets/images/carreras/mecatronica/cover.jpg`

Si conservas ese nombre, la app mostrara automaticamente la nueva imagen porque los JSON apuntan a esa ruta estable.
