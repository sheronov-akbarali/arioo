// ts_headline output only ever contains our own literal <mark>/</mark> delimiters
// around excerpted message text — this renders those delimiters as React elements
// (never via dangerouslySetInnerHTML) so the excerpted text itself stays an
// auto-escaped text node no matter what a customer's message contained.
export function SnippetHighlight({ snippet }: { snippet: string }) {
  const parts = snippet.split(/(<mark>|<\/mark>)/g);
  let marking = false;
  return (
    <>
      {parts.map((part, index) => {
        if (part === "<mark>") {
          marking = true;
          return null;
        }
        if (part === "</mark>") {
          marking = false;
          return null;
        }
        if (part === "") return null;
        return marking ? (
          <mark key={index} className="rounded bg-brand/20 px-0.5 font-medium text-foreground">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </>
  );
}
