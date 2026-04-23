// variant 'light' → logo blanco (para fondos oscuros, ej. navy)
// variant 'dark'  → logo azul institucional (para fondos claros, ej. blanco)
// El naming refleja el logo en sí, NO el fondo sobre el que se coloca.

const SRCS = {
  light: '/escudo-uss-horizontal-blanco.svg',
  dark: '/escudo-uss-horizontal-azul.svg',
};

const HEIGHTS = { sm: 40, md: 56, lg: 72, xl: 110 };

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
