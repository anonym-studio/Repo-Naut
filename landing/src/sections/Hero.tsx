import { useState, useEffect, useCallback, useRef } from 'react'
import { GITHUB_REPO_URL, RELEASES_LATEST_URL } from '../constants'

const SCREENS = [
  '/screen-1.png',
  '/screen-2.png',
  '/screen-3.png',
  '/screen-4.png',
  '/screen-5.png',
  '/screen-6.png',
]

const DRAG_THRESHOLD = 50

export function Hero() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartX = useRef<number | null>(null)

  const next = useCallback(() => setCurrent(i => (i + 1) % SCREENS.length), [])
  const prev = useCallback(() => setCurrent(i => (i - 1 + SCREENS.length) % SCREENS.length), [])

  useEffect(() => {
    if (paused) return
    const timer = setInterval(next, 4000)
    return () => clearInterval(timer)
  }, [next, paused])

  const onDragStart = (clientX: number) => {
    dragStartX.current = clientX
    setIsDragging(true)
    setPaused(true)
  }

  const onDragMove = (clientX: number) => {
    if (dragStartX.current === null) return
    setDragOffset(clientX - dragStartX.current)
  }

  const onDragEnd = () => {
    if (dragStartX.current === null) return
    if (dragOffset < -DRAG_THRESHOLD) next()
    else if (dragOffset > DRAG_THRESHOLD) prev()
    dragStartX.current = null
    setDragOffset(0)
    setIsDragging(false)
    setPaused(false)
  }

  const onDragCancel = () => {
    dragStartX.current = null
    setDragOffset(0)
    setIsDragging(false)
    setPaused(false)
  }

  return (
    <section className="relative flex flex-col items-center justify-center px-6 pt-28 pb-20 overflow-hidden text-center">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-[480px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3B82F6] opacity-[0.07] blur-[130px]" />
        <div className="absolute left-1/2 top-1/2 h-[360px] w-[640px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-[#8B5CF6] opacity-[0.07] blur-[100px]" />
      </div>

      {/* Title image */}
      <img
        src="/title.png"
        alt="Repo-Naut"
        className="mb-8 w-full max-w-xl select-none"
        draggable={false}
      />

      {/* Tagline */}
      <p className="mb-3 text-xl font-medium text-[#F8FAFC] md:text-2xl">
        Your Repos.{' '}
        <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
          Your Mission.
        </span>
      </p>

      {/* Sub copy */}
      <p className="mb-10 max-w-md text-[#94A3B8]">
        すべてのリポジトリを、一つのコックピットへ。
        <br className="hidden sm:block" />
        複数のプロジェクトをひとつの画面で管理。エディタ起動からタスク管理まで。
      </p>

      {/* CTA buttons */}
      <div className="mb-5 flex flex-col items-center gap-3 sm:flex-row">
        <a
          href={RELEASES_LATEST_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          macOS 用をダウンロード (.dmg)
        </a>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-[#1E2330] px-6 py-3 text-sm font-medium text-[#94A3B8] transition-colors hover:border-[#3B82F6] hover:text-[#F8FAFC]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          GitHub でコードを見る
        </a>
      </div>

      {/* OS badges */}
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {['macOS 12+', 'Apple Silicon 対応', 'Intel 対応'].map((badge) => (
          <span
            key={badge}
            className="rounded-full border border-[#1E2330] px-3 py-1 text-xs text-[#94A3B8]"
          >
            {badge}
          </span>
        ))}
      </div>

      {/* Unsigned note */}
      <p className="mb-16 max-w-sm text-xs leading-relaxed text-[#94A3B8]">
        ⚠ 現在未署名のため、初回起動時に Gatekeeper の警告が表示されます。
        起動方法は{' '}
        <a href="#download" className="underline underline-offset-2 hover:text-[#F8FAFC]">
          こちら
        </a>
        。
      </p>

      {/* Screenshot carousel */}
      <div className="w-full max-w-5xl">
        <div className="relative rounded-xl border border-[#1E2330] bg-[#0F1117] p-1 shadow-[0_0_80px_rgba(59,130,246,0.08)]">
          {/* Slides */}
          <div
            className={`overflow-hidden rounded-lg select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={e => onDragStart(e.clientX)}
            onMouseMove={e => onDragMove(e.clientX)}
            onMouseUp={onDragEnd}
            onMouseLeave={onDragCancel}
            onTouchStart={e => onDragStart(e.touches[0].clientX)}
            onTouchMove={e => onDragMove(e.touches[0].clientX)}
            onTouchEnd={onDragEnd}
          >
            <div
              className={`flex ${isDragging ? '' : 'transition-transform duration-500 ease-in-out'}`}
              style={{ transform: `translateX(calc(-${current * 100}% + ${dragOffset}px))` }}
            >
              {SCREENS.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt={`Repo-Naut スクリーンショット ${i + 1}`}
                  className="w-full shrink-0 rounded-lg"
                  draggable={false}
                />
              ))}
            </div>
          </div>

          {/* Prev button */}
          <button
            onClick={prev}
            aria-label="前のスクリーンショット"
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-[#05070A]/70 text-[#94A3B8] backdrop-blur-sm transition-colors hover:bg-[#1E2330] hover:text-[#F8FAFC]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Next button */}
          <button
            onClick={next}
            aria-label="次のスクリーンショット"
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-[#05070A]/70 text-[#94A3B8] backdrop-blur-sm transition-colors hover:bg-[#1E2330] hover:text-[#F8FAFC]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Dot indicators */}
        <div className="mt-4 flex justify-center gap-2">
          {SCREENS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`スクリーンショット ${i + 1} を表示`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-6 bg-[#3B82F6]'
                  : 'w-1.5 bg-[#1E2330] hover:bg-[#94A3B8]'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
