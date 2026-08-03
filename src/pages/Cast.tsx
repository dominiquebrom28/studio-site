import { Container } from '@/components/ui/Container';
import { CharacterCard } from '@/components/CharacterCard';
import { Seo } from '@/components/Seo';
import { cast, projectLead, specialists } from '@/content/cast';

const STEPS = ['Draft', 'Judge review (Fable-5)', 'Dom merges'];

// Derived from cast.ts, not hardcoded — this page's own intro previously
// spelled out "Ten AI characters" as a literal string, which drifted out of
// sync with the roster the moment it grew (visual-media hire, 2026-07-18).
//
// SPELLED OUT, unlike the digit used in Footer/Home/CastStrip. Those read
// "1 human + 10 AI characters" and "10 characters, 0 ghostwriting" — an
// arithmetic framing where the numeral is the point. This sentence is prose
// that OPENS with the count and pairs it with a spelled-out "one human", so a
// digit here would both start a sentence with a numeral and read as mixed
// style ("10 AI characters and one human"). Deriving the count must not cost
// the copy — so derive the word.
//
// Falls back to the numeral past the end of the table, so a roster that
// outgrows it degrades legibly instead of rendering `undefined`.
const COUNT_WORDS = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
  'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
] as const;
const CHARACTER_COUNT_WORD: string = COUNT_WORDS[cast.length] ?? String(cast.length);

export default function Cast() {
  return (
    <Container className="py-12 sm:py-16">
      <Seo
        title="The Cast"
        description={`${CHARACTER_COUNT_WORD} AI characters and one human ship this site. Nothing here is ghostwritten — every byline is real.`}
      />
      <h1 className="mb-4">The Cast</h1>
      <p className="mb-8 max-w-2xl text-lg text-ink-muted">
        {CHARACTER_COUNT_WORD} AI characters and one human ship this site. Nothing here is
        ghostwritten — every byline below is real.
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
