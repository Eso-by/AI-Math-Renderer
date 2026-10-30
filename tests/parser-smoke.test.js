const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const katex = require("katex");
const parser = require("../parser.js");
const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
assert.equal(manifest.manifest_version, 3);
assert.ok(manifest.content_scripts[0].js.includes("parser.js"));
for (const asset of manifest.content_scripts[0].js.concat(manifest.content_scripts[0].css)) {
  assert.ok(fs.existsSync(path.join(root, asset)), "Missing extension asset: " + asset);
}

const mixed = parser.parse("先看 $x^2$，再看 $$\\frac{1}{2}$$。");
assert.equal(mixed.segments.length, 2);
assert.equal(mixed.segments[0].tex, "x^2");
assert.equal(mixed.segments[1].display, true);

const bracket = parser.parse("公式 \\(a+b\\) 与 \\[c=d\\]");
assert.equal(bracket.segments.length, 2);
assert.equal(bracket.segments[0].display, false);
assert.equal(bracket.segments[1].display, true);

const aligned = parser.parse("$$\\begin{aligned}a&=b\\\\c&=d\\end{aligned}$$");
assert.equal(aligned.segments.length, 1);
assert.equal(aligned.segments[0].display, true);

const bare = parser.parse("\\begin{aligned}a&=b\\\\c&=d\\end{aligned}");
assert.equal(bare.segments.length, 1);
assert.equal(bare.segments[0].bare, true);
assert.equal(bare.segments[0].display, true);
assert.match(katex.renderToString(bare.segments[0].tex, { displayMode: true, throwOnError: true }), /class="katex"/);

const multilineSource = [
  "\\begin{aligned}",
  "\\mathbb{E}\\left[\\prod_{i=1}^{n} f_i(X_i)\\right]",
  "&= \\int_{E_1\\times\\cdots\\times E_n}\\prod_{i=1}^{n}f_i(x_i)\\,",
  "\\mathbb{P}_{X_1}(\\mathrm{d}x_1)\\cdots\\mathbb{P}_{X_n}(\\mathrm{d}x_n)\\\\",
  "&= \\prod_{i=1}^{n}\\int_{E_i}f_i(x_i)\\mathbb{P}_{X_i}(\\mathrm{d}x_i)\\\\",
  "&= \\prod_{i=1}^{n}\\mathbb{E}[f_i(X_i)]",
  "\\end{aligned}"
].join("\n");
const multiline = parser.parse(multilineSource);
assert.equal(multiline.segments.length, 1);
assert.equal(multiline.segments[0].bare, true);
assert.doesNotThrow(() => katex.renderToString(multiline.segments[0].tex, { displayMode: true, throwOnError: true }));

const splitDelimiter = parser.parse(["paragraph ", "\\[", "x^2+y^2", "\\]", " end"].join(""));
assert.equal(splitDelimiter.segments.length, 1);
assert.equal(splitDelimiter.segments[0].display, true);

const bareStandalone = parser.parse("[\\\\liminf_{n\\\\to\\\\infty} \\\\frac{\\\\mathbb{E}[S_n^2]}{\\\\mathbb{E}[S_n]^2}=1.]");
assert.equal(bareStandalone.segments.length, 1);
assert.equal(bareStandalone.segments[0].bare, true);
assert.doesNotThrow(() => katex.renderToString(bareStandalone.segments[0].tex, { displayMode: true, throwOnError: true }));

assert.equal(parser.parse("Since the second assumption becomes").segments.length, 0);

assert.equal(parser.parse("金额是 $5 and $10").segments.length, 0);
assert.equal(parser.parse("未闭合公式 $$x^2").segments.length, 0);
assert.equal(parser.parse("转义符号 \\$5 不应被识别").segments.length, 0);

const formulas = [
  "x^2 + y^2 = z^2",
  "\\frac{d}{dx}\\left(x^n\\right)=nx^{n-1}",
  "\\begin{aligned} f(x)&=x^2 \\\\ f'(x)&=2x \\end{aligned}",
  "\\begin{cases} x,&x>0\\\\ -x,&x\\leq 0 \\end{cases}",
  "\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}"
];
for (const formula of formulas) {
  const html = katex.renderToString(formula, { throwOnError: true, output: "htmlAndMathml" });
  assert.match(html, /class="katex"/);
}
console.log("AI Math Renderer tests passed: block-level parsing, multiline aligned, split delimiters, and KaTeX forms.");
