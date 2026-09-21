// Small dependency-free HTML/CSS adapter for live extension checks.
// Watchtower provides Document at runtime; CI needs a compatible test double
// without installing a browser or a native HTML parser.

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
  "meta", "param", "source", "track", "wbr",
]);

function decodeEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x2f;|&#47;/gi, "/")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function parseAttributes(raw) {
  const attrs = {};
  const expression = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = expression.exec(raw))) {
    const name = match[1].toLowerCase();
    attrs[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attrs;
}

function splitTopLevel(value, separator) {
  const out = [];
  let start = 0;
  let depth = 0;
  let quote = "";
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (quote) {
      if (char === quote && value[i - 1] !== "\\") quote = "";
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
    } else if (char === "[" || char === "(") {
      depth += 1;
    } else if (char === "]" || char === ")") {
      depth -= 1;
    } else if (char === separator && depth === 0) {
      out.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(value.slice(start).trim());
  return out.filter(Boolean);
}

function selectorTokens(selector) {
  const tokens = [];
  let buffer = "";
  let pendingCombinator = null;
  let depth = 0;
  let quote = "";
  const push = () => {
    const value = buffer.trim();
    if (!value) return;
    tokens.push({ value, combinator: pendingCombinator });
    buffer = "";
    pendingCombinator = null;
  };

  for (let i = 0; i < selector.length; i += 1) {
    const char = selector[i];
    if (quote) {
      buffer += char;
      if (char === quote && selector[i - 1] !== "\\") quote = "";
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
      buffer += char;
    } else if (char === "[" || char === "(") {
      depth += 1;
      buffer += char;
    } else if (char === "]" || char === ")") {
      depth -= 1;
      buffer += char;
    } else if (depth === 0 && char === ">") {
      push();
      pendingCombinator = ">";
    } else if (depth === 0 && /\s/.test(char)) {
      push();
      if (pendingCombinator === null) pendingCombinator = " ";
    } else {
      buffer += char;
    }
  }
  push();
  if (tokens[0]) tokens[0].combinator = null;
  return tokens;
}

function parseAttributeSelector(value) {
  const match = value.match(/^\s*([^\s~|^$*!=]+)\s*(?:(\^=|\$=|\*=|~=|\|=|!=|=)\s*(?:"([^"]*)"|'([^']*)'|(.+?)))?\s*$/);
  if (!match) return null;
  return {
    name: match[1].toLowerCase(),
    operator: match[2] || null,
    expected: match[3] ?? match[4] ?? match[5] ?? "",
  };
}

function matchesAttribute(node, selector) {
  const parsed = parseAttributeSelector(selector);
  if (!parsed) return false;
  const actual = node.attr(parsed.name);
  if (!parsed.operator) return Object.prototype.hasOwnProperty.call(node.attrs, parsed.name);
  if (parsed.operator === "=") return actual === parsed.expected;
  if (parsed.operator === "!=") return actual !== parsed.expected;
  if (parsed.operator === "*=") return actual.includes(parsed.expected);
  if (parsed.operator === "^=") return actual.startsWith(parsed.expected);
  if (parsed.operator === "$=") return actual.endsWith(parsed.expected);
  if (parsed.operator === "~=") return actual.split(/\s+/).includes(parsed.expected);
  if (parsed.operator === "|=") return actual === parsed.expected || actual.startsWith(`${parsed.expected}-`);
  return false;
}

function matchesSimple(node, selector) {
  if (!node || node.type !== "element") return false;
  let rest = selector.trim();
  const tag = rest.match(/^[a-zA-Z][\w-]*|\*/);
  if (tag && tag[0] !== "*") {
    if (node.tagName !== tag[0].toLowerCase()) return false;
    rest = rest.slice(tag[0].length);
  } else if (tag) {
    rest = rest.slice(tag[0].length);
  }

  const idMatches = [...rest.matchAll(/#([\w-]+)/g)];
  if (idMatches.some((match) => node.attr("id") !== match[1])) return false;
  const classMatches = [...rest.matchAll(/\.([\w-]+)/g)];
  const classes = new Set(node.attr("class").split(/\s+/).filter(Boolean));
  if (classMatches.some((match) => !classes.has(match[1]))) return false;

  const attributeMatches = [...rest.matchAll(/\[([^\]]+)\]/g)];
  if (attributeMatches.some((match) => !matchesAttribute(node, match[1]))) return false;

  const containsMatches = [...rest.matchAll(/:contains\((?:"([^"]*)"|'([^']*)'|([^)]*))\)/g)];
  if (containsMatches.some((match) => !node.text.includes(match[1] ?? match[2] ?? match[3] ?? ""))) {
    return false;
  }

  const hasMatches = [...rest.matchAll(/:has\(([^)]+)\)/g)];
  if (hasMatches.some((match) => !node.selectFirst(match[1]))) return false;

  const nth = rest.match(/:nth-child\((\d+)\)/);
  if (nth) {
    const siblings = node.parent?.children.filter((child) => child.type === "element") || [];
    if (siblings.indexOf(node) !== Number(nth[1]) - 1) return false;
  }

  return true;
}

function matchesSelector(node, tokens) {
  if (!tokens.length || !matchesSimple(node, tokens[tokens.length - 1].value)) return false;
  let current = node;
  for (let index = tokens.length - 1; index > 0; index -= 1) {
    const relation = tokens[index].combinator || " ";
    const wanted = tokens[index - 1].value;
    if (relation === ">") {
      current = current.parent;
      if (!matchesSimple(current, wanted)) return false;
      continue;
    }
    current = current.parent;
    while (current && !matchesSimple(current, wanted)) current = current.parent;
    if (!current) return false;
  }
  return true;
}

class HtmlNode {
  constructor(type, parent, value = "") {
    this.type = type;
    this.parent = parent;
    this.value = value;
    this.children = [];
    this.attrs = {};
    this.tagName = "";
  }

  attr(name) {
    return this.attrs[String(name || "").toLowerCase()] || "";
  }

  get text() {
    if (this.type === "text") return decodeEntities(this.value).replace(/\s+/g, " ");
    return this.children.map((child) => child.text).join("").replace(/\s+/g, " ").trim();
  }

  get outerHtml() {
    if (this.type === "text") return this.value;
    if (this.type === "root") return this.children.map((child) => child.outerHtml).join("");
    const attrs = Object.entries(this.attrs)
      .map(([key, value]) => value ? `${key}="${String(value).replace(/"/g, "&quot;")}"` : key)
      .join(" ");
    const open = attrs ? `<${this.tagName} ${attrs}>` : `<${this.tagName}>`;
    if (VOID_TAGS.has(this.tagName)) return open;
    return `${open}${this.children.map((child) => child.outerHtml).join("")}</${this.tagName}>`;
  }

  select(selector) {
    const groups = splitTopLevel(String(selector || ""), ",")
      .map((group) => selectorTokens(group))
      .filter((tokens) => tokens.length);
    const found = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (child.type === "element") {
          if (groups.some((group) => matchesSelector(child, group))) found.push(child);
          visit(child);
        }
      }
    };
    visit(this);
    return found;
  }

  selectFirst(selector) {
    return this.select(selector)[0] || null;
  }
}

function parseHtml(html) {
  const root = new HtmlNode("root", null);
  const stack = [root];
  const source = String(html || "");
  const tokenExpression = /<!--[\s\S]*?-->|<![^>]*>|<\/?([a-zA-Z][\w:-]*)([^>]*)>/g;
  let cursor = 0;
  let match;
  const appendText = (value) => {
    if (value) stack[stack.length - 1].children.push(new HtmlNode("text", stack[stack.length - 1], value));
  };

  while ((match = tokenExpression.exec(source))) {
    appendText(source.slice(cursor, match.index));
    cursor = tokenExpression.lastIndex;
    const token = match[0];
    if (token.startsWith("<!--") || token.startsWith("<!")) continue;
    const tagName = match[1].toLowerCase();
    if (token.startsWith("</")) {
      const index = stack.findLastIndex((node) => node.tagName === tagName);
      if (index > 0) stack.length = index;
      continue;
    }
    const parent = stack[stack.length - 1];
    const node = new HtmlNode("element", parent);
    node.tagName = tagName;
    node.attrs = parseAttributes(match[2] || "");
    parent.children.push(node);
    if (!VOID_TAGS.has(tagName) && !/\/\s*>$/.test(token)) stack.push(node);
  }
  appendText(source.slice(cursor));
  return root;
}

export class Document {
  constructor(html) {
    this._root = parseHtml(html);
  }

  select(selector) {
    return this._root.select(selector);
  }

  selectFirst(selector) {
    return this._root.selectFirst(selector);
  }

  get html() {
    return this._root.outerHtml;
  }

  get outerHtml() {
    return this._root.outerHtml;
  }
}