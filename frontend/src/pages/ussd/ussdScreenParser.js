/**
 * Parse CON/END USSD screen text into display body and menu options.
 */
export function parseUssdScreen(raw) {
  const text = String(raw || '').trim();
  const isEnd = text.startsWith('END');
  const isCon = text.startsWith('CON');
  const body = text.replace(/^(CON|END)\s*/, '').trim();

  const options = [];
  const lines = body.split('\n');
  const contentLines = [];

  for (const line of lines) {
    const match = line.match(/^(\d+)\.\s*(.+)$/);
    if (match) {
      options.push({ key: match[1], label: match[2].trim() });
    } else {
      contentLines.push(line);
    }
  }

  const prompt = contentLines.join('\n').trim();
  let inputMode = 'none';

  if (isEnd) {
    inputMode = 'none';
  } else if (options.length > 0) {
    inputMode = 'menu';
  } else if (/enter.*(name|area|location)/i.test(prompt)) {
    inputMode = 'text';
  } else if (/enter.*(weight|kg|amount)/i.test(prompt) || /enter amount/i.test(prompt)) {
    inputMode = 'numeric';
  } else if (/confirm|cancel/i.test(prompt)) {
    inputMode = 'menu';
  } else if (prompt) {
    inputMode = 'text';
  }

  return { isEnd, isCon, body, prompt, options, inputMode };
}

export function parseJourneyFromEnd(body) {
  const updates = {};
  if (/registration successful/i.test(body)) updates.registered = true;
  const job = body.match(/Job ([A-Z0-9-]+)/i);
  if (job) updates.jobCode = job[1];
  if (/withdrawal request received/i.test(body)) updates.withdrawSubmitted = true;

  const available = body.match(/Available: UGX ([\d,]+)/);
  const processing = body.match(/Processing: UGX ([\d,]+)/);
  const paid = body.match(/Paid: UGX ([\d,]+)/);
  if (available || processing || paid) {
    updates.earnings = {
      available: Number((available?.[1] || '0').replace(/,/g, '')),
      processing: Number((processing?.[1] || '0').replace(/,/g, '')),
      paid: Number((paid?.[1] || '0').replace(/,/g, '')),
    };
  }

  return updates;
}
