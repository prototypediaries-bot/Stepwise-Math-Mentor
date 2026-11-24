import assert from "node:assert/strict";
import test from "node:test";
import { splitEquationRows } from "../src/lib/equation-layout.ts";

test("separates independent equations with blank lines or explicit row breaks", () => {
  assert.deepEqual(splitEquationRows("V_1=4\n\nV_2=8"), ["V_1=4", "V_2=8"]);
  assert.deepEqual(splitEquationRows(String.raw`x=1\\[1em]y=2`), ["x=1", "y=2"]);
});

test("preserves a single expression and normal LaTeX whitespace", () => {
  assert.deepEqual(splitEquationRows("I=\\frac\n{12}{6}=2"), ["I=\\frac\n{12}{6}=2"]);
});

test("keeps grouped expressions, matrices and aligned derivations intact", () => {
  for (const tex of [
    "\\frac{a\n\n+b}{c}",
    "\\begin{aligned}x&=1\\\\\n\ny&=2\\end{aligned}",
    "\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}",
    "\\left(\na\n\n+b\\right)",
    String.raw`\text{two\\lines}`,
  ]) {
    assert.deepEqual(splitEquationRows(tex), [tex]);
  }
});

test("can separate rows after an environment or paired delimiter closes", () => {
  const matrix = String.raw`\begin{pmatrix}1\\2\end{pmatrix}`;
  assert.deepEqual(splitEquationRows(`${matrix}\n\nx=1`), [matrix, "x=1"]);
  assert.deepEqual(splitEquationRows("\\left(x+1\\right)\n\nx=2"), ["\\left(x+1\\right)", "x=2"]);
});

test("handles escaped braces and ignores empty rows", () => {
  assert.deepEqual(splitEquationRows("\\{1,2\\}\n\nx=2\n\n"), ["\\{1,2\\}", "x=2"]);
  assert.deepEqual(splitEquationRows("   "), []);
});
