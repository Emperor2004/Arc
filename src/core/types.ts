export interface PageLoadedPayload {
    url: string;
    title: string;
}

export interface HistoryEntry {
    id: number;
    url: string;
    title: string | null;
    visited_at: number;
    visit_count: number;
}

