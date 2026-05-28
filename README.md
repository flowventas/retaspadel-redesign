# Padel Locos

Aplicacion web para organizar torneos amistosos de padel para `8`, `12`, `16` y `20` jugadores, con rondas generadas automaticamente, captura de scores y ranking en vivo.

## Correr localmente

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Incluye

- Next.js + React + TypeScript
- Tailwind CSS
- Estado persistido en `localStorage`
- Ranking dinamico por puntos, diferencia de games y games a favor
- Historial editable de rondas
- Exportacion final a CSV
- Modo oscuro

## Notas

- Formato `8 jugadores`: 7 rondas.
- Formato `12 jugadores`: 9 rondas.
- Formato `16 jugadores`: 10 rondas.
- Formato `20 jugadores`: 10 rondas.
- En todos los formatos se generan automaticamente las canchas y se busca variar parejas y rivales.
- Puedes usar el boton `Cargar demo` para probar rapido.
