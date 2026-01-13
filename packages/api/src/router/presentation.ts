// export const presentationRouter = createTRPCRouter({
//     // Crear presentación
//     create: protectedProcedure
//         .input(createPresentationSchema)
//         .mutation(async ({ ctx, input }) => {
//             // Verificar permisos del equipo
//             // Crear presentación en DB
//             // Retornar presentación creada
//         }),

//     // Listar presentaciones del equipo
//     list: protectedProcedure
//         .input(z.object({ teamId: z.string() }))
//         .query(async ({ ctx, input }) => {
//             // Verificar membresía
//             // Retornar presentaciones con status
//         }),

//     // Obtener detalle
//     getById: protectedProcedure
//         .input(z.string())
//         .query(async ({ ctx, input }) => {
//             // Retornar presentación completa con archivos
//         }),

//     // Iniciar upload
//     initiateUpload: protectedProcedure
//         .input(initiateUploadSchema)
//         .mutation(async ({ ctx, input }) => {
//             // Generar presigned URLs para S3/R2
//             // Crear registro de Upload en DB
//         }),

//     // Confirmar upload completado
//     confirmUpload: protectedProcedure
//         .input(z.object({ uploadId: z.string() }))
//         .mutation(async ({ ctx, input }) => {
//             // Actualizar status
//             // Crear AdminTask para revisión
//             // Triggear procesamiento automático si aplica
//         }),
// });