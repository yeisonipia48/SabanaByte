function BrandLogo() {
  return (
    <div className="flex items-center gap-2">
      <div
        aria-hidden="true"
        className="w-8 h-8 rounded-lg bg-sky-700 flex items-center justify-center text-white font-black text-xl shadow-sm"
      >
        <span className="transform -translate-y-0.5">+</span>
      </div>
      <div>
        <div className="flex items-center leading-none">
          <span className="font-extrabold text-sky-900 tracking-tight text-lg">
            Sabana
          </span>
          <span className="font-bold text-sky-600 text-lg">Byte</span>
        </div>
        <p className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">
          Portal EPS Transaccional
        </p>
      </div>
    </div>
  )
}

export default BrandLogo
