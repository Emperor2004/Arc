import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as historyStore from './historyStore';
import * as bookmarkStore from './bookmarkStore';
import * as feedbackStore from './feedbackStore';
import * as settingsStore from './settingsStore';
import { getJarvisRecommendations } from './recommender';
import { isSearchQuery, buildSearchUrl } from './searchEngineManager';
import * as tabGroupManager from './tabGroupManager';
import { resetDatabase } from './database';

describe('Integration Tests - API Contracts', () => {
  describe('History Store API', () => {
    it('should have required history store methods', () => {
      expect(typeof historyStore.addHistoryEntry).toBe('function');
      expect(typeof historyStore.getAllHistory).toBe('function');
      expect(typeof historyStore.getRecentHistory).toBe('function');
      expect(typeof historyStore.clearHistory).toBe('function');
      expect(typeof historyStore.removeHistoryEntry).toBe('function');
      expect(typeof historyStore.searchHistory).toBe('function');
    });

    it('should return correct types from history store', async () => {
      const entry = historyStore.addHistoryEntry('https://example.com', 'Example');
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('url');
      expect(entry).toHaveProperty('title');
      expect(entry).toHaveProperty('visited_at');
      expect(entry).toHaveProperty('visit_count');

      const history = await historyStore.getAllHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Bookmark Store API', () => {
    it('should have required bookmark store methods', () => {
      expect(typeof bookmarkStore.addBookmark).toBe('function');
      expect(typeof bookmarkStore.removeBookmark).toBe('function');
      expect(typeof bookmarkStore.getAllBookmarks).toBe('function');
      expect(typeof bookmarkStore.searchBookmarks).toBe('function');
      expect(typeof bookmarkStore.isBookmarked).toBe('function');
      expect(typeof bookmarkStore.clearBookmarks).toBe('function');
    });

    it('should return correct types from bookmark store', async () => {
      const bookmark = bookmarkStore.addBookmark('https://example.com', 'Example');
      expect(bookmark).toHaveProperty('id');
      expect(bookmark).toHaveProperty('url');
      expect(bookmark).toHaveProperty('title');
      expect(bookmark).toHaveProperty('createdAt');
      expect(bookmark).toHaveProperty('updatedAt');

      const bookmarks = await bookmarkStore.getAllBookmarks();
      expect(Array.isArray(bookmarks)).toBe(true);
    });
  });

  describe('Feedback Store API', () => {
    it('should have required feedback store methods', () => {
      expect(typeof feedbackStore.addFeedback).toBe('function');
      expect(typeof feedbackStore.getAllFeedback).toBe('function');
      expect(typeof feedbackStore.getFeedbackByUrl).toBe('function');
      expect(typeof feedbackStore.clearFeedback).toBe('function');
      expect(typeof feedbackStore.removeFeedback).toBe('function');
      expect(typeof feedbackStore.getFeedbackStats).toBe('function');
    });

    it('should return correct types from feedback store', async () => {
      const feedback = feedbackStore.addFeedback('https://example.com', 'like');
      expect(feedback).toHaveProperty('id');
      expect(feedback).toHaveProperty('url');
      expect(feedback).toHaveProperty('value');
      expect(feedback).toHaveProperty('created_at');

      const allFeedback = await feedbackStore.getAllFeedback();
      expect(Array.isArray(allFeedback)).toBe(true);
    });
  });

  describe('Settings Store API', () => {
    it('should have required settings store methods', () => {
      expect(typeof settingsStore.getSettings).toBe('function');
      expect(typeof settingsStore.updateSettings).toBe('function');
      expect(typeof settingsStore.getSetting).toBe('function');
      expect(typeof settingsStore.updateSetting).toBe('function');
      expect(typeof settingsStore.resetSettings).toBe('function');
    });

    it('should return correct types from settings store', () => {
      const settings = settingsStore.getSettings();
      expect(settings).toHaveProperty('theme');
      expect(settings).toHaveProperty('jarvisEnabled');
      expect(settings).toHaveProperty('useHistoryForRecommendations');
      expect(settings).toHaveProperty('incognitoEnabled');
    });
  });

  describe('Recommender API', () => {
    it('should have recommender function', () => {
      expect(typeof getJarvisRecommendations).toBe('function');
    });

    it('should return recommendations with correct structure', async () => {
      const recommendations = await getJarvisRecommendations(5);
      expect(Array.isArray(recommendations)).toBe(true);

      if (recommendations.length > 0) {
        const rec = recommendations[0];
        expect(rec).toHaveProperty('id');
        expect(rec).toHaveProperty('url');
        expect(rec).toHaveProperty('title');
        expect(rec).toHaveProperty('reason');
        expect(rec).toHaveProperty('score');
        expect(rec).toHaveProperty('kind');
      }
    });
  });

  describe('Search Engine Manager API', () => {
    it('should have search query detection', () => {
      expect(typeof isSearchQuery).toBe('function');
      expect(typeof buildSearchUrl).toBe('function');
    });

    it('should detect search queries correctly', () => {
      expect(isSearchQuery('hello world')).toBe(true);
      expect(isSearchQuery('https://example.com')).toBe(false);
      expect(isSearchQuery('example.com')).toBe(false);
    });

    it('should build search URLs correctly', () => {
      const url = buildSearchUrl('test query', 'google');
      expect(url).toContain('google.com');
      expect(url).toContain('test%20query');
    });
  });

  describe('Cross-Component Integration', () => {
    it('should support complete workflow: add history, bookmark, feedback, get recommendations', async () => {
      // Add history
      const historyEntry = historyStore.addHistoryEntry('https://example.com', 'Example');
      expect(historyEntry).toBeDefined();

      // Add bookmark
      const bookmark = bookmarkStore.addBookmark('https://example.com', 'Example');
      expect(bookmark).toBeDefined();

      // Add feedback
      const feedback = feedbackStore.addFeedback('https://example.com', 'like');
      expect(feedback).toBeDefined();

      // Get recommendations
      const recommendations = await getJarvisRecommendations(5);
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should support search workflow: detect query, build URL', () => {
      const query = 'test search';
      const isSearch = isSearchQuery(query);
      expect(isSearch).toBe(true);

      if (isSearch) {
        const url = buildSearchUrl(query, 'google');
        expect(url).toBeDefined();
        expect(url.length).toBeGreaterThan(0);
      }
    });

    it('should support settings workflow: get, update, reset', () => {
      // Get initial settings
      const initial = settingsStore.getSettings();
      expect(initial).toBeDefined();

      // Update settings
      const updated = settingsStore.updateSettings({ theme: 'dark' });
      expect(updated.theme).toBe('dark');

      // Reset settings
      const reset = settingsStore.resetSettings();
      expect(reset.theme).toBe('system');
    });
  });

  describe('Tab Group Integration', () => {
    beforeEach(async () => {
      await resetDatabase();
    });

    afterEach(async () => {
      await tabGroupManager.clearAllGroups();
      await resetDatabase();
    });

    it('should have required tab group manager methods', () => {
      expect(typeof tabGroupManager.createGroup).toBe('function');
      expect(typeof tabGroupManager.getGroup).toBe('function');
      expect(typeof tabGroupManager.getAllGroups).toBe('function');
      expect(typeof tabGroupManager.addTabToGroup).toBe('function');
      expect(typeof tabGroupManager.removeTabFromGroup).toBe('function');
      expect(typeof tabGroupManager.deleteGroup).toBe('function');
      expect(typeof tabGroupManager.updateGroup).toBe('function');
      expect(typeof tabGroupManager.toggleGroupCollapse).toBe('function');
    });

    it('should create and retrieve tab groups', async () => {
      const group = await tabGroupManager.createGroup('Work', 'blue');
      expect(group).toHaveProperty('id');
      expect(group).toHaveProperty('name');
      expect(group).toHaveProperty('color');
      expect(group).toHaveProperty('tabIds');
      expect(group).toHaveProperty('isCollapsed');
      expect(group).toHaveProperty('createdAt');

      const retrieved = await tabGroupManager.getGroup(group.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Work');
      expect(retrieved?.color).toBe('blue');
    });

    it('should persist tab groups across multiple operations', async () => {
      // Create groups
      const group1 = await tabGroupManager.createGroup('Work', 'blue');
      const group2 = await tabGroupManager.createGroup('Personal', 'red');

      // Add tabs to groups
      await tabGroupManager.addTabToGroup('tab-1', group1.id);
      await tabGroupManager.addTabToGroup('tab-2', group1.id);
      await tabGroupManager.addTabToGroup('tab-3', group2.id);

      // Verify persistence
      const retrieved1 = await tabGroupManager.getGroup(group1.id);
      const retrieved2 = await tabGroupManager.getGroup(group2.id);

      expect(retrieved1?.tabIds).toEqual(['tab-1', 'tab-2']);
      expect(retrieved2?.tabIds).toEqual(['tab-3']);
    });

    it('should maintain group state after updates', async () => {
      const group = await tabGroupManager.createGroup('Original', 'red');
      await tabGroupManager.addTabToGroup('tab-1', group.id);

      // Update group
      await tabGroupManager.updateGroup(group.id, {
        name: 'Updated',
        color: 'blue',
      });

      // Verify state is maintained
      const updated = await tabGroupManager.getGroup(group.id);
      expect(updated?.name).toBe('Updated');
      expect(updated?.color).toBe('blue');
      expect(updated?.tabIds).toEqual(['tab-1']);
    });

    it('should handle tab movement between groups', async () => {
      const group1 = await tabGroupManager.createGroup('Group 1', 'red');
      const group2 = await tabGroupManager.createGroup('Group 2', 'blue');

      // Add tab to group1
      await tabGroupManager.addTabToGroup('tab-1', group1.id);
      const group1AfterAdd = await tabGroupManager.getGroup(group1.id);
      expect(group1AfterAdd?.tabIds).toContain('tab-1');

      // Move tab to group2
      await tabGroupManager.addTabToGroup('tab-1', group2.id);
      const group1AfterMove = await tabGroupManager.getGroup(group1.id);
      const group2AfterMove = await tabGroupManager.getGroup(group2.id);
      expect(group1AfterMove?.tabIds).not.toContain('tab-1');
      expect(group2AfterMove?.tabIds).toContain('tab-1');
    });

    it('should support group collapse/expand workflow', async () => {
      const group = await tabGroupManager.createGroup('Test Group', 'green');
      const initialGroup = await tabGroupManager.getGroup(group.id);
      expect(initialGroup?.isCollapsed).toBe(false);

      // Collapse group
      await tabGroupManager.toggleGroupCollapse(group.id);
      const collapsedGroup = await tabGroupManager.getGroup(group.id);
      expect(collapsedGroup?.isCollapsed).toBe(true);

      // Expand group
      await tabGroupManager.toggleGroupCollapse(group.id);
      const expandedGroup = await tabGroupManager.getGroup(group.id);
      expect(expandedGroup?.isCollapsed).toBe(false);
    });

    it('should retrieve all groups in correct order', async () => {
      // Mock Date.now to return predictable timestamps
      let mockTime = 1000000000000;
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => mockTime);

      const group1 = await tabGroupManager.createGroup('Group 1', 'red');
      mockTime += 1000; // Advance time by 1 second
      const group2 = await tabGroupManager.createGroup('Group 2', 'blue');
      mockTime += 1000; // Advance time by 1 second
      const group3 = await tabGroupManager.createGroup('Group 3', 'green');

      const allGroups = await tabGroupManager.getAllGroups();
      expect(allGroups).toHaveLength(3);
      // Should be in reverse chronological order
      expect(allGroups[0].id).toBe(group3.id);
      expect(allGroups[1].id).toBe(group2.id);
      expect(allGroups[2].id).toBe(group1.id);

      // Restore original Date.now
      Date.now = originalDateNow;
    });

    it('should support complete tab group workflow', async () => {
      // Ensure clean state at start of test
      await tabGroupManager.clearAllGroups();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Create multiple groups
      const workGroup = await tabGroupManager.createGroup('Work', 'blue');
      const personalGroup = await tabGroupManager.createGroup('Personal', 'red');
      const projectGroup = await tabGroupManager.createGroup('Project', 'green');

      // Verify groups were created and are accessible
      const verifyWorkGroup = await tabGroupManager.getGroup(workGroup.id);
      const verifyPersonalGroup = await tabGroupManager.getGroup(personalGroup.id);
      const verifyProjectGroup = await tabGroupManager.getGroup(projectGroup.id);
      
      // Provide better error messages if groups are not found
      if (!verifyWorkGroup) {
        throw new Error(`Work group ${workGroup.id} was not found after creation`);
      }
      if (!verifyPersonalGroup) {
        throw new Error(`Personal group ${personalGroup.id} was not found after creation`);
      }
      if (!verifyProjectGroup) {
        throw new Error(`Project group ${projectGroup.id} was not found after creation`);
      }
      
      expect(verifyWorkGroup.id).toBe(workGroup.id);
      expect(verifyPersonalGroup.id).toBe(personalGroup.id);
      expect(verifyProjectGroup.id).toBe(projectGroup.id);

      // Add tabs to groups
      await tabGroupManager.addTabToGroup('tab-work-1', workGroup.id);
      await tabGroupManager.addTabToGroup('tab-work-2', workGroup.id);
      await tabGroupManager.addTabToGroup('tab-personal-1', personalGroup.id);
      await tabGroupManager.addTabToGroup('tab-project-1', projectGroup.id);
      await tabGroupManager.addTabToGroup('tab-project-2', projectGroup.id);
      await tabGroupManager.addTabToGroup('tab-project-3', projectGroup.id);

      // Verify all groups
      const allGroups = await tabGroupManager.getAllGroups();
      expect(allGroups).toHaveLength(3);

      // Collapse work group
      await tabGroupManager.toggleGroupCollapse(workGroup.id);
      const collapsedWorkGroup = await tabGroupManager.getGroup(workGroup.id);
      expect(collapsedWorkGroup?.isCollapsed).toBe(true);

      // Move a tab
      await tabGroupManager.addTabToGroup('tab-work-1', projectGroup.id);
      const workGroupAfterMove = await tabGroupManager.getGroup(workGroup.id);
      const projectGroupAfterMove = await tabGroupManager.getGroup(projectGroup.id);
      expect(workGroupAfterMove?.tabIds).toEqual(['tab-work-2']);
      expect(projectGroupAfterMove?.tabIds).toContain('tab-work-1');

      // Delete a group
      await tabGroupManager.deleteGroup(personalGroup.id);
      const deletedGroup = await tabGroupManager.getGroup(personalGroup.id);
      const remainingGroups = await tabGroupManager.getAllGroups();
      expect(deletedGroup).toBeNull();
      expect(remainingGroups).toHaveLength(2);
    });

    it('should simulate persistence across restart', async () => {
      // Simulate first session: create groups and add tabs
      const group1 = await tabGroupManager.createGroup('Session 1 Group', 'blue');
      await tabGroupManager.addTabToGroup('tab-1', group1.id);
      await tabGroupManager.addTabToGroup('tab-2', group1.id);

      // Simulate restart: retrieve groups from database
      const retrievedGroup = await tabGroupManager.getGroup(group1.id);
      expect(retrievedGroup).toBeDefined();
      expect(retrievedGroup?.name).toBe('Session 1 Group');
      expect(retrievedGroup?.tabIds).toEqual(['tab-1', 'tab-2']);

      // Simulate second session: continue with existing groups
      await tabGroupManager.addTabToGroup('tab-3', group1.id);
      const updatedGroup = await tabGroupManager.getGroup(group1.id);
      expect(updatedGroup?.tabIds).toEqual(['tab-1', 'tab-2', 'tab-3']);
    });

    it('should maintain group integrity with large number of tabs', async () => {
      const group = await tabGroupManager.createGroup('Large Group', 'purple');

      // Verify group was created
      const verifyGroup = await tabGroupManager.getGroup(group.id);
      expect(verifyGroup).toBeTruthy();

      // Add many tabs
      for (let i = 0; i < 50; i++) {
        await tabGroupManager.addTabToGroup(`tab-${i}`, group.id);
      }

      // Verify all tabs are present
      const retrieved = await tabGroupManager.getGroup(group.id);
      expect(retrieved?.tabIds).toHaveLength(50);

      // Remove some tabs
      for (let i = 0; i < 10; i++) {
        await tabGroupManager.removeTabFromGroup(`tab-${i}`, group.id);
      }

      // Verify correct number of tabs remain
      const updated = await tabGroupManager.getGroup(group.id);
      expect(updated?.tabIds).toHaveLength(40);
    });
  });
});
