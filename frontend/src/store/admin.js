import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Admin store — local diff over the read-only base data.
 *
 * Shape:
 *   edits   : { [id]: Partial<Question> }   // patches over existing questions
 *   adds    : Question[]                    // brand-new questions
 *   deletes : Record<id, true>              // ids removed from the base set
 *
 * Persisted to localStorage so an editing session survives refreshes.
 * Apply the diff to the base via {@link applyDiff} for reads, never mutate
 * the base array directly.
 */

const empty = () => ({ edits: {}, adds: [], deletes: {} });

export const useAdmin = create(
  persist(
    (set, get) => ({
      ...empty(),

      // ── Question ops ────────────────────────────────────
      patch(id, partial) {
        set((s) => {
          // If this is an "added" question, mutate the entry directly
          const addIdx = s.adds.findIndex((q) => q.id === id);
          if (addIdx !== -1) {
            const adds = [...s.adds];
            adds[addIdx] = { ...adds[addIdx], ...partial };
            return { adds };
          }
          return { edits: { ...s.edits, [id]: { ...(s.edits[id] || {}), ...partial } } };
        });
      },

      add(question) {
        set((s) => ({ adds: [...s.adds, question] }));
      },

      remove(id) {
        set((s) => {
          // If it was an addition, just drop the addition
          const addIdx = s.adds.findIndex((q) => q.id === id);
          if (addIdx !== -1) {
            const adds = [...s.adds];
            adds.splice(addIdx, 1);
            return { adds };
          }
          // Otherwise mark as deleted from the base
          return {
            deletes: { ...s.deletes, [id]: true },
            edits: Object.fromEntries(Object.entries(s.edits).filter(([k]) => +k !== id)),
          };
        });
      },

      restore(id) {
        set((s) => {
          const deletes = { ...s.deletes };
          delete deletes[id];
          return { deletes };
        });
      },

      revertEdit(id) {
        set((s) => {
          const edits = { ...s.edits };
          delete edits[id];
          return { edits };
        });
      },

      reset() {
        set(empty());
      },
    }),
    {
      name: 'rtf:admin:diff:v1',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/**
 * Project the diff onto the base list and return the merged view.
 * Sort is preserved: existing items stay in their original order; additions
 * append at the end of their topic group sorted by order_index.
 */
export function applyDiff(base, diff) {
  const deletes = diff.deletes || {};
  const edits = diff.edits || {};
  const adds = diff.adds || [];
  const merged = base
    .filter((q) => !deletes[q.id])
    .map((q) => (edits[q.id] ? { ...q, ...edits[q.id] } : q));
  return [...merged, ...adds];
}

/**
 * Marks the lifecycle status of a question relative to the diff.
 */
export function statusOf(id, diff) {
  if (diff.deletes?.[id]) return 'deleted';
  if (diff.adds?.some((q) => q.id === id)) return 'added';
  if (diff.edits?.[id]) return 'modified';
  return 'clean';
}
