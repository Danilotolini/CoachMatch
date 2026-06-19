const FOOTER_LINKS = ['Termos de Uso', 'Privacidade', 'Suporte']

export function WelcomeFooter() {
  return (
    <footer className="mt-auto flex flex-wrap gap-8 pt-12 text-[0.7rem] font-semibold tracking-widest text-on-surface-variant/40 uppercase">
      {FOOTER_LINKS.map((label) => (
        <span key={label}>{label}</span>
      ))}
      <span className="ml-auto">© 2026 COACHMATCH LTD.</span>
    </footer>
  )
}
