// ts_headline inserts <mark>/</mark> around matched terms, but it passes the
// surrounding message content through verbatim — so a customer message that
// happens to literally contain the string "<mark>" could also toggle
// highlighting here. That's harmless: this renders everything as React text
// nodes (never via dangerouslySetInnerHTML), so it's never a security
// concern, at most a rare cosmetic mis-highlight.
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
