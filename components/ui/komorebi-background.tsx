'use client'

export function KomorebiBackground() {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none -z-50 transition-colors duration-1000">
      <div 
        className="absolute top-0 -left-4 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob dark:mix-blend-lighten transition-colors duration-1000 bg-amber-200/40"
      ></div>
      
      <div 
        className="absolute top-0 -right-4 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob duration-slower animation-delay-2000 dark:mix-blend-lighten transition-colors duration-1000 bg-emerald-200/40"
      ></div>
      
      <div 
        className="absolute -bottom-8 left-20 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob duration-slowest animation-delay-4000 dark:mix-blend-lighten transition-colors duration-1000 bg-rose-200/40"
      ></div>
      
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
    </div>
  )
}

