import { logout } from '@/lib/cognito'
import { getAuthUser } from '@/lib/auth'
import { Icon } from '@/components/ui/Icon'
import { CoachBottomNav, CoachSideNav } from '@/components/layout/CoachNavigation'
import {
  ProfileActionRow,
  ProfileHero,
  ProfileInfoGrid,
  ProfileLogoutButton,
  ProfileSection,
} from '@/components/profile/ProfileBlocks'

function initialsFromName(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export default function CoachProfilePage() {
  const user = getAuthUser()
  const name = user.name ?? 'Treinador CoachMatch'
  const email = user.email ?? 'treinador@coachmatch.app'

  return (
    <main className="relative flex min-h-[max(884px,100dvh)] w-full bg-surface text-on-surface">
      <CoachSideNav />

      <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
        <header className="flex items-center justify-between px-6 py-6 md:px-12 lg:px-10 lg:py-8">
          <div>
            <span className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              Treinador
            </span>
            <h1 className="font-headline text-2xl font-bold tracking-tight lg:text-3xl">Perfil</h1>
          </div>
          <ProfileLogoutButton
            onClick={() => {
              logout('coach')
            }}
          />
        </header>

        <div className="flex flex-1 flex-col gap-5 px-6 pb-8 md:px-12 lg:px-10">
          <ProfileHero
            eyebrow="Autoridade"
            name={name}
            email={email}
            initials={initialsFromName(name)}
            meta={['CREF ativo', 'Musculação', 'Pinheiros']}
            statusLabel="Perfil ativo"
          />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex flex-col gap-5">
              <ProfileSection
                title="Dados profissionais"
                description="Informações que sustentam sua presença para alunos."
              >
                <ProfileInfoGrid
                  items={[
                    { label: 'Telefone', value: '(11) 99999-9999' },
                    { label: 'CREF', value: '123456-G/SP' },
                    { label: 'Instagram', value: '@coachmatch.personal' },
                    { label: 'Atendimento', value: 'Academia e consultoria presencial' },
                  ]}
                />
              </ProfileSection>

              <ProfileSection
                title="Especialidades"
                description="O foco técnico que aparece no seu posicionamento."
              >
                <div className="flex flex-wrap gap-2">
                  {['Hipertrofia', 'Força', 'Emagrecimento', 'Condicionamento'].map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-surface-container px-3 py-2 font-label text-xs font-bold uppercase tracking-wide text-on-surface"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </ProfileSection>
            </div>

            <aside className="flex flex-col gap-5">
              <ProfileSection title="Ações">
                <div className="flex flex-col gap-3">
                  <ProfileActionRow
                    icon="edit"
                    title="Editar perfil"
                    description="Atualizar bio, contatos e especialidades."
                    action="Editar"
                  />
                  <ProfileActionRow
                    icon="play_circle"
                    title="Vídeo de apresentação"
                    description="Revisar sua vitrine para novos alunos."
                    action="Ver"
                  />
                  <ProfileActionRow
                    icon="visibility"
                    title="Visibilidade"
                    description="Controlar como seu perfil aparece na busca."
                    action="Ajustar"
                  />
                </div>
              </ProfileSection>

              <section className="rounded-xl border border-outline-variant/10 bg-surface-container p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary-fixed">
                    <Icon name="workspace_premium" size={20} />
                  </span>
                  <div>
                    <h2 className="font-headline text-base font-bold">Presença pronta</h2>
                    <p className="mt-1 font-body text-sm text-on-surface-variant">
                      Esta tela já está preparada para receber os dados reais da API.
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>

      <CoachBottomNav />
    </main>
  )
}
