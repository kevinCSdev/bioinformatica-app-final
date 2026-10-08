# Cómo sumar el aporte de tu grupo

Esta versión ya integra los trabajos de Cata-Anto, Benja-Javi y Kevin-Ian. Si
tu grupo aún no está, sigue estos pasos para agregar lo que tu versión tiene y
esta no.

## 1. Revisa qué falta

Lee la tabla "Origen de cada aporte" del [README](README.md) y compárala con
tu versión. Solo vale la pena portar lo que **no** esté ya (por ejemplo,
"Calcular Final", la ejecución automática y la validación ya existen).

## 2. Trabaja en una rama

    git checkout -b grupo-<nombres>

Una rama por grupo evita que dos grupos se pisen. Al terminar, abre un Pull
Request hacia `main`.

## 3. Dónde poner el código

| Si tu aporte es... | Va en... |
|---|---|
| Un algoritmo o cambio en el cálculo | `js/core/AlignmentEngine.js` (sin tocar el DOM) |
| Lógica pura (tablas, validaciones, utilidades) | Un archivo nuevo en `js/core/` |
| Algo que se dibuja o se muestra | Un archivo nuevo en `js/ui/` |
| Un botón o control nuevo | `index.html` y su evento en `js/main.js` |
| Estilos | `css/components.css` |

No uses jQuery ni variables globales: la base usa módulos ES6 (`import`/`export`).
Si tu versión estaba hecha sobre la base original con jQuery, porta la idea y
no copies el archivo tal cual.

## 4. Prueba antes de subir

    python -m http.server 8000
    npm test

`npm test` tiene que terminar sin errores. Si agregas lógica en `js/core/`,
agrega también una prueba en `tests/` (puedes copiar el estilo de
`tests/validacion.spec.js`) y súmala al script `test` de `package.json`.

## 5. Documenta

Agrega una fila a la tabla "Origen de cada aporte" del README con el nombre de
tu grupo y los archivos que tocaste. Si algo de tu versión no se incorporó,
anótalo en "Aportes no incorporados" con el motivo.

## Ideas pendientes

- Gaps afines (algoritmo de Gotoh), con pestañas para las tres matrices.
- Más matrices de sustitución (PAM250, BLOSUM45) en `js/core/`.
- Modo oscuro.
