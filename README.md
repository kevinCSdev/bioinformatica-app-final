# App-Alineamiento — Versión integrada

Laboratorio 2 de Bioinformática, Universidad del Bío-Bío.

Visualizador interactivo de alineamiento de secuencias por programación
dinámica. Une el trabajo de varios grupos del curso en una sola aplicación y
agrega mejoras nuevas. Los grupos que aún no se han integrado pueden sumar sus
aportes siguiendo [CONTRIBUIR.md](CONTRIBUIR.md).

## Ejecución

La aplicación usa módulos ES6, por lo que debe servirse por HTTP (no funciona
abriendo `index.html` con doble clic):

    python -m http.server 8000

Abrir http://localhost:8000

## Catálogo de aminoácidos

Pulsa **Catálogo de aminoácidos** en el encabezado para consultar los 20
aminoácidos estándar, en cualquier tipo de secuencia. Busca por letra, código,
nombre o categoría, sin distinguir mayúsculas ni acentos. Usa **Cerrar** o
**Escape** para volver al botón; cada apertura reinicia la búsqueda.
El catálogo es de solo lectura y no cambia el alineamiento.

## Ayuda y metodología

Pulsa **Ayuda y metodología**, junto al catálogo, para consultar conceptos,
los cuatro algoritmos, puntuación, un ejemplo NW de A/G, métricas y controles.
El índice permite saltar a cada sección sin salir de la aplicación.
**Volver al laboratorio** conserva entradas, matriz, resultados y pestaña,
y devuelve el foco al botón de ayuda. Abrir la ayuda pausa la ejecución
automática; volver no la reanuda. Los atajos de ejecución no actúan en la ayuda.

La regresión determinista se ejecuta con `node tests/help-ui.spec.js` y también
forma parte de `npm test`. Simula la presentación y usa el estado y motor reales;
no sustituye la comprobación de navegación, foco y diseño en un navegador.

## Pruebas

Requieren Node.js 18 o superior:

    npm test

Ejecuta las pruebas del motor, de la máquina de estados, de la interfaz, de
BLOSUM62, de la validación y del oráculo canónico (90 aserciones contra
los resultados canónicos en `tests/oraculo/`).

## Funcionalidades

- Cuatro algoritmos: Needleman-Wunsch (global), Smith-Waterman (local),
  Wagner-Fischer (distancia de edición) y LCS.
- Vista interactiva de matriz de puntos (**Dotplot**) por pestañas con ventana deslizante, umbral de coincidencia y superposición del camino óptimo.
- Avance y retroceso paso a paso, ejecución automática con velocidad
  ajustable y cálculo instantáneo.
- Desglose matemático de cada celda con la fórmula renderizada en KaTeX.
- Todos los caminos óptimos, con navegación entre ellos y métricas: puntaje,
  % de identidad, coincidencias, discrepancias y gaps.
- Tipo de secuencia: ADN/ARN, proteína con puntaje simple o proteína con
  matriz **BLOSUM62**.
- Validación de la entrada con avisos claros y bloqueo de controles.
- Exportación a CSV (matriz y alineamientos) y a PNG (imagen de la matriz DP o del Dotplot).
- Nueve ejemplos precargados, zoom y desplazamiento sobre la matriz y atajos
  de teclado (Espacio, ← y →).

## Origen de cada aporte

| Aporte | Grupo | Archivos principales |
|---|---|---|
| **Base de la aplicación**: arquitectura modular ES6, motor de alineamiento, máquina de estados, renderizado D3 reactivo | Kevin-Ian | `js/core/AlignmentEngine.js`, `js/state/AppState.js`, `js/ui/D3Renderer.js` |
| Wagner-Fischer (distancia de edición) y LCS | Kevin-Ian | `js/core/AlignmentEngine.js` |
| Panel matemático con KaTeX y panel de resultados con métricas y múltiples caminos | Kevin-Ian | `js/ui/MathPanel.js`, `js/ui/SummaryPanel.js` |
| Ejemplos precargados, botones +/− en los parámetros, atajos de teclado | Kevin-Ian | `index.html`, `js/main.js` |
| Suite de pruebas y oráculo canónico | Kevin-Ian | `tests/`, `docs/casos-de-prueba.md` |
| Ejecución automática paso a paso | Kevin-Ian y Benja-Javi (ambos la propusieron; se conserva la de Kevin-Ian porque además permite ajustar la velocidad) | `js/state/AppState.js` |
| Validación de la entrada (vacíos, alfabeto, largo, parámetros no numéricos) con avisos y bloqueo de controles | Cata-Anto, con la idea de validar caracteres biológicos de Benja-Javi | `js/core/Validacion.js`, `js/main.js` |
| Exportación CSV y PNG | Cata-Anto | `js/ui/Exportador.js` |
| Etiquetas y atributos de accesibilidad (`aria-label`, `role`, `aria-hidden`) | Cata-Anto | `index.html` |
| **Nuevo:** matriz BLOSUM62 y selector de tipo de secuencia (ADN/ARN o proteína) | Integración | `js/core/Blosum62.js`, `js/core/Validacion.js` |
| **Nuevo:** validación adaptada a cada algoritmo y tipo de secuencia (aminoácidos, costos no negativos en distancia de edición, BLOSUM62 solo en NW/SW) | Integración | `js/core/Validacion.js` |
| **Nuevo:** pruebas de BLOSUM62 (400 valores y 4 alineamientos contra el oráculo canónico) y de la validación | Integración | `tests/blosum.spec.js`, `tests/validacion.spec.js` |
| **Nuevo:** Vista Dotplot interactiva con ventana deslizante, umbral, overlay del camino óptimo y exportación PNG | César (integrado) | `js/core/DotplotEngine.js`, `js/ui/DotplotView.js`, `tests/dotplot.spec.js` |

### Aportes no incorporados

| Aporte | Grupo | Motivo |
|---|---|---|
| Botón "Resolver Todo" | Benja-Javi | Equivalente a "Calcular Final" de la base |
| Botón "Completar" | Cata-Anto | Equivalente a "Calcular Final" de la base |
| Panel lateral con el detalle del cálculo | Cata-Anto | Lo reemplaza el panel matemático de Kevin-Ian, que muestra lo mismo y además la fórmula |
| `Dockerfile` | Benja-Javi | Es una plantilla PHP/Apache; la aplicación es estática y no usa PHP |
| Gaps afines (apertura + extensión, Gotoh) | Propuesta de Cata-Anto | Requiere tres matrices y rediseñar la visualización; queda como trabajo futuro |

## Estructura

```
index.html              Interfaz
css/                    Estilos (base, componentes, matriz)
js/main.js              Conexión entre la interfaz y el estado
js/core/                Lógica pura, sin DOM (motor, BLOSUM62, validación, tipos)
js/state/AppState.js    Máquina de estados: pasos, autoejecución, caminos
js/ui/                  Renderizado: matriz D3, panel matemático, resultados, exportación
tests/                  Pruebas automáticas (npm test)
docs/                   Casos de prueba documentados
```
