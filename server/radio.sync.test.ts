import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getRadioState, updateRadioState, initRadioState } from './db';

describe('Radio Synchronization System', () => {
  beforeAll(async () => {
    // Clean up any existing state
    const existing = await getRadioState();
    if (existing) {
      await updateRadioState({ isPlaying: 0 });
    }
  });

  it('should initialize radio state with playlist', async () => {
    const testPlaylistId = 'test-playlist-123';
    const testPlaylistOrder = JSON.stringify(['song1', 'song2', 'song3']);

    const result = await initRadioState(testPlaylistId, testPlaylistOrder);

    expect(result).toBeTruthy();
    expect(result?.currentPlaylistId).toBe(testPlaylistId);
    expect(result?.playlistOrder).toBe(testPlaylistOrder);
    expect(result?.currentSongIndex).toBe(0);
    expect(result?.currentPosition).toBe(0);
    expect(result?.isPlaying).toBe(1);
  });

  it('should get current radio state', async () => {
    const state = await getRadioState();

    expect(state).toBeTruthy();
    expect(state?.currentPlaylistId).toBe('test-playlist-123');
    expect(state?.isPlaying).toBe(1);
  });

  it('should update radio state', async () => {
    const updates = {
      currentSongIndex: 1,
      currentPosition: 45,
      isPlaying: 1,
    };

    const result = await updateRadioState(updates);

    expect(result).toBeTruthy();
    expect(result?.currentSongIndex).toBe(1);
    expect(result?.currentPosition).toBe(45);
    expect(result?.isPlaying).toBe(1);
  });

  it('should handle smooth transition between playlists', async () => {
    // Simulate schedule change
    const newPlaylistId = 'new-playlist-456';
    const newPlaylistOrder = JSON.stringify(['newsong1', 'newsong2']);

    const result = await initRadioState(newPlaylistId, newPlaylistOrder);

    expect(result).toBeTruthy();
    expect(result?.currentPlaylistId).toBe(newPlaylistId);
    expect(result?.playlistOrder).toBe(newPlaylistOrder);
    expect(result?.currentSongIndex).toBe(0); // Reset to first song
  });

  afterAll(async () => {
    // Clean up
    await updateRadioState({ isPlaying: 0 });
  });
});
