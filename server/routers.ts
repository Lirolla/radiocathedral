import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { uploadSongToR2, createFolderInR2, listFilesFromR2, deleteFolderFromR2, deleteFileFromR2 } from "./r2Storage";

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

  // Routers de upload R2
  r2: router({
    // Upload de música
    uploadSong: publicProcedure
      .input(z.object({
        fileBase64: z.string(),
        fileName: z.string(),
        folderName: z.string(),
        contentType: z.string(),
      }))
      .mutation(async ({ input }) => {
        console.log('[uploadSong] Input recebido (sem base64):', {
          fileName: input.fileName,
          folderName: input.folderName,
          contentType: input.contentType,
          base64Length: input.fileBase64?.length || 0
        });
        // Converter base64 para buffer
        const fileBuffer = Buffer.from(input.fileBase64, 'base64');
        
        const result = await uploadSongToR2(
          fileBuffer,
          input.fileName,
          input.folderName,
          input.contentType
        );
        
        return result;
      }),
    
    // Criar pasta
    createFolder: publicProcedure
      .input(z.object({
        folderName: z.string(),
      }))
      .mutation(async ({ input }) => {
        console.log('[createFolder] Input recebido:', JSON.stringify(input, null, 2));
        console.log('[createFolder] folderName:', input.folderName);
        const success = await createFolderInR2(input.folderName);
        console.log('[createFolder] Resultado:', success);
        return { success };
      }),
    
    // Deletar pasta
    deleteFolder: publicProcedure
      .input(z.object({
        folderName: z.string(),
      }))
      .mutation(async ({ input }) => {
        console.log('[deleteFolder] Deletando pasta:', input.folderName);
        const success = await deleteFolderFromR2(input.folderName);
        console.log('[deleteFolder] Resultado:', success);
        return { success };
      }),
    
    // Listar arquivos de uma pasta
    listFiles: publicProcedure
      .input(z.object({
        folderName: z.string(),
      }))
      .query(async ({ input }) => {
        const files = await listFilesFromR2(input.folderName);
        return files;
      }),
    
    // Deletar arquivo individual
    deleteFile: publicProcedure
      .input(z.object({
        fileKey: z.string(),
      }))
      .mutation(async ({ input }) => {
        console.log('[deleteFile] Deletando arquivo:', input.fileKey);
        const success = await deleteFileFromR2(input.fileKey);
        console.log('[deleteFile] Resultado:', success);
        return { success };
      }),
  }),
});

export type AppRouter = typeof appRouter;
