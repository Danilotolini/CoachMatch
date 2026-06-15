import { logout } from '@/lib/cognito'
import { getAuthUser } from '@/lib/auth'
import { Icon } from '@/components/ui/Icon'
import { ClientBottomNav, ClientSideNav } from '@/components/layout/ClientNavigation'
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

export default function ClientProfilePage() {
  const user = getAuthUser()
  const name = user.name ?? 'Aluno CoachMatch'
  const email = user.email ?? 'aluno@coachmatch.app'

  return (
    <main className="relative flex min-h-[max(884px,100dvh)] w-full bg-surface text-on-surface">
      <ClientSideNav />

      <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
        <header className="glass-header sticky top-0 z-20 flex items-center justify-between px-6 py-6 md:px-12 lg:relative lg:bg-transparent lg:px-10 lg:py-8 lg:backdrop-blur-none">
          <div>
            <span className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              Aluno
            </span>
            <h1 className="font-headline text-2xl font-bold tracking-tight lg:text-3xl">Perfil</h1>
          </div>
          <ProfileLogoutButton
            onClick={() => {
              logout('client', '/')
            }}
          />
        </header>

        <div className="flex flex-1 flex-col gap-5 px-6 pb-8 md:px-12 lg:px-10">
          <ProfileHero
            eyebrow="Aluno"
            name={name}
            email={email}
            initials={initialsFromName(name)}
            meta={['Raio 10 km', 'Hipertrofia', 'São Paulo']}
            statusLabel="Cadastro ativo"
          />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex flex-col gap-5">
              <ProfileSection
                title="Dados pessoais"
                description="Informações usadas para personalizar sua busca por Personal."
              >
                <ProfileInfoGrid
                  items={[
                    { label: 'Telefone', value: '(11) 98888-8888' },
                    { label: 'Nascimento', value: '14/03/1994' },
                    { label: 'Cidade', value: 'São Paulo, SP' },
                    { label: 'Raio de busca', value: '10 km' },
                  ]}
                />
              </ProfileSection>

              <ProfileSection
                title="Objetivo"
                description="Seu foco atual para encontrar o Treinador certo."
              >
                <div className="rounded-lg bg-primary p-5 text-on-primary-fixed">
                  <span className="font-label text-[11px] font-black uppercase tracking-widest">
                    Meta principal
                  </span>
                  <p className="mt-2 font-headline text-2xl font-black tracking-tight">
                    Ganho de massa e força
                  </p>
                  <p className="mt-2 font-body text-sm text-on-primary-fixed-variant">
                    Preferência por sessões presenciais, com acompanhamento semanal.
                  </p>
                </div>
              </ProfileSection>
            </div>

            <aside className="flex flex-col gap-5">
              <ProfileSection title="Ações">
                <div className="flex flex-col gap-3">
                  <ProfileActionRow
                    icon="edit"
                    title="Editar cadastro"
                    description="Atualizar telefone, localização e objetivo."
                    action="Editar"
                  />
                  <ProfileActionRow
                    icon="health_and_safety"
                    title="Questionário de saúde"
                    description="Revisar suas respostas de segurança."
                    action="Ver"
                  />
                  <ProfileActionRow
                    icon="favorite"
                    title="Preferências"
                    description="Ajustar modalidades e região de busca."
                    action="Ajustar"
                  />
                </div>
              </ProfileSection>

              <section className="rounded-xl border border-outline-variant/10 bg-surface-container p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary-fixed">
                    <Icon name="verified_user" size={20} />
                  </span>
                  <div>
                    <h2 className="font-headline text-base font-bold">Conta preparada</h2>
                    <p className="mt-1 font-body text-sm text-on-surface-variant">
                      Dados estáticos por enquanto, prontos para plugar no endpoint do aluno.
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>

      <ClientBottomNav />
    </main>
  )
}
