// variant 'light' → logo blanco (para fondos oscuros, ej. navy)
// variant 'dark'  → logo azul institucional (para fondos claros, ej. blanco)
// El naming refleja el logo en sí, NO el fondo sobre el que se coloca.

const SRCS = {
  light: '/escudo-uss-horizontal-blanco.svg',
  dark: '/escudo-uss-horizontal-azul.svg',
};

const HEIGHTS = { sm: 28, md: 40, lg: 64, xl: 96 };

export default function Logo({ variant = 'dark', size = 'md', className }) {
  return (
    <img
      src={SRCS[variant]}
      alt="Universidad San Sebastián"
      draggable={false}
      className={className}
      style={{ height: HEIGHTS[size], width: 'auto', userSelect: 'none', display: 'block' }}
    />
  );
}
