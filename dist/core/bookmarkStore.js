"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.addBookmark = addBookmark;
exports.removeBookmark = removeBookmark;
exports.getAllBookmarks = getAllBookmarks;
exports.getBookmarkById = getBookmarkById;
exports.searchBookmarks = searchBookmarks;
exports.updateBookmark = updateBookmark;
exports.isBookmarked = isBookmarked;
exports.getBookmarksByTag = getBookmarksByTag;
exports.clearBookmarks = clearBookmarks;
exports.getBookmarksSorted = getBookmarksSorted;
exports.exportBookmarks = exportBookmarks;
exports.importBookmarks = importBookmarks;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const BOOKMARKS_FILE = path.join(process.env.APPDATA || process.env.HOME || '.', 'arc-browser', 'data', 'bookmarks.json');
// Ensure directory exists
function ensureDir() {
    const dir = path.dirname(BOOKMARKS_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
/**
 * Load bookmarks from file
 */
function loadBookmarks() {
    try {
        ensureDir();
        if (fs.existsSync(BOOKMARKS_FILE)) {
            const data = fs.readFileSync(BOOKMARKS_FILE, 'utf-8');
            return JSON.parse(data);
        }
    }
    catch (error) {
        console.error('Error loading bookmarks:', error);
    }
    return [];
}
/**
 * Save bookmarks to file
 */
function saveBookmarks(bookmarks) {
    try {
        ensureDir();
        fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(bookmarks, null, 2), 'utf-8');
    }
    catch (error) {
        console.error('Error saving bookmarks:', error);
    }
}
/**
 * Generate unique ID for bookmark
 */
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Add a new bookmark
 */
function addBookmark(url, title, tags) {
    const bookmarks = loadBookmarks();
    const now = Date.now();
    const newBookmark = {
        id: generateId(),
        url,
        title,
        createdAt: now,
        updatedAt: now,
        tags: tags || [],
    };
    bookmarks.push(newBookmark);
    saveBookmarks(bookmarks);
    return newBookmark;
}
/**
 * Remove a bookmark by ID
 */
function removeBookmark(id) {
    const bookmarks = loadBookmarks();
    const initialLength = bookmarks.length;
    const filtered = bookmarks.filter(b => b.id !== id);
    if (filtered.length < initialLength) {
        saveBookmarks(filtered);
        return true;
    }
    return false;
}
/**
 * Get all bookmarks
 */
async function getAllBookmarks() {
    return loadBookmarks();
}
/**
 * Get bookmark by ID
 */
async function getBookmarkById(id) {
    const bookmarks = loadBookmarks();
    return bookmarks.find(b => b.id === id) || null;
}
/**
 * Search bookmarks by URL or title
 */
async function searchBookmarks(query) {
    const bookmarks = loadBookmarks();
    const lowerQuery = query.toLowerCase();
    return bookmarks.filter(b => b.url.toLowerCase().includes(lowerQuery) ||
        b.title.toLowerCase().includes(lowerQuery) ||
        (b.tags && b.tags.some(tag => tag.toLowerCase().includes(lowerQuery))));
}
/**
 * Update a bookmark
 */
function updateBookmark(id, updates) {
    const bookmarks = loadBookmarks();
    const index = bookmarks.findIndex(b => b.id === id);
    if (index === -1) {
        return null;
    }
    const updated = {
        ...bookmarks[index],
        ...updates,
        id: bookmarks[index].id, // Preserve ID
        createdAt: bookmarks[index].createdAt, // Preserve creation time
        updatedAt: Date.now(), // Update modification time
    };
    bookmarks[index] = updated;
    saveBookmarks(bookmarks);
    return updated;
}
/**
 * Check if URL is bookmarked
 */
async function isBookmarked(url) {
    const bookmarks = loadBookmarks();
    return bookmarks.some(b => b.url === url);
}
/**
 * Get bookmarks by tag
 */
async function getBookmarksByTag(tag) {
    const bookmarks = loadBookmarks();
    return bookmarks.filter(b => b.tags && b.tags.includes(tag));
}
/**
 * Clear all bookmarks
 */
function clearBookmarks() {
    saveBookmarks([]);
}
/**
 * Get bookmarks sorted by creation date
 */
async function getBookmarksSorted(order = 'desc') {
    const bookmarks = loadBookmarks();
    return bookmarks.sort((a, b) => {
        return order === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt;
    });
}
/**
 * Export bookmarks to JSON
 */
function exportBookmarks() {
    const bookmarks = loadBookmarks();
    return JSON.stringify(bookmarks, null, 2);
}
/**
 * Import bookmarks from JSON
 */
function importBookmarks(jsonData, mode = 'merge') {
    try {
        const importedBookmarks = JSON.parse(jsonData);
        if (!Array.isArray(importedBookmarks)) {
            throw new Error('Invalid bookmark data format');
        }
        if (mode === 'replace') {
            saveBookmarks(importedBookmarks);
            return importedBookmarks;
        }
        else {
            // Merge mode: avoid duplicates by URL
            const existing = loadBookmarks();
            const existingUrls = new Set(existing.map(b => b.url));
            const newBookmarks = importedBookmarks.filter(b => !existingUrls.has(b.url));
            const merged = [...existing, ...newBookmarks];
            saveBookmarks(merged);
            return merged;
        }
    }
    catch (error) {
        console.error('Error importing bookmarks:', error);
        throw error;
    }
}
