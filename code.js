let selectedNode = null;

figma.showUI(__html__, { width: 400, height: 400 });

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
    selectedNode.characters = applyCase(msg.caseType, selectedNode.characters);
  }

  if (msg.type === "bulk-get-cases") {
    const caseCounts = { title: 0, sentence: 0, lower: 0, upper: 0 };
    const textNodes = figma.currentPage.findAll(n => n.type === "TEXT");

    for (const node of textNodes) {
      const text = node.characters;
      if (text === toTitleCase(text)) caseCounts.title++;
      else if (text === toSentenceCase(text)) caseCounts.sentence++;
      else if (text === text.toLowerCase()) caseCounts.lower++;
      else if (text === text.toUpperCase()) caseCounts.upper++;
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
        (from === "title" && text === toTitleCase(text)) ||
        (from === "sentence" && text === toSentenceCase(text)) ||
        (from === "lower" && text === text.toLowerCase()) ||
        (from === "upper" && text === text.toUpperCase());

      if (matchesFrom) {
        await figma.loadFontAsync(node.fontName);
        node.characters = applyCase(to, text);
      }
    }
    figma.notify("Bulk edit applied!");
  }
};

function toTitleCase(text) {
  return text.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

function toSentenceCase(text) {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function applyCase(caseType, text) {
  switch (caseType) {
    case "title": return toTitleCase(text);
    case "sentence": return toSentenceCase(text);
    case "lower": return text.toLowerCase();
    case "upper": return text.toUpperCase();
  }
}