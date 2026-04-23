// variant 'light' → logo blanco (para fondos oscuros, ej. navy)
// variant 'dark'  → logo azul institucional (para fondos claros, ej. blanco)
// El naming refleja el logo en sí, NO el fondo sobre el que se coloca.

const SRCS = {
  light: '/escudo-uss-horizontal-blanco.svg',
  dark: '/escudo-uss-horizontal-azul.svg',
};

const HEIGHTS       = { sm: 40,  md: 56,  lg: 72,  xl: 110 };
const TITLE_SIZES   = { sm: 14,  md: 17,  lg: 22,  xl: 30  };
const DIVIDER_HEIGHTS = { sm: 28, md: 40, lg: 50,  xl: 77  };

export default function Logo({ variant = 'dark', size = 'md', withTitle = false, className }) {
  const imgEl = (
    <img
      src={SRCS[variant]}
      alt="Universidad San Sebastián"
      draggable={false}
      style={{ height: HEIGHTS[size], width: 'auto', userSelect: 'none', display: 'block', flexShrink: 0 }}
    />
  );

  if (!withTitle) {
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

  return (
    <div
      className={`logo-lockup logo-lockup--${variant}${className ? ' ' + className : ''}`}
      style={{
        '--divider-h': DIVIDER_HEIGHTS[size] + 'px',
        '--title-size': TITLE_SIZES[size] + 'px',
      }}
    >
      {imgEl}
      <span className="logo-divider" />
      <span className="logo-title">
        <strong>Agenda</strong> Institucional
      </span>
    </div>
  );
}
