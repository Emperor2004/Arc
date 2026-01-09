"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TabReorderManager = void 0;
/**
 * TabReorderManager handles tab reordering logic
 */
class TabReorderManager {
    constructor(initialOrder = []) {
        this.tabOrder = [];
        this.listeners = new Set();
        this.tabOrder = [...initialOrder];
    }
    /**
     * Handle drag and drop result
     */
    handleDragEnd(result) {
        const { source, destination, draggableId } = result;
        // If dropped outside the list, no change
        if (!destination) {
            return false;
        }
        // If dropped in the same position, no change
        if (source.droppableId === destination.droppableId &&
            source.index === destination.index) {
            return false;
        }
        // Reorder tabs
        const newOrder = Array.from(this.tabOrder);
        const draggedTabId = draggableId;
        const draggedIndex = newOrder.indexOf(draggedTabId);
        if (draggedIndex === -1) {
            return false; // Tab not found
        }
        // Remove from old position
        newOrder.splice(draggedIndex, 1);
        // Insert at new position
        newOrder.splice(destination.index, 0, draggedTabId);
        this.tabOrder = newOrder;
        this.notifyListeners();
        return true;
    }
    /**
     * Add a new tab to the order
     */
    addTab(tabId, position) {
        if (this.tabOrder.includes(tabId)) {
            return; // Tab already exists
        }
        if (position !== undefined && position >= 0 && position <= this.tabOrder.length) {
            this.tabOrder.splice(position, 0, tabId);
        }
        else {
            this.tabOrder.push(tabId);
        }
        this.notifyListeners();
    }
    /**
     * Remove a tab from the order
     */
    removeTab(tabId) {
        const index = this.tabOrder.indexOf(tabId);
        if (index !== -1) {
            this.tabOrder.splice(index, 1);
            this.notifyListeners();
        }
    }
    /**
     * Get current tab order
     */
    getTabOrder() {
        return [...this.tabOrder];
    }
    /**
     * Set tab order (useful for restoring from persistence)
     */
    setTabOrder(order) {
        this.tabOrder = [...order];
        this.notifyListeners();
    }
    /**
     * Get position of a tab
     */
    getTabPosition(tabId) {
        return this.tabOrder.indexOf(tabId);
    }
    /**
     * Check if tab exists in order
     */
    hasTab(tabId) {
        return this.tabOrder.includes(tabId);
    }
    /**
     * Get tab at position
     */
    getTabAtPosition(position) {
        return this.tabOrder[position];
    }
    /**
     * Subscribe to tab order changes
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    /**
     * Notify all listeners of tab order change
     */
    notifyListeners() {
        this.listeners.forEach(listener => listener([...this.tabOrder]));
    }
    /**
     * Clear all tabs
     */
    clear() {
        this.tabOrder = [];
        this.notifyListeners();
    }
    /**
     * Get number of tabs
     */
    getTabCount() {
        return this.tabOrder.length;
    }
}
exports.TabReorderManager = TabReorderManager;
