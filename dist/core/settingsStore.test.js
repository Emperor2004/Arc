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
const vitest_1 = require("vitest");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const settingsStore_1 = require("./settingsStore");
// Mock fs module
vitest_1.vi.mock('fs');
vitest_1.vi.mock('path');
(0, vitest_1.describe)('SettingsStore Module', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        // Mock path.join to return a consistent path
        vitest_1.vi.mocked(path.join).mockReturnValue('/mock/settings.json');
        // Mock fs.existsSync to return true
        vitest_1.vi.mocked(fs.existsSync).mockReturnValue(true);
    });
    (0, vitest_1.describe)('getSettings', () => {
        (0, vitest_1.it)('should return default settings when file does not exist', () => {
            vitest_1.vi.mocked(fs.existsSync).mockReturnValue(false);
            const settings = (0, settingsStore_1.getSettings)();
            (0, vitest_1.expect)(settings.theme).toBe('system');
            (0, vitest_1.expect)(settings.jarvisEnabled).toBe(true);
            (0, vitest_1.expect)(settings.incognitoEnabled).toBe(true);
        });
        (0, vitest_1.it)('should load settings from file', () => {
            const savedSettings = {
                theme: 'dark',
                jarvisEnabled: false,
                useHistoryForRecommendations: true,
                incognitoEnabled: true,
            };
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(savedSettings));
            const settings = (0, settingsStore_1.getSettings)();
            (0, vitest_1.expect)(settings.theme).toBe('dark');
            (0, vitest_1.expect)(settings.jarvisEnabled).toBe(false);
        });
        (0, vitest_1.it)('should merge saved settings with defaults', () => {
            const partialSettings = {
                theme: 'dark',
            };
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(partialSettings));
            const settings = (0, settingsStore_1.getSettings)();
            (0, vitest_1.expect)(settings.theme).toBe('dark');
            (0, vitest_1.expect)(settings.jarvisEnabled).toBe(true); // Default value
        });
    });
    (0, vitest_1.describe)('updateSettings', () => {
        (0, vitest_1.it)('should update multiple settings', () => {
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('{}');
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            const updated = (0, settingsStore_1.updateSettings)({
                theme: 'dark',
                jarvisEnabled: false,
            });
            (0, vitest_1.expect)(updated.theme).toBe('dark');
            (0, vitest_1.expect)(updated.jarvisEnabled).toBe(false);
        });
        (0, vitest_1.it)('should preserve existing settings', () => {
            const existingSettings = {
                theme: 'light',
                jarvisEnabled: true,
                useHistoryForRecommendations: true,
                incognitoEnabled: true,
            };
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingSettings));
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            const updated = (0, settingsStore_1.updateSettings)({ theme: 'dark' });
            (0, vitest_1.expect)(updated.theme).toBe('dark');
            (0, vitest_1.expect)(updated.jarvisEnabled).toBe(true);
        });
        (0, vitest_1.it)('should save settings to file', () => {
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('{}');
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            (0, settingsStore_1.updateSettings)({ theme: 'dark' });
            (0, vitest_1.expect)(vitest_1.vi.mocked(fs.writeFileSync)).toHaveBeenCalled();
            const writeCall = vitest_1.vi.mocked(fs.writeFileSync).mock.calls[0];
            const writtenData = JSON.parse(writeCall[1]);
            (0, vitest_1.expect)(writtenData.theme).toBe('dark');
        });
    });
    (0, vitest_1.describe)('getSetting', () => {
        (0, vitest_1.it)('should get a specific setting', () => {
            const settings = {
                theme: 'dark',
                jarvisEnabled: false,
                useHistoryForRecommendations: true,
                incognitoEnabled: true,
            };
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settings));
            const theme = (0, settingsStore_1.getSetting)('theme');
            (0, vitest_1.expect)(theme).toBe('dark');
        });
        (0, vitest_1.it)('should return default value if setting not found', () => {
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue('{}');
            const jarvisEnabled = (0, settingsStore_1.getSetting)('jarvisEnabled');
            (0, vitest_1.expect)(jarvisEnabled).toBe(true);
        });
    });
    (0, vitest_1.describe)('updateSetting', () => {
        (0, vitest_1.it)('should update a specific setting', () => {
            const existingSettings = {
                theme: 'light',
                jarvisEnabled: true,
                useHistoryForRecommendations: true,
                incognitoEnabled: true,
            };
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingSettings));
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            (0, settingsStore_1.updateSetting)('theme', 'dark');
            const writeCall = vitest_1.vi.mocked(fs.writeFileSync).mock.calls[0];
            const writtenData = JSON.parse(writeCall[1]);
            (0, vitest_1.expect)(writtenData.theme).toBe('dark');
        });
        (0, vitest_1.it)('should preserve other settings', () => {
            const existingSettings = {
                theme: 'light',
                jarvisEnabled: true,
                useHistoryForRecommendations: true,
                incognitoEnabled: true,
            };
            vitest_1.vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingSettings));
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            (0, settingsStore_1.updateSetting)('theme', 'dark');
            const writeCall = vitest_1.vi.mocked(fs.writeFileSync).mock.calls[0];
            const writtenData = JSON.parse(writeCall[1]);
            (0, vitest_1.expect)(writtenData.jarvisEnabled).toBe(true);
        });
    });
    (0, vitest_1.describe)('resetSettings', () => {
        (0, vitest_1.it)('should reset settings to defaults', () => {
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            const reset = (0, settingsStore_1.resetSettings)();
            (0, vitest_1.expect)(reset.theme).toBe('system');
            (0, vitest_1.expect)(reset.jarvisEnabled).toBe(true);
            (0, vitest_1.expect)(reset.incognitoEnabled).toBe(true);
        });
        (0, vitest_1.it)('should save default settings to file', () => {
            vitest_1.vi.mocked(fs.writeFileSync).mockImplementation(() => { });
            (0, settingsStore_1.resetSettings)();
            (0, vitest_1.expect)(vitest_1.vi.mocked(fs.writeFileSync)).toHaveBeenCalled();
            const writeCall = vitest_1.vi.mocked(fs.writeFileSync).mock.calls[0];
            const writtenData = JSON.parse(writeCall[1]);
            (0, vitest_1.expect)(writtenData.theme).toBe('system');
        });
    });
});
