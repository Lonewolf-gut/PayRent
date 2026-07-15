const STORAGE_KEY = "payforme-viewed-saved-properties";

function readViewedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeViewedIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function markSavedPropertyViewed(propertyId: string) {
  const viewed = readViewedIds();
  if (viewed.has(propertyId)) return false;
  viewed.add(propertyId);
  writeViewedIds(viewed);
  return true;
}

export function clearSavedPropertyViewed(propertyId: string) {
  const viewed = readViewedIds();
  if (!viewed.has(propertyId)) return false;
  viewed.delete(propertyId);
  writeViewedIds(viewed);
  return true;
}

export function countUnviewedSavedProperties(propertyIds: string[]) {
  const viewed = readViewedIds();
  return propertyIds.filter((id) => !viewed.has(id)).length;
}
