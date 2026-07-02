export function Footer() {
  return (
    <footer className="bg-navy border-t border-white/20 py-5" aria-label="Site footer">
      <p className="text-center text-white/85 text-sm font-bold tracking-wide px-5">
        © {new Date().getFullYear()} NS Ventures. All rights reserved.
      </p>
    </footer>
  )
}
