export function addProcessingId(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev);
  next.add(id);
  return next;
}

export function removeProcessingId(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev);
  next.delete(id);
  return next;
}

export function setProcessingId(prev: Set<string>, id: string, busy: boolean): Set<string> {
  return busy ? addProcessingId(prev, id) : removeProcessingId(prev, id);
}
