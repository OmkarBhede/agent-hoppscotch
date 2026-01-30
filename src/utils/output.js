export function formatTable(rows, columns) {
  if (!rows || rows.length === 0) {
    return 'No results found.';
  }

  const widths = columns.map(col => {
    const headerLen = col.header.length;
    const maxDataLen = Math.max(...rows.map(r => String(r[col.key] ?? '').length));
    return Math.max(headerLen, maxDataLen);
  });

  const header = columns.map((col, i) => col.header.padEnd(widths[i])).join(' │ ');
  const separator = widths.map(w => '─'.repeat(w)).join('─┼─');

  const dataRows = rows.map(row =>
    columns.map((col, i) => String(row[col.key] ?? '').padEnd(widths[i])).join(' │ ')
  );

  return [header, separator, ...dataRows].join('\n');
}

export function output(data, opts = {}) {
  if (opts.json) {
    console.log(JSON.stringify(data, null, 2));
  } else if (Array.isArray(data) && data.length > 0 && opts.columns) {
    console.log(formatTable(data, opts.columns));
  } else if (typeof data === 'object') {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

export function success(message) {
  console.log(`✓ ${message}`);
}

export function error(message) {
  console.error(`Error: ${message}`);
}
