import { Song } from '../types';

export interface RadioSyncState {
  currentSongIndex: number;
  currentPosition: number;
  songStartedAt: Date;
  currentPlaylistId: string | null;
  playlistOrder: string | null; // JSON string of song IDs
  isPlaying: boolean;
}

export interface SyncResult {
  shouldUpdate: boolean;
  songIndex: number;
  position: number;
  playlist: Song[];
}

/**
 * Calculate what should be playing based on the global radio state
 * @param state - Current radio state from backend
 * @param allSongs - All available songs (to reconstruct playlist)
 * @returns What song and position should be playing
 */
export function calculateCurrentPlayback(
  state: RadioSyncState | null,
  allSongs: Song[]
): SyncResult | null {
  if (!state || !state.playlistOrder || !state.isPlaying) {
    return null;
  }

  try {
    // Parse playlist order
    const songIds: string[] = JSON.parse(state.playlistOrder);
    const playlist = songIds
      .map(id => allSongs.find(s => s.id === id))
      .filter((s): s is Song => s !== undefined);

    if (playlist.length === 0) {
      return null;
    }

    // Calculate elapsed time since song started
    const now = new Date();
    const songStartTime = new Date(state.songStartedAt);
    const elapsedSeconds = Math.floor((now.getTime() - songStartTime.getTime()) / 1000);

    let currentIndex = state.currentSongIndex;
    let currentPosition = elapsedSeconds;

    // If we've passed the current song duration, advance to next songs
    while (currentIndex < playlist.length) {
      const song = playlist[currentIndex];
      if (!song.duration || currentPosition < song.duration) {
        // Found the current song
        break;
      }
      // Move to next song
      currentPosition -= song.duration;
      currentIndex++;
    }

    // Loop back to start if we've reached the end
    if (currentIndex >= playlist.length) {
      currentIndex = 0;
      currentPosition = 0;
    }

    return {
      shouldUpdate: true,
      songIndex: currentIndex,
      position: Math.max(0, currentPosition),
      playlist,
    };
  } catch (error) {
    console.error('[RadioSync] Error calculating playback:', error);
    return null;
  }
}

/**
 * Generate a shuffled playlist order (only called once by backend)
 */
export function generatePlaylistOrder(songs: Song[]): string {
  const shuffled = [...songs].sort(() => Math.random() - 0.5);
  const ids = shuffled.map(s => s.id).filter(id => id);
  return JSON.stringify(ids);
}

/**
 * Check if we need to sync with backend state
 * @param localIndex - Current song index in local player
 * @param backendIndex - Song index from backend
 * @param tolerance - How many songs difference before forcing sync
 */
export function shouldSync(
  localIndex: number,
  backendIndex: number,
  tolerance: number = 1
): boolean {
  return Math.abs(localIndex - backendIndex) > tolerance;
}
