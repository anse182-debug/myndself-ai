export function Logo({ small, tiny }: { small?: boolean; tiny?: boolean }) {
  const size = tiny ? 'h-6' : small ? 'h-8' : 'h-10'
  return (
    <div className="flex items-center gap-2 select-none">
      <img src="/images/cover_glow.webp" alt="MyndSelf.ai" className={`${size} w-auto rounded-md ring-1 ring-white/10`} />
      <span className={`font-[Poppins] font-semibold tracking-tight ${tiny ? 'text-base' : small ? 'text-lg' : 'text-xl'}`}>MyndSelf.ai</span>
    </div>
  )
}
