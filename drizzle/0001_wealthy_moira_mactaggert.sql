CREATE TABLE `radioState` (
	`id` int AUTO_INCREMENT NOT NULL,
	`currentSongIndex` int NOT NULL DEFAULT 0,
	`currentPosition` int NOT NULL DEFAULT 0,
	`songStartedAt` timestamp NOT NULL DEFAULT (now()),
	`currentPlaylistId` varchar(64),
	`playlistOrder` text,
	`isPlaying` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `radioState_id` PRIMARY KEY(`id`)
);
