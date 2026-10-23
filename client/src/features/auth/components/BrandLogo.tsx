interface BrandLogoProps {
  tone?: 'dark' | 'light'
}

function BrandLogo({ tone = 'dark' }: BrandLogoProps) {
  const isLight = tone === 'light'

  return (
    <div className="flex items-center gap-2.5">
      <div
        aria-hidden="true"
        className={`flex h-9 w-9 items-center justify-center border text-xl font-black ${
          isLight
            ? 'border-white/25 bg-white/10 text-white'
            : 'border-sky-900 bg-sky-800 text-white'
        }`}
      >
        <span className="transform -translate-y-0.5">+</span>
      </div>
      <div>
        <div className="flex items-center leading-none">
          <span
            className={`text-lg font-extrabold tracking-tight ${
              isLight ? 'text-white' : 'text-sky-950'
            }`}
          >
            Sabana
          </span>
          <span
            className={`text-lg font-bold ${
              isLight ? 'text-sky-300' : 'text-sky-700'
            }`}
          >
            Byte
          </span>
        </div>
        <p
          className={`mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] ${
            isLight ? 'text-sky-200/80' : 'text-slate-500'
          }`}
        >
          Portal EPS Transaccional
        </p>
      </div>
    </div>
  )
}

export default BrandLogo
