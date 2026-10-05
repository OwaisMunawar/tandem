import { parseQuickAdd } from '../lib/localParser';
import { sanitizeDrafts } from '../lib/sanitize';
import { type QuickAddParser } from './QuickAddParser';

export const localQuickAddParser: QuickAddParser = {
  kind: 'local',
  parse: async (request) => sanitizeDrafts(parseQuickAdd(request), request),
};
