// Small helpers for asking questions in the terminal.
// Used by the database setup scripts, which are run by hand by the person setting up the project.
const readline = require('readline');

function openPrompt() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const lines = [];
  const waiting = [];
  let closed = false;
  let muted = false;

  // Lines are collected as they arrive, so typed or piped answers are never lost
  rl.on('line', (line) => {
    if (waiting.length > 0) waiting.shift()(line);
    else lines.push(line);
  });
  rl.on('close', () => {
    closed = true;
    while (waiting.length > 0) waiting.shift()('');
  });

  // While muted, only the question is printed and the typed letters stay hidden
  const originalWrite = rl._writeToOutput.bind(rl);
  rl._writeToOutput = (text) => {
    if (!muted) originalWrite(text);
  };

  function ask(question, { hidden = false } = {}) {
    process.stdout.write(question);
    muted = hidden && process.stdin.isTTY === true;
    return new Promise((resolve) => {
      const finish = (line) => {
        muted = false;
        if (hidden && process.stdin.isTTY) process.stdout.write('\n');
        resolve(line);
      };
      if (lines.length > 0) finish(lines.shift());
      else if (closed) finish('');
      else waiting.push(finish);
    });
  }

  return { ask, close: () => rl.close() };
}

module.exports = { openPrompt };
