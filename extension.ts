/*
 * Relative line numbers for Obsidian's CM6 editor.
 *
 * Obsidian already renders a lineNumbers() gutter when "Show line number" is
 * on. Adding a second lineNumbers() with a formatNumber merges into that same
 * gutter's config, so we only replace how numbers are printed.
 *
 * No refresh logic is needed. The gutter redraws every visible marker when
 * the document, the line heights (folding) or the gutter line classes change.
 * highlightActiveLineGutter() moves its class whenever the cursor changes
 * line, so removing it would freeze the numbers on cursor moves.
 */
import { foldedRanges } from "@codemirror/language";
import { EditorState, Extension } from "@codemirror/state";
import { highlightActiveLine, highlightActiveLineGutter, lineNumbers } from "@codemirror/view";

// Figure space has the width of a digit in fonts with tabular numbers, so
// padded numbers keep the gutter width stable without a monospace font.
const FIGURE_SPACE = "\u2007";

interface HiddenLines {
  from: number;
  to: number;
}

interface Layout {
  cursorLine: number;
  width: number;
  hidden: HiddenLines[];
}

const layouts = new WeakMap<EditorState, Layout>();

// formatNumber runs for every visible line, so everything that only depends
// on the state is computed once per state.
function layoutOf(state: EditorState): Layout {
  let layout = layouts.get(state);
  if (layout) {
    return layout;
  }

  const hidden: HiddenLines[] = [];
  foldedRanges(state).between(0, state.doc.length, (from, to) => {
    const range = { from: state.doc.lineAt(from).number + 1, to: state.doc.lineAt(to).number };
    const last = hidden[hidden.length - 1];
    if (last && range.from <= last.to + 1) {
      last.to = Math.max(last.to, range.to);
    } else if (range.from <= range.to) {
      hidden.push(range);
    }
  });

  // A fold can swallow the cursor (e.g. folding the heading above it). Count
  // from the fold's visible header line, where the cursor appears to be.
  let cursorLine = state.doc.lineAt(state.selection.main.head).number;
  const containing = hidden.find((range) => cursorLine >= range.from && cursorLine <= range.to);
  if (containing) {
    cursorLine = containing.from - 1;
  }

  layout = { cursorLine, width: String(state.doc.lines).length, hidden };
  layouts.set(state, layout);
  return layout;
}

function relativeLineNumber(lineNo: number, state: EditorState): string {
  const { cursorLine, width, hidden } = layoutOf(state);
  if (lineNo > state.doc.lines) {
    return FIGURE_SPACE.repeat(width);
  }
  if (lineNo === cursorLine) {
    return String(lineNo).padStart(width, FIGURE_SPACE);
  }

  const low = Math.min(lineNo, cursorLine);
  const high = Math.max(lineNo, cursorLine);
  let distance = high - low;
  for (const range of hidden) {
    distance -= Math.max(0, Math.min(range.to, high) - Math.max(range.from, low + 1) + 1);
  }
  return String(distance).padStart(width, FIGURE_SPACE);
}

export function lineNumbersRelative(): Extension {
  return [
    lineNumbers({ formatNumber: relativeLineNumber }),
    highlightActiveLine(),
    highlightActiveLineGutter(),
  ];
}
