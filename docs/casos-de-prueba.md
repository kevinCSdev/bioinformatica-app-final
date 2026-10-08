# Suite de Casos de Prueba y Validación Biológica/Matemática
## Visualizador de Alineamiento de Secuencias (NW, SW, WF/ED, LCS)

Este documento establece la especificación formal, los fundamentos matemáticos/biológicos, las matrices completas de programación dinámica y las tablas de verificación oráculo para los 4 algoritmos principales implementados en la versión final del visualizador:
1. **Needleman-Wunsch (NW)**: Alineamiento Global.
2. **Smith-Waterman (SW)**: Alineamiento Local.
3. **Wagner-Fischer (Edit Distance - ED)**: Distancia de Edición (Levenshtein).
4. **Longest Common Subsequence (LCS)**: Subsecuencia Común más Larga.

---

## 1. Fundamentos Matemáticos y Reglas de Desempate (Tie-Breaking)

### 1.1 Fórmulas de Recurrencia

| Algoritmo | Tipo | Inicialización | Ecuación de Recurrencia | Puntuación Óptima |
| :--- | :--- | :--- | :--- | :--- |
| **Needleman-Wunsch** | Global (Max) | $D(i, 0) = i \cdot g$<br>$D(0, j) = j \cdot g$ | $D(i, j) = \max \begin{cases} D(i-1, j-1) + s(S_1[i], S_2[j]) \\ D(i-1, j) + g \\ D(i, j-1) + g \end{cases}$ | Celda $(n, m)$ |
| **Smith-Waterman** | Local (Max) | $H(i, 0) = 0$<br>$H(0, j) = 0$ | $H(i, j) = \max \begin{cases} 0 \\ H(i-1, j-1) + s(S_1[i], S_2[j]) \\ H(i-1, j) + g \\ H(i, j-1) + g \end{cases}$ | $\max_{i, j} H(i, j)$ |
| **Wagner-Fischer (ED)**| Global (Min) | $E(i, 0) = i \cdot c_{\text{del}}$<br>$E(0, j) = j \cdot c_{\text{ins}}$ | $E(i, j) = \min \begin{cases} E(i-1, j-1) + c_{\text{sub}} \\ E(i-1, j) + c_{\text{del}} \\ E(i, j-1) + c_{\text{ins}} \end{cases}$ | Celda $(n, m)$ |
| **LCS** | Subseq (Max) | $L(i, 0) = 0$<br>$L(0, j) = 0$ | $L(i, j) = \begin{cases} L(i-1, j-1) + 1 & \text{si } S_1[i]=S_2[j] \\ \max(L(i-1, j), L(i, j-1)) & \text{si } S_1[i] \neq S_2[j] \end{cases}$ | Celda $(n, m)$ |

*Parámetros Canónicos del Sistema:*
- **NW**: Match = $+1$, Mismatch = $-1$, Gap Penalty = $-2$.
- **SW**: Match = $+2$, Mismatch = $-1$, Gap Penalty = $-2$.
- **ED**: Match Cost = $0$, Substitution Cost = $1$, Indel Cost = $1$.
- **LCS**: Match = $+1$, Indel/Mismatch = $0$.

### 1.2 Convención Canónica de Desempate (Traceback Priority)
Cuando dos o más celdas predecesoras producen el mismo valor óptimo, el criterio determinista de traceback adoptado es:
$$\mathbf{Diagonal} \quad > \quad \mathbf{Superior\ (Up\ /\ Deletion)} \quad > \quad \mathbf{Lateral\ (Left\ /\ Insertion)}$$

- **Diagonal**: Consume un carácter de ambas secuencias (Match o Mismatch / Sustitución).
- **Superior (Up)**: Introduce un gap en la secuencia 2 (consume carácter de la secuencia 1: deleción en $S_2$).
- **Lateral (Left)**: Introduce un gap en la secuencia 1 (consume carácter de la secuencia 2: inserción en $S_1$).

---

## 2. Los 6 Casos de Prueba Canónicos

### Caso 1: Cadenas Idénticas (Identidad al 100%)
- **Secuencias**: $S_1 = \text{"AGTC"}$, $S_2 = \text{"AGTC"}$ ($|S_1| = 4, |S_2| = 4$)
- **Significado Biológico**: Homología perfecta, clones o copias génicas idénticas sin eventos mutacionales.

