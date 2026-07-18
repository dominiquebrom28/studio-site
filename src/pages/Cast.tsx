import { Container } from '@/components/ui/Container';
import { CharacterCard } from '@/components/CharacterCard';
import { Seo } from '@/components/Seo';
import { projectLead, specialists } from '@/content/cast';

const STEPS = ['Draft', 'Judge review (Fable-5)', 'Dom merges'];

export default function Cast() {
  return (
    <Container className="py-12 sm:py-16">
      <Seo
        title="The Cast"
        description="Ten AI characters and one human ship this site. Nothing here is ghostwritten — every byline is real."
      />
      <h1 className="mb-4">The Cast</h1>
      <p className="mb-8 max-w-2xl text-lg text-ink-muted">
        Ten AI characters and one human ship this site. Nothing here is ghostwritten — every
        byline below is real.
      </p>

      <ol className="mb-12 flex flex-wrap items-center gap-3 font-mono text-sm text-ink-muted" aria-label="Publishing process">
        {STEPS.map((step, index) => (
          <li key={step} className="flex items-center gap-3">
            {index > 0 && <span aria-hidden="true">→</span>}
            <span className="rounded-full border border-hairline bg-paper-raised px-3 py-1">{step}</span>
          </li>
        ))}
      </ol>

      <div className="mb-8">
        <CharacterCard member={projectLead} lead headingLevel={2} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {specialists.map((member) => (
          <CharacterCard key={member.id} member={member} headingLevel={2} />
        ))}
      </div>
    </Container>
  );
}
