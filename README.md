# Finanzas personales

Aplicación local, responsive y en español para presupuesto, movimientos y visualización financiera en COP. La información se conserva en `localStorage`; el modelo TypeScript permite reemplazar esta capa por Supabase más adelante.

## Uso

```bash
npm install
npm run dev
npm run test
npm run lint
npm run build
```

## Estructura

- `src/types.ts`: modelo de dominio.
- `src/data.ts`: categorías, presupuesto y datos de demostración.
- `src/finance.ts`: cálculos financieros puros y testeados.
- `src/main.tsx`: interfaz, formularios, gráficas y persistencia.