#### Matrices y Resultados

```
--- Needleman-Wunsch (Score = 4) ---
       -   A   G   T   C
  -    0  -2  -4  -6  -8
  A   -2   1  -1  -3  -5
  G   -4  -1   2   0  -2
  T   -6  -3   0   3   1
  C   -8  -5  -2   1   4
Alineamiento: S1: AGTC | S2: AGTC (Camino: Diagonal -> Diagonal -> Diagonal -> Diagonal)

--- Smith-Waterman (Score = 8) ---
       -   A   G   T   C
  -    0   0   0   0   0
  A    0   2   0   0   0
  G    0   0   4   2   0
  T    0   0   2   6   4
  C    0   0   0   4   8
Alineamiento: S1: AGTC | S2: AGTC (Local abarca la secuencia completa)

--- Wagner-Fischer ED (Distancia = 0) ---
       -   A   G   T   C
  -    0   1   2   3   4
  A    1   0   1   2   3
  G    2   1   0   1   2
  T    3   2   1   0   1
  C    4   3   2   1   0
Alineamiento: S1: AGTC | S2: AGTC (0 operaciones de edición)

--- Longest Common Subsequence LCS (Longitud = 4) ---
       -   A   G   T   C
  -    0   0   0   0   0
  A    0   1   1   1   1
  G    0   1   2   2   2
  T    0   1   2   3   3
  C    0   1   2   3   4
LCS: "AGTC"
```

---

### Caso 2: Sustitución Simple / Mismatch (SNP Puntual)
- **Secuencias**: $S_1 = \text{"AGTC"}$, $S_2 = \text{"AGAC"}$ ($T \rightarrow A$ en posición 3)
- **Significado Biológico**: Polimorfismo de nucleótido único (SNP / mutación puntual tipo transversión).

#### Matrices y Resultados

```
--- Needleman-Wunsch (Score = 2) ---
       -   A   G   A   C
  -    0  -2  -4  -6  -8
  A   -2   1  -1  -3  -5
  G   -4  -1   2   0  -2
  T   -6  -3   0   1  -1
  C   -8  -5  -2  -1   2
Alineamiento: S1: AGTC | S2: AGAC
Cálculo Celda Final (4,4): diag(-1)+match(C,C)=2 vs up(1)+gap(-2)=-1 vs left(-1)+gap(-2)=-3 => Max = 2.

--- Smith-Waterman (Score = 5) ---
       -   A   G   A   C
  -    0   0   0   0   0
  A    0   2   0   2   0
  G    0   0   4   2   1
  T    0   0   2   3   1
  C    0   0   0   1   5
Alineamiento: S1: AGTC | S2: AGAC (Score máximo en (4,4) = 5)

--- Wagner-Fischer ED (Distancia = 1) ---
       -   A   G   A   C
  -    0   1   2   3   4
  A    1   0   1   2   3
  G    2   1   0   1   2
  T    3   2   1   1   2
  C    4   3   2   2   1
Alineamiento: S1: AGTC | S2: AGAC (1 sustitución en posición 3)

--- Longest Common Subsequence LCS (Longitud = 3) ---
       -   A   G   A   C
  -    0   0   0   0   0
  A    0   1   1   1   1
  G    0   1   2   2   2
  T    0   1   2   2   2
  C    0   1   2   2   3
LCS: "AGC" (Elimina T en S1 y A en S2: alineamiento AG-TC / AGA-C)
```

---

### Caso 3: Inserciones/Deleciones Simples (Indel)
- **Secuencias**: $S_1 = \text{"AGTC"}$, $S_2 = \text{"AGC"}$ (Deleción de 'T' en $S_2$)
- **Significado Biológico**: Mutación indel que simula un corrimiento de marco o deleción de un nucleótido.

#### Matrices y Resultados

```
--- Needleman-Wunsch (Score = 1) ---
       -   A   G   C
  -    0  -2  -4  -6
  A   -2   1  -1  -3
  G   -4  -1   2   0
  T   -6  -3   0   1
  C   -8  -5  -2   1
Alineamiento: S1: AGTC | S2: AG-C (3 matches + 1 gap = 1 + 1 - 2 + 1 = 1)

--- Smith-Waterman (Score = 4) ---
       -   A   G   C
  -    0   0   0   0
  A    0   2   0   0
  G    0   0   4   2
  T    0   0   2   3
  C    0   0   0   4
Alineamiento: S1: AG | S2: AG (o AGTC / AG-C con score 4)

--- Wagner-Fischer ED (Distancia = 1) ---
       -   A   G   C
  -    0   1   2   3
  A    1   0   1   2
  G    2   1   0   1
  T    3   2   1   1
  C    4   3   2   1
Alineamiento: S1: AGTC | S2: AG-C (1 operación: eliminación de 'T')

--- Longest Common Subsequence LCS (Longitud = 3) ---
       -   A   G   C
  -    0   0   0   0
  A    0   1   1   1
  G    0   1   2   2
  T    0   1   2   2
  C    0   1   2   3
LCS: "AGC"
```

---

### Caso 4: Longitudes Asimétricas ($|S_1| \gg |S_2|$)
- **Secuencias**: $S_1 = \text{"ACGTACGT"}$, $S_2 = \text{"CG"}$ ($|S_1| = 8, |S_2| = 2$)
- **Significado Biológico**: Mapeo de primers/cebadores, búsqueda de motivos funcionales o alineamiento de lecturas cortas contra regiones genómicas amplias. Demuestra la divergencia fundamental entre alineamiento global y local.

#### Matrices y Resultados

```
--- Needleman-Wunsch (Score = -10) ---
       -   C   G
  -    0  -2  -4
  A   -2  -1  -3
  C   -4  -1  -2
  G   -6  -3   0
  T   -8  -5  -2
  A  -10  -7  -4
  C  -12  -9  -6
  G  -14 -11  -8
  T  -16 -13 -10
Alineamiento: S1: ACGTACGT | S2: -----CG- (Penalización masiva por 6 gaps terminales: 2 matches + 6 gaps = 2 - 12 = -10)

--- Smith-Waterman (Score = 4) ---
       -   C   G
  -    0   0   0
  A    0   0   0
  C    0   2   0
  G    0   0   4   <-- Pico local 1
  T    0   0   2
  A    0   0   0
  C    0   2   0
  G    0   0   4   <-- Pico local 2
  T    0   0   2
Alineamiento: S1: CG | S2: CG (Detecta la ocurrencia exacta sin penalizar gaps en los extremos; score óptimo = 4)

--- Wagner-Fischer ED (Distancia = 6) ---
       -   C   G
  -    0   1   2
  A    1   1   2
  C    2   1   2
  G    3   2   1
  T    4   3   2
  A    5   4   3
  C    6   5   4
  G    7   6   5
  T    8   7   6
Distancia: 6 eliminaciones requeridas para transformar S1 en S2.

--- Longest Common Subsequence LCS (Longitud = 2) ---
LCS: "CG"
```

---

### Caso 5: Cadenas Completamente Divergentes
- **Secuencias**: $S_1 = \text{"AAAA"}$, $S_2 = \text{"CCCC"}$
- **Significado Biológico**: Secuencias no homólogas o ruido de fondo.

#### Matrices y Resultados

```
--- Needleman-Wunsch (Score = -4) ---
       -   C   C   C   C
  -    0  -2  -4  -6  -8
  A   -2  -1  -3  -5  -7
  A   -4  -3  -2  -4  -6
  A   -6  -5  -4  -3  -5
  A   -8  -7  -6  -5  -4
Alineamiento: S1: AAAA | S2: CCCC (4 mismatches = -4; prefiere 4 mismatches a 8 gaps que darían -16)

--- Smith-Waterman (Score = 0) ---
Matriz completa de ceros (todos los valores caen por debajo del piso 0).
Alineamiento: Vacío / Score = 0 (No existe región de homología local).

--- Wagner-Fischer ED (Distancia = 4) ---
Distancia = 4 sustituciones completas.

--- Longest Common Subsequence LCS (Longitud = 0) ---
Matriz completa de ceros. LCS = "" (Cadena vacía).
```

---

### Caso 6: Múltiples Caminos Óptimos (Validación del Criterio de Desempate)
Para una validación matemática rigurosa, se definen dos sub-casos:

#### Caso 6a: Desempate Indel Elemental
- **Secuencias**: $S_1 = \text{"AA"}$, $S_2 = \text{"A"}$
- **Parámetros**: Match = $+1$, Mismatch = $-1$, Gap = $-2$.
- **Análisis Matemático de la Celda Final $(2, 1)$**:
  * Origen Diagonal $(1, 0) = -2 + \text{match}(A, A)(+1) = \mathbf{-1}$.
  * Origen Superior $(1, 1) = +1 + \text{gap}(-2) = \mathbf{-1}$.
  * Origen Lateral $(2, 0) = -4 + \text{gap}(-2) = -6$.
  * **Empate Exacto**: Diagonal ($-1$) vs Superior ($-1$).
- **Resolución**:
  * Con prioridad **Diagonal > Superior**: Elige Diagonal desde $(1,0)$, produciendo:
    $S_1$: `AA` / $S_2$: `-A`.
  * Con prioridad **Superior > Diagonal**: Elige Superior desde $(1,1)$, produciendo:
    $S_1$: `AA` / $S_2$: `A-`.

```
Matriz NW (Score = -1):
       -   A
  -    0  -2
  A   -2   1
  A   -4  -1  <-- Celda de empate crítico
```

#### Caso 6b: Desempate Permutado Tri-Camino
- **Secuencias**: $S_1 = \text{"AGC"}$, $S_2 = \text{"ACG"}$
- **Con Parámetros Match = 2, Mismatch = -1, Gap = -2**:
  Existen exactamente **3 caminos óptimos** con puntaje final $0$:
  1. Camino 1 (Todo sustitución): `AGC` / `ACG` (Score: $2 - 1 - 1 = 0$)
  2. Camino 2 (Gaps alternados): `A-GC` / `ACG-` (Score: $2 - 2 + 2 - 2 = 0$)
  3. Camino 3 (Gaps alternados): `AGC-` / `A-CG` (Score: $2 - 2 + 2 - 2 = 0$)
- **Resolución Determinista**: La regla `Diagonal > Superior > Lateral` selecciona **Camino 1**.

```
Matriz NW (Match=2, Mis=-1, Gap=-2):
       -   A   C   G
  -    0  -2  -4  -6
  A   -2   2   0  -2
  G   -4   0   1   2
  C   -6  -2   2   0  <-- Empate triple hacia celda (3,3)
```

- **En Wagner-Fischer ED**: Distancia = 2 (3 caminos posibles de costo 2).
- **En LCS**: Longitud = 2 (Existen dos subsecuencias máximas: `"AC"` y `"AG"`).

---

## 3. Evaluación Biológica: BLOSUM62 vs Puntuación Lineal Simple

### 3.1 Fundamentación Teórica del Modelo Log-Odds
Un esquema lineal simple asigna un valor fijo a cualquier coincidencia ($+M$) y cualquier discrepancia ($-S$), asumiendo que el espacio de estados de los 20 aminoácidos es ortogonal e idénticamente distribuido:
$$s_{\text{lineal}}(a, b) = \alpha \delta_{ab} + \beta (1 - \delta_{ab})$$

En contraste, la matriz **BLOSUM62** se deriva empíricamente de alineamientos no redundantes de dominios conservados de proteínas (base de datos BLOCKS, agrupados al 62% de identidad). Cada celda representa una razón de verosimilitud (log-odds):
$$s_{\text{BLOSUM62}}(a, b) = \frac{1}{\lambda} \log_2 \left( \frac{q_{ab}}{p_a p_b} \right)$$
Donde $q_{ab}$ es la frecuencia observada de la sustitución $a \leftrightarrow b$ en proteínas homólogas funcionales, y $p_a p_b$ es la probabilidad de coincidencia por azar según las abundancias basales.

### 3.2 Comparativa Cuantitativa Demostrativa

Consideremos dos péptidos conservados:
$$P_1 = \text{"WIKL" \quad (Triptófano - Isoleucina - Lisina - Leucina)}$$
$$P_2 = \text{"WVRV" \quad (Triptófano - Valina - Arginina - Valina)}$$

| Posición | Par ($P_1, P_2$) | Naturaleza Bioquímica | Score Lineal ($M=1, S=-1$) | Score BLOSUM62 | Justificación Biológica |
| :---: | :---: | :--- | :---: | :---: | :--- |
| **1** | $W \leftrightarrow W$ | Idéntico (Triptófano) | $+1$ | $\mathbf{+11}$ | Residuo aromático hidrofóbico voluminoso muy raro; vital en núcleos proteicos y empaquetamiento. |
| **2** | $I \leftrightarrow V$ | Conservativa Alifática | $-1$ | $\mathbf{+3}$ | Ambos son aminoácidos alifáticos hidrofóbicos con ramificación beta; intercambiables sin alterar la estructura terciaria. |
| **3** | $K \leftrightarrow R$ | Conservativa Básica | $-1$ | $\mathbf{+2}$ | Ambos son aminoácidos con cadenas laterales básicas cargadas positivamente a pH fisiológico; preservan puentes salinos. |
| **4** | $L \leftrightarrow V$ | Conservativa Alifática | $-1$ | $\mathbf{+1}$ | Ambos residuos forman parte del núcleo hidrofóbico en hélices alfa o láminas beta. |
| **TOTAL** | | | $\mathbf{-2}$ | $\mathbf{+17}$ | **Falso negativo lineal vs Verdadera homología biológica** |

#### Comparación de Matrices de Programación Dinámica

```
Matriz con Esquema Lineal (Gap = -2):
       -   W   V   R   V
  -    0  -2  -4  -6  -8
  W   -2   1  -1  -3  -5
  I   -4  -1   0  -2  -4
  K   -6  -3  -2  -1  -3
  L   -8  -5  -4  -3  -2  <-- Puntaje Final: -2 (Rechazado como no homólogo)

Matriz con BLOSUM62 (Gap = -4):
       -   W   V   R   V
  -    0  -4  -8 -12 -16
  W   -4  11   7   3  -1
  I   -8   7  14  10   6
  K  -12   3  10  16  12
  L  -16  -1   6  12  17  <-- Puntaje Final: +17 (Fuerte evidencia de homología evolutiva)
```

### 3.3 Inducción de Gaps Artificiales en Modelos Lineales
Un error crítico de los modelos lineales es la **inducción de gaps artificiales**.
Por ejemplo, si se alinean secuencias como $S_1 = \text{"WIKW"}$ y $S_2 = \text{"WVLW"}$:
- **Bajo modelo lineal severo** ($M=3, S=-3, \text{gap}=-1$): El algoritmo prefiere insertar 4 gaps (`W--IKW` / `WVL--W`, Score = 2) antes que tolerar los dos mismatches de $-3$ cada uno ($3 - 3 - 3 + 3 = 0$). Esto **destruye la contigüidad peptídica** por un artefacto puramente matemático.
- **Bajo BLOSUM62** ($\text{gap}=-4$): Los pares $I-V$ ($+3$) y $K-L$ ($-2$) mantienen el alineamiento continuo sin gaps `WIKW` / `WVLW` con score $+23$ ($11 + 3 - 2 + 11$).

---

## 4. Tabla Maestra de Verificación (Oráculo para Pruebas Unitarias y Presentación Oral)

Esta tabla condensa los valores esperados exactos que deben contrastarse en las suites de pruebas automatizadas y proyectarse en las láminas de la presentación oral:

