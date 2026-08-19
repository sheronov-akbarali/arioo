import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SnippetHighlight } from "./snippet-highlight";

// This repo has no @testing-library/react / jsdom setup and no other
// component tests to follow a convention from, so these tests render to a
// static HTML string via react-dom/server (already a project dependency,
// works fine under Vitest's default node environment) and assert on the
// resulting markup.

describe("SnippetHighlight", () => {
  it("passes plain text with no marks through unchanged", () => {
    const html = renderToStaticMarkup(<SnippetHighlight snippet="Salom, qandaysiz?" />);
    expect(html).toContain("Salom, qandaysiz?");
    expect(html).not.toContain("<mark");
  });

  it("renders a single <mark> pair as a <mark> element with the right text", () => {
    const html = renderToStaticMarkup(
      <SnippetHighlight snippet="Bizning <mark>qaytarish</mark> siyosatimiz bor" />,
    );
    expect(html).toContain("<mark");
    expect(html).toContain(">qaytarish<");
    expect(html).toContain("Bizning");
    expect(html).toContain("siyosatimiz bor");
  });

  it("renders multiple <mark> pairs in one snippet", () => {
    const html = renderToStaticMarkup(
      <SnippetHighlight snippet="<mark>narx</mark> va <mark>yetkazib berish</mark> haqida" />,
    );
    const markCount = (html.match(/<mark/g) ?? []).length;
    expect(markCount).toBe(2);
    expect(html).toContain(">narx<");
    expect(html).toContain(">yetkazib berish<");
    expect(html).toContain("va");
    expect(html).toContain("haqida");
  });

  it("does not throw on an unmatched opening <mark> with no closing tag", () => {
    expect(() =>
      renderToStaticMarkup(<SnippetHighlight snippet="Salom <mark>qaytarish siyosati" />),
    ).not.toThrow();
    const html = renderToStaticMarkup(<SnippetHighlight snippet="Salom <mark>qaytarish siyosati" />);
    expect(html).toContain("Salom");
    expect(html).toContain("qaytarish siyosati");
  });

  it("does not throw on an unmatched closing </mark> with no opening tag", () => {
    expect(() =>
      renderToStaticMarkup(<SnippetHighlight snippet="Salom qaytarish</mark> siyosati" />),
    ).not.toThrow();
    const html = renderToStaticMarkup(<SnippetHighlight snippet="Salom qaytarish</mark> siyosati" />);
    expect(html).toContain("Salom qaytarish");
    expect(html).toContain("siyosati");
  });
});
