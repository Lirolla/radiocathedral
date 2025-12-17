import { useEffect, useRef, useState } from 'react';
import { trpc } from '../lib/trpc';
import { Song } from '../types';
import { calculateCurrentPlayback, RadioSyncState } from '../services/radioSyncService';

interface UseRadioSyncOptions {
  enabled: boolean;
  allSongs: Song[];
  onSync: (songIndex: number, position: number, playlist: Song[]) => void;
  syncInterval?: number; // milliseconds
}

export function useRadioSync({
  enabled,
  allSongs,
  onSync,
  syncInterval = 5000, // Sync every 5 seconds
}: UseRadioSyncOptions) {
  const [isSyncing, setIsSyncing] = useState(false);
  const lastSyncRef = useRef<number>(0);

  // Query radio state
  const { data: radioState, refetch } = trpc.radio.getState.useQuery(undefined, {
    enabled,
    refetchInterval: syncInterval,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!enabled || !radioState || allSongs.length === 0) {
      return;
    }

    const now = Date.now();
    // Prevent syncing too frequently
    if (now - lastSyncRef.current < syncInterval - 1000) {
      return;
    }

    setIsSyncing(true);
    lastSyncRef.current = now;

    try {
      const syncState: RadioSyncState = {
        currentSongIndex: radioState.currentSongIndex,
        currentPosition: radioState.currentPosition,
        songStartedAt: new Date(radioState.songStartedAt),
        currentPlaylistId: radioState.currentPlaylistId,
        playlistOrder: radioState.playlistOrder,
        isPlaying: radioState.isPlaying === 1,
      };

      const result = calculateCurrentPlayback(syncState, allSongs);

      if (result && result.shouldUpdate) {
        console.log('[RadioSync] Syncing to:', {
          songIndex: result.songIndex,
          position: result.position,
          song: result.playlist[result.songIndex]?.title,
        });

        onSync(result.songIndex, result.position, result.playlist);
      }
    } catch (error) {
      console.error('[RadioSync] Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [radioState, enabled, allSongs, onSync, syncInterval]);

  return {
    radioState,
    isSyncing,
    refetch,
  };
}
