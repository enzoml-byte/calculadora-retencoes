export default function Loading() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-amber-500 mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-2xl">E</span>
          </div>
          <h1 className="text-2xl font-bold text-ink">Excellence Contábil</h1>
          <p className="text-muted mt-1">Calculadora de Retenções</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-line p-6 sm:p-8">
          <div className="space-y-4">
            <div className="h-10 bg-slate-200 rounded-lg animate-pulse"></div>
            <div className="h-10 bg-slate-200 rounded-lg animate-pulse"></div>
            <div className="h-12 bg-slate-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )
}