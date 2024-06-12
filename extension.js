const vscode = require('vscode');

function activate(context) {
  let runTaintedFlowAnalysisCommand = vscode.commands.registerCommand('extension.runTaintedFlowAnalysis', function () {
    runTaintedFlowAnalysis();
  });

  let runTaintedFlowAnalysisOnExplorerCommand = vscode.commands.registerCommand('extension.runTaintedFlowAnalysisOnExplorer', function (uri) {
    runTaintedFlowAnalysis(uri);
  });

  context.subscriptions.push(runTaintedFlowAnalysisCommand);
  context.subscriptions.push(runTaintedFlowAnalysisOnExplorerCommand);
}

async function runTaintedFlowAnalysis(uri) {
  let document;
  if (uri) {
    // If uri is provided (from explorer context menu)
    document = await vscode.workspace.openTextDocument(uri);
  } else {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor found.');
      return;
    }
    document = editor.document;
  }

  analyzeDocument(document);
}

function analyzeDocument(document) {
  const text = document.getText();

  const sources = ['tgetstr'];
  const sinks = ['broadcast'];

  const taintedVariables = new Set();
  const taintedFlow = [];

  const decorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255, 0, 0, 0.3)'
  });

  const decorations = [];

  const lines = text.split('\n');
  lines.forEach((line, lineNumber) => {
    // Check for sources
    sources.forEach(source => {
      if (line.includes(source)) {
        const variableName = extractVariableName(line, source);
        if (variableName) {
          taintedVariables.add(variableName);
          taintedFlow.push(`Source detected: ${variableName} at line ${lineNumber + 1}`);
          
          const startPos = new vscode.Position(lineNumber, line.indexOf(source));
          const endPos = new vscode.Position(lineNumber, line.indexOf(source) + source.length);
          const range = new vscode.Range(startPos, endPos);
          decorations.push({ range });
        }
      }
    });

    // Check for sinks
    sinks.forEach(sink => {
      if (line.includes(sink)) {
        const variablesInLine = extractVariablesInLine(line);
        variablesInLine.forEach(variable => {
          if (taintedVariables.has(variable)) {
            const message = `Potential tainted flow detected at line ${lineNumber + 1}: variable '${variable}' from source flows to sink '${sink}'.`;
            taintedFlow.push(message);
            vscode.window.showWarningMessage(message);
            
            const startPos = new vscode.Position(lineNumber, line.indexOf(sink));
            const endPos = new vscode.Position(lineNumber, line.indexOf(sink) + sink.length);
            const range = new vscode.Range(startPos, endPos);
            decorations.push({ range });
          }
        });
      }
    });

    // Propagate taint
    taintedVariables.forEach(variable => {
      if (line.includes(variable)) {
        const newTaintedVariable = extractAssignedVariable(line, variable);
        if (newTaintedVariable) {
          taintedVariables.add(newTaintedVariable);
          taintedFlow.push(`Taint propagated from ${variable} to ${newTaintedVariable} at line ${lineNumber + 1}`);
        }
      }
    });
  });

  const editor = vscode.window.activeTextEditor;
  if (editor && document.uri.toString() === editor.document.uri.toString()) {
    editor.setDecorations(decorationType, decorations);

    const taintedFlowText = `\n\n// Tainted Flow Analysis Result:\n${taintedFlow.join('\n')}\n`;
    editor.edit(editBuilder => {
      const endPosition = new vscode.Position(document.lineCount, 0);
      editBuilder.insert(endPosition, taintedFlowText);
    });
  }

  vscode.window.showInformationMessage('Tainted flow analysis completed.');
  console.log('Tainted Flow:', taintedFlow.join('\n'));
}

function extractVariableName(line, source) {
  const regex = new RegExp(`(\\w+)\\s*=\\s*${source}`);
  const match = line.match(regex);
  return match ? match[1] : null;
}

function extractVariablesInLine(line) {
  const regex = /\b(\w+)\b/g;
  const matches = [];
  let match;
  while ((match = regex.exec(line)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

function extractAssignedVariable(line, variable) {
  const regex = new RegExp(`(\\w+)\\s*=\\s*${variable}`);
  const match = line.match(regex);
  return match ? match[1] : null;
}

exports.activate = activate;

function deactivate() {}

exports.deactivate = deactivate;
