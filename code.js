let selectedNode = null;

figma.showUI(__html__, { width: 600, height: 300 });

figma.on("selectionchange", () => {
  const selection = figma.currentPage.selection;
  if (selection.length === 1 && selection[0].type === "TEXT") {
    selectedNode = selection[0];
    figma.ui.postMessage({ type: "text-selected", text: selectedNode.characters });
  } else {
    selectedNode = null;
    figma.ui.postMessage({ type: "text-deselected" });
  }
});

figma.ui.onmessage = async (msg) => {
  if (msg.type === "apply-case-to-selected" && selectedNode) {
    await figma.loadFontAsync(selectedNode.fontName);
    const newText = applyCase(msg.caseType, selectedNode.characters);
    selectedNode.characters = newText;
    // Send message back to UI to update the active card and re-render with new text
    figma.ui.postMessage({ type: "case-applied", caseType: msg.caseType, newText: newText });
  }

  if (msg.type === "bulk-get-cases") {
    const caseCounts = { title: 0, sentence: 0, lower: 0, upper: 0 };
    const textNodes = figma.currentPage.findAll(n => n.type === "TEXT");

    for (const node of textNodes) {
      const text = node.characters.trim();
      if (isUpperCase(text)) caseCounts.upper++;
      else if (isLowerCase(text)) caseCounts.lower++;
      else if (isTitleCase(text)) caseCounts.title++;
      else if (isSentenceCase(text)) caseCounts.sentence++;
    }

    figma.ui.postMessage({ type: "bulk-case-counts", caseCounts });
  }

  if (msg.type === "bulk-apply") {
    const from = msg.from;
    const to = msg.to;
    const textNodes = figma.currentPage.findAll(n => n.type === "TEXT");

    for (const node of textNodes) {
      const text = node.characters;
      const matchesFrom =
        (from === "title" && isTitleCase(text)) ||
        (from === "sentence" && isSentenceCase(text)) ||
        (from === "lower" && isLowerCase(text)) ||
        (from === "upper" && isUpperCase(text));

      if (matchesFrom) {
        await figma.loadFontAsync(node.fontName);
        node.characters = applyCase(to, text);
      }
    }
    
    // Refresh the case counts after applying bulk changes
    const caseCounts = { title: 0, sentence: 0, lower: 0, upper: 0 };
    const updatedTextNodes = figma.currentPage.findAll(n => n.type === "TEXT");

    for (const node of updatedTextNodes) {
      const text = node.characters.trim();
      if (isUpperCase(text)) caseCounts.upper++;
      else if (isLowerCase(text)) caseCounts.lower++;
      else if (isTitleCase(text)) caseCounts.title++;
      else if (isSentenceCase(text)) caseCounts.sentence++;
    }

    figma.ui.postMessage({ type: "bulk-case-counts", caseCounts });
    figma.notify("Bulk edit applied!");
  }
};

function toTitleCase(text) {
  // Capitalize first letter of each word, rest lowercase
  return text.replace(/\w\S*/g, (w) =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  );
}
function toSentenceCase(text) {
  // Capitalize first letter of the string, rest lowercase
  text = text.trim();
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}
function isUpperCase(text) {
  return /[A-Z]/.test(text) && text === text.toUpperCase();
}
function isLowerCase(text) {
  return /[a-z]/.test(text) && text === text.toLowerCase();
}
function isTitleCase(text) {
  // At least one word, each word starts with uppercase, rest lowercase
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return false;
  return words.every(w => {
    const firstLetter = w.match(/[A-Za-z]/);
    if (!firstLetter) return false;
    const i = w.indexOf(firstLetter[0]);
    return (
      w[i] === w[i].toUpperCase() &&
      w.slice(i + 1) === w.slice(i + 1).toLowerCase()
    );
  });
}
function isSentenceCase(text) {
  // First letter uppercase, rest lowercase, not title/upper/lower
  text = text.trim();
  if (!text.length) return false;
  const firstLetter = text.match(/[A-Za-z]/);
  if (!firstLetter) return false;
  const i = text.indexOf(firstLetter[0]);
  if (text[i] !== text[i].toUpperCase()) return false;
  // The rest should be mostly lowercase, but allow punctuation
  const rest = text.slice(i + 1);
  if (!/[a-z]/.test(rest)) return false; // Must have at least one lowercase after
  if (isUpperCase(text) || isLowerCase(text) || isTitleCase(text)) return false;
  return true;
}

function applyCase(caseType, text) {
  switch (caseType) {
    case "title": return toTitleCase(text);
    case "sentence": return toSentenceCase(text);
    case "lower": return text.toLowerCase();
    case "upper": return text.toUpperCase();
  }
}