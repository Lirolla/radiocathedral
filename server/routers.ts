import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Radio synchronization router
  radio: router({
    // Get current radio state (what's playing globally)
    getState: publicProcedure.query(async () => {
      const state = await db.getRadioState();
      return state;
    }),

    // Update radio state (called by AutoDJ or Schedule)
    updateState: publicProcedure
      .input(z.object({
        currentSongIndex: z.number().optional(),
        currentPosition: z.number().optional(),
        songStartedAt: z.date().optional(),
        currentPlaylistId: z.string().optional(),
        playlistOrder: z.string().optional(),
        isPlaying: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const state = await db.updateRadioState(input);
        return state;
      }),

    // Initialize radio state (first time setup)
    initState: publicProcedure
      .input(z.object({
        playlistId: z.string(),
        playlistOrder: z.string(),
      }))
      .mutation(async ({ input }) => {
        const state = await db.initRadioState(input.playlistId, input.playlistOrder);
        return state;
      }),
  }),
});

export type AppRouter = typeof appRouter;
