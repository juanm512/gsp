
// export const adminRouter = createTRPCRouter({
//     // Obtener tareas pendientes
//     getTasks: adminProcedure
//         .input(getTasksSchema)
//         .query(async ({ ctx, input }) => {
//             // Filtrar por tipo, status, prioridad
//             // Ordenar por prioridad y fecha
//         }),

//     // Tomar tarea (asignar a admin actual)
//     claimTask: adminProcedure
//         .input(z.string())
//         .mutation(async ({ ctx, input }) => {
//             // Asignar tarea al admin
//             // Actualizar status a IN_PROGRESS
//         }),

//     // Descargar archivo para procesar
//     getDownloadUrl: adminProcedure
//         .input(z.object({ taskId: z.string(), fileType: z.string() }))
//         .query(async ({ ctx, input }) => {
//             // Generar presigned URL de descarga
//         }),

//     // Subir archivo procesado
//     uploadProcessedFile: adminProcedure
//         .input(uploadProcessedFileSchema)
//         .mutation(async ({ ctx, input }) => {
//             // Guardar archivo en S3/R2
//             // Crear registro de ProcessedFile
//             // Actualizar tarea
//             // Crear siguiente tarea si aplica
//         }),

//     // Completar tarea
//     completeTask: adminProcedure
//         .input(completeTaskSchema)
//         .mutation(async ({ ctx, input }) => {
//             // Marcar como completado
//             // Registrar notas
//             // Triggear siguiente paso
//         }),

//     // Rechazar material
//     rejectUpload: adminProcedure
//         .input(rejectUploadSchema)
//         .mutation(async ({ ctx, input }) => {
//             // Actualizar upload status a REJECTED
//             // Guardar motivo
//             // Notificar al cliente
//         }),
// });