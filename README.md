# Luna Coins

![Logo de Luna Coins](src/luna-coins.png)

Aplicación local y responsive para gestionar finanzas personales en español y COP. Luna Coins permite registrar movimientos, definir límites mensuales, comparar gasto real contra presupuesto y analizar cómo se distribuye el ingreso.

La aplicación funciona completamente en el navegador. Actualmente no utiliza backend: los datos se guardan en `localStorage` del navegador.

## Funcionalidades

### Dashboard

El Dashboard resume el mes seleccionado y conserva separados los conceptos financieros:

- Ingresos.
- Deducciones.
- Gastos de consumo totales.
- Gastos con límite y sin límite.
- Ahorro e inversión.
- Préstamos.
- Disponible planificado.
- Disponible real.
- Presupuesto restante.
- Capacidad presupuestable.
- Principales desviaciones.
- Distribución del gasto y análisis de bienestar financiero.

El selector de mes controla los cálculos de las vistas que trabajan con períodos mensuales.

### Movimientos

Desde `Movimientos` se pueden:

- Consultar los movimientos del mes.
- Buscar por descripción o categoría.
- Crear movimientos desde `Nuevo movimiento`.
- Editar tipo, valor, fecha, categoría y descripción.
- Eliminar movimientos.

Los tipos disponibles son `Gasto`, `Ingreso`, `Deducción`, `Ahorro`, `Inversión` y `Pago de deuda`.

### Presupuesto

La sección `Presupuesto` permite:

- Crear un límite mensual por categoría.
- Crear una categoría sin límite dejando el tope vacío.
- Editar el límite con el botón de lápiz.
- Eliminar un límite con el botón de papelera.
- Buscar y filtrar categorías.
- Ordenar por gasto, uso, desviación o nombre.
- Ver una fila como card en móvil.
- Verificar la capacidad disponible antes de asignar nuevos topes.

La pantalla distingue entre:

- **Capacidad presupuestable:** ingresos menos deducciones no asociadas a préstamos, préstamos y ahorro/inversión.
- **Capacidad asignada:** suma de los límites mensuales definidos.
- **Capacidad sin asignar:** capacidad presupuestable menos capacidad asignada.
- **Uso del presupuesto:** gasto de una categoría dividido por su propio límite.

Los porcentajes de la sección `Presupuesto` se calculan sobre la capacidad presupuestable. Los porcentajes de otras secciones, como bienestar financiero, pueden usar el ingreso total cuando corresponde.

### Categorías

La aplicación permite crear categorías personalizadas con nombre y grupo. Las categorías se reutilizan en movimientos, presupuestos y análisis.

### Bienestar financiero

El módulo de bienestar compara, por categoría:

- Gasto real.
- Porcentaje del ingreso.
- Presupuesto personal.
- Porcentaje presupuestado.
- Benchmark externo, cuando está configurado.
- Comparaciones visuales y distribución 50/30/20.

Las referencias externas no se inventan. Una categoría sin benchmark se muestra como `N/D`. La referencia inicial de Alimentación está documentada como benchmark de USDA ERS para consumidores de EE. UU., año 2025; no es una recomendación universal.

### Configuración

La configuración permite:

- Crear respaldos JSON.
- Importar respaldos.
- Administrar benchmarks financieros.
- Activar o desactivar benchmarks.
- Eliminar datos de demostración.
- Cambiar el modo claro/oscuro desde la navegación.

## Modelo de datos

Las entidades principales están definidas en [src/types.ts](src/types.ts).

### `Category`

Representa una categoría seleccionable.

```ts
interface Category {
  id: string;
  name: string;
  group: string;
  type: "expense" | "deduction" | "savings";
  active?: boolean;
}
```

`type` separa categorías de consumo, deducciones y patrimonio. Una deducción no debe aparecer en el gráfico de gasto de consumo.

### `Transaction`

Representa un movimiento financiero.

```ts
type TransactionType =
  | "income"
  | "deduction"
  | "expense"
  | "savings"
  | "investment"
  | "debt";
```

Cada transacción conserva `categoryId`, fecha, valor, descripción, cuenta, método de pago y timestamps. Las transacciones demo incluyen `demo: true`.

### `Budget`

Representa un límite mensual por categoría.

```ts
interface Budget {
  id: string;
  month: string;
  categoryId: string;
  limit: number | null;
}
```

- `limit` numérico: categoría con límite.
- `limit: null`: categoría visible sin límite definido.

Una categoría sin límite no aumenta los topes definidos ni el presupuesto restante, pero sus gastos sí afectan el disponible real.

### `Benchmark`

Representa una referencia externa documentada.

```ts
interface Benchmark {
  id: string;
  categoryId: string;
  percentage: number;
  source: string;
  year: number;
  country: string;
  population: string;
  type: string;
  url?: string;
  active: boolean;
}
```

### `FinancialRange`

Existe para compatibilidad con datos guardados de una versión anterior basada en rangos. La interfaz actual de bienestar utiliza benchmarks y no renderiza los indicadores de rango antiguos. No eliminar este tipo sin migrar primero los datos existentes.

## Reglas financieras

Los cálculos puros están en [src/finance.ts](src/finance.ts). La interfaz no debe duplicar estas fórmulas.

### Clasificación

- `income`: ingreso.
- `deduction`: deducción obligatoria o programada.
- `expense`: gasto de consumo.
- `debt`: pago de deuda, utilizado para identificar préstamos.
- `savings`: ahorro registrado.
- `investment`: inversión registrada.

El gráfico de gastos de consumo usa movimientos `expense`. No incluye deducciones, ahorro, inversión ni préstamos clasificados como deducciones.

### Capacidad presupuestable

```text
capacidadPresupuestable =
  ingresos
  - deduccionesNoPréstamo
  - préstamos
  - ahorro/inversión
```

La capacidad puede ser negativa. Las funciones de porcentaje evitan producir `NaN` o `Infinity` cuando el denominador es cero o negativo.

### Presupuesto

```text
capacidadAsignada = suma de límites numéricos
capacidadSinAsignar = capacidadPresupuestable - capacidadAsignada
porcentajePresupuesto = límiteDeCategoría / capacidadPresupuestable
porcentajeGastado = gastoDeCategoría / capacidadPresupuestable
uso = gastoDeCategoría / límiteDeCategoría
```

El Dashboard mantiene sus propios conceptos de disponible planificado y disponible real. Los cambios visuales de la sección Presupuesto no deben modificar esas fórmulas.

## Persistencia local

`App` carga y guarda el estado mediante `localStorage`:

| Clave | Contenido |
| --- | --- |
| `fp-tx` | Movimientos (`Transaction[]`) |
| `fp-budgets` | Límites mensuales (`Budget[]`) |
| `fp-categories` | Categorías (`Category[]`) |
| `fp-financial-ranges` | Rangos heredados de versiones anteriores |
| `fp-benchmarks` | Referencias externas (`Benchmark[]`) |
| `fp-dark` | Preferencia de tema (`boolean`) |

La carga tiene fallback a los datos de [src/data.ts](src/data.ts). Al cambiar el modelo, se debe considerar compatibilidad con datos ya guardados en el navegador.

### Importación y respaldo

El respaldo JSON contiene actualmente:

```json
{
  "transactions": [],
  "budgets": [],
  "benchmarks": []
}
```

Si se agregan nuevas colecciones persistentes, deben incorporarse tanto al exportador como al importador.

## Arquitectura del código

### [src/main.tsx](src/main.tsx)

Contiene la aplicación React, navegación, estado global de la sesión, persistencia y componentes de interfaz principales:

- `App`: estado raíz, selector de mes, persistencia y composición de vistas.
- `Dashboard`: resumen financiero y gráficos.
- `Movements`: listado, búsqueda, edición y eliminación de movimientos.
- `BudgetView`: resumen, filtros, capacidad, filas y cards responsive de presupuesto.
- `WellbeingAnalysis`: tabla y gráficos comparativos de bienestar financiero.
- `Secondary`: categorías, configuración, benchmarks y movimientos programados.
- `TransactionModal`: creación y edición de movimientos.

### [src/finance.ts](src/finance.ts)

Debe contener cálculos puros y sin efectos secundarios. Entre las funciones importantes están:

