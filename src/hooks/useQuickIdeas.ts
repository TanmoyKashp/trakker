import { useCallback, useEffect, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { syncIdeasToFirestore } from "../lib/firestoreSync";
import type { QuickIdea, QuickIdeaStatus } from "../types";

const STORAGE_KEY = "trakker:ideas:v1";

export function useQuickIdeas(userId?: string | null) {
  const [ideas, setIdeas] = useLocalStorage<QuickIdea[]>(STORAGE_KEY, []);

  // Listen for remote Firestore sync updates
  useEffect(() => {
    function handleRemoteSync(event: Event) {
      const customEvent = event as CustomEvent<QuickIdea[]>;
      if (customEvent.detail) {
        setIdeas(customEvent.detail);
      }
    }
    window.addEventListener("trakker:sync:ideas", handleRemoteSync);
    return () => window.removeEventListener("trakker:sync:ideas", handleRemoteSync);
  }, [setIdeas]);

  // Sync to Firestore on local changes
  useEffect(() => {
    if (userId) {
      syncIdeasToFirestore(userId, ideas);
    }
  }, [ideas, userId]);

  // Newest first
  const sortedIdeas = useMemo(() => {
    return [...ideas].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [ideas]);

  const addIdea = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return null;
      const idea: QuickIdea = {
        id: crypto.randomUUID(),
        text: trimmed,
        createdAt: new Date().toISOString(),
        status: "open",
      };
      setIdeas((current) => [idea, ...current]);
      return idea;
    },
    [setIdeas],
  );

  const updateIdeaStatus = useCallback(
    (id: string, status: QuickIdeaStatus) => {
      setIdeas((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
    },
    [setIdeas],
  );

  const toggleComplete = useCallback(
    (id: string) => {
      setIdeas((current) =>
        current.map((item) => {
          if (item.id !== id) return item;
          return {
            ...item,
            status: item.status === "completed" ? "open" : "completed",
          };
        }),
      );
    },
    [setIdeas],
  );

  const toggleArchive = useCallback(
    (id: string) => {
      setIdeas((current) =>
        current.map((item) => {
          if (item.id !== id) return item;
          return {
            ...item,
            status: item.status === "archived" ? "open" : "archived",
          };
        }),
      );
    },
    [setIdeas],
  );

  const deleteIdea = useCallback(
    (id: string) => {
      setIdeas((current) => current.filter((item) => item.id !== id));
    },
    [setIdeas],
  );

  return {
    ideas: sortedIdeas,
    addIdea,
    updateIdeaStatus,
    toggleComplete,
    toggleArchive,
    deleteIdea,
  };
}