| ID | Caso de Prueba | $S_1$ | $S_2$ | Algoritmo | Parámetros | Score Esperado | Alineamiento $S_1$ | Alineamiento $S_2$ | Desempate Crítico |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **TC1** | Idénticas | `AGTC` | `AGTC` | **NW** | $M=1, S=-1, G=-2$ | **4** | `AGTC` | `AGTC` | Todo Diagonal |
| | | `AGTC` | `AGTC` | **SW** | $M=2, S=-1, G=-2$ | **8** | `AGTC` | `AGTC` | Local = Global |
| | | `AGTC` | `AGTC` | **ED** | $M=0, S=1, I=1$ | **0** | `AGTC` | `AGTC` | Cero distancia |
| | | `AGTC` | `AGTC` | **LCS** | Match = 1 | **4** | `AGTC` | `AGTC` | LCS = `"AGTC"` |
| **TC2** | Mismatch Simple | `AGTC` | `AGAC` | **NW** | $M=1, S=-1, G=-2$ | **2** | `AGTC` | `AGAC` | Sustitución preferida a 2 gaps |
| | | `AGTC` | `AGAC` | **SW** | $M=2, S=-1, G=-2$ | **5** | `AGTC` | `AGAC` | Pico en celda (4,4) |
| | | `AGTC` | `AGAC` | **ED** | $M=0, S=1, I=1$ | **1** | `AGTC` | `AGAC` | 1 Sustitución |
| | | `AGTC` | `AGAC` | **LCS** | Match = 1 | **3** | `AG-TC` | `AGA-C` | LCS = `"AGC"` |
| **TC3** | Indel Simple | `AGTC` | `AGC` | **NW** | $M=1, S=-1, G=-2$ | **1** | `AGTC` | `AG-C` | 3 matches + 1 gap |
| | | `AGTC` | `AGC` | **SW** | $M=2, S=-1, G=-2$ | **4** | `AG` / `AGTC` | `AG` / `AG-C` | Termina antes de gap |
| | | `AGTC` | `AGC` | **ED** | $M=0, S=1, I=1$ | **1** | `AGTC` | `AG-C` | 1 Eliminación |
| | | `AGTC` | `AGC` | **LCS** | Match = 1 | **3** | `AGTC` | `AG-C` | LCS = `"AGC"` |
| **TC4** | Asimétricas ($8 \times 2$) | `ACGTACGT` | `CG` | **NW** | $M=1, S=-1, G=-2$ | **-10** | `ACGTACGT` | `-----CG-` | 6 gaps terminales penalizados |
| | | `ACGTACGT` | `CG` | **SW** | $M=2, S=-1, G=-2$ | **4** | `CG` | `CG` | Sin gaps terminales (pico 4) |
| | | `ACGTACGT` | `CG` | **ED** | $M=0, S=1, I=1$ | **6** | `ACGTACGT` | `-----CG-` | 6 eliminaciones |
| | | `ACGTACGT` | `CG` | **LCS** | Match = 1 | **2** | `ACGTACGT` | `-----CG-` | LCS = `"CG"` |
| **TC5** | Divergentes | `AAAA` | `CCCC` | **NW** | $M=1, S=-1, G=-2$ | **-4** | `AAAA` | `CCCC` | 4 mismatches (evita -16 gaps) |
| | | `AAAA` | `CCCC` | **SW** | $M=2, S=-1, G=-2$ | **0** | `""` | `""` | Sin alineamiento local |
| | | `AAAA` | `CCCC` | **ED** | $M=0, S=1, I=1$ | **4** | `AAAA` | `CCCC` | 4 sustituciones |
| | | `AAAA` | `CCCC` | **LCS** | Match = 1 | **0** | `----AAAA` | `CCCC----` | LCS = `""` |
| **TC6a** | Empate Indel | `AA` | `A` | **NW** | $M=1, S=-1, G=-2$ | **-1** | `AA` | `-A` | Diag > Superior |
| **TC6b** | Empate Triple | `AGC` | `ACG` | **NW** | $M=2, S=-1, G=-2$ | **0** | `AGC` | `ACG` | 3 caminos (Diag elegido) |
| | | `AGC` | `ACG` | **ED** | $M=0, S=1, I=1$ | **2** | `AGC` | `ACG` | 3 caminos de costo 2 |
| | | `AGC` | `ACG` | **LCS** | Match = 1 | **2** | `A-GC` | `ACG-` | 2 LCS: `"AC"` y `"AG"` |
| **PROT** | Proteínas Bio | `WIKL` | `WVRV` | **NW** | Lineal ($M=1, S=-1, G=-2$) | **-2** | `WIKL` | `WVRV` | Rechazo erróneo de homología |
| | | `WIKL` | `WVRV` | **NW** | BLOSUM62 ($G=-4$) | **+17** | `WIKL` | `WVRV` | Detección de homología real |

---

## 5. Instrucciones de Ejecución de Pruebas Automatizadas

Se han provisto dos motores de verificación ejecutables independientes en el repositorio:

1. **Oráculo de Referencia en Node.js (`tests/oraculo/test_suite_alignment.js`)**:
   Genera la especificación JSON canónica y los casos BLOSUM62:
   ```bash
   node tests/oraculo/test_suite_alignment.js
   # o bien:
   npm run generate:oraculo
   ```
2. **Runner de Pruebas Unitarias en Node.js**:
   Ejecuta las aserciones validando cada algoritmo y módulo contra el oráculo `canonical_test_suite.json`:
   ```bash
   npm test
   ```