- `calculateIncome`, `calculateDeductions`, `calculateSavings`, `calculateInvestments`.
- `calculateLoans`.
- `calculateBudgetCapacity`, `calculateBudgetLimits`.
- `getBudgetAllocationRate`, `getBudgetUnassignedCapacity`.
- `getCategoryBudgetRate`, `getCategorySpentRate`, `getCategoryUsageRate`.
- `calculateBudgetedExpenses`, `calculateUnbudgetedExpenses`, `calculateTotalExpenses`.
- `calculateBudgetScenarioAvailable`, `calculateRealAvailable`.
- `calculateExpenseBreakdown`.
- `calculateBenchmarkComparison`.

Si una regla financiera cambia, debe modificarse aquí y cubrirse con tests antes de tocar la interfaz.

### [src/data.ts](src/data.ts)

Contiene:

- Categorías iniciales.
- Categorías de deducción.
- Categorías de ahorro.
- Categorías de suscripción.
- Límites demo.
- Movimientos demo.

Los datos demo sirven para inicializar una instalación nueva. No deben usarse para reemplazar datos reales del usuario.

### Estilos

- `src/styles.css`: estilos base y layout general.
- `src/overrides.css`: identidad visual de Luna Coins, ajustes del Dashboard, Presupuesto, tablas, responsive y tema oscuro.

El logo visible utiliza [src/luna-coins.png](src/luna-coins.png). No reemplazarlo por un SVG o una imagen generada sin una decisión explícita de diseño.

## Guía para futuros cambios

### Cambiar una fórmula

1. Localizar la función correspondiente en `src/finance.ts`.
2. Confirmar qué tipos de movimiento debe incluir.
3. Añadir o actualizar un test en `src/finance.test.ts`.
4. Comprobar casos de ingreso cero, mes sin movimientos, presupuesto nulo y categoría sin límite.
5. Conectar el resultado desde `App` o el componente correspondiente.
6. Ejecutar tests, lint y build.

No calcular importes directamente dentro de JSX si la regla puede vivir en `finance.ts`.

### Añadir una funcionalidad persistente

1. Añadir o actualizar el tipo en `src/types.ts`.
2. Definir una clave estable de `localStorage`.
3. Cargar con fallback compatible desde `App`.
4. Guardar dentro del efecto de persistencia.
5. Incluir la colección en exportación e importación JSON.
6. Considerar datos antiguos que no tengan el nuevo campo.

### Cambiar una vista

1. Reutilizar los datos calculados por `App`.
2. Mantener las acciones existentes (`onAdd`, `onChange`, `onRemove`, `onEdit`, `onDelete`).
3. No modificar la semántica de `categoryId`, `month` ni `limit` sin migración.
4. Mantener estados vacíos, errores, modo oscuro y responsive.
5. En mobile, preferir cards o layouts apilados antes que forzar tablas con scroll horizontal.

### Añadir una categoría

Las categorías deben tener un `id` estable. Los movimientos y presupuestos guardan ese id, no el nombre visible. No cambiar el nombre del id después de que existan datos persistidos.

### Añadir un benchmark

Un benchmark debe incluir fuente, año, país/población, tipo y estado activo. Si no existe una referencia sólida, mostrar `N/D`; no inventar porcentajes. Un benchmark externo no es un presupuesto personal ni una recomendación universal.

## Desarrollo

Requisitos: Node.js y npm.

```bash
npm install
npm run dev
```

Comandos disponibles:

```bash
npm run dev     # Inicia Vite en desarrollo
npm test        # Ejecuta Vitest
npm run lint    # Ejecuta ESLint
npm run build   # Ejecuta TypeScript y genera el bundle de producción
```

## Verificación antes de entregar cambios

Ejecutar siempre:

```bash
npm test
npm run lint
npm run build
```

Para cambios de interfaz, comprobar además:

- Dashboard y Presupuesto con septiembre de 2026.
- Cambio de mes.
- Modo oscuro.
- Desktop y mobile.
- Crear, editar y eliminar movimientos.
- Crear, editar y eliminar límites.
- Categorías sin presupuesto.
- Importación y exportación JSON.
- Ausencia de errores en la consola del navegador.

## Limitaciones actuales

- La persistencia depende del navegador y su origen; limpiar los datos del sitio elimina la información local.
- No existe backend ni sincronización entre dispositivos.
- Las transacciones demo se cargan como fallback en una instalación sin datos.
- El bundle de Recharts y React puede producir una advertencia de tamaño en Vite; no impide el build.
