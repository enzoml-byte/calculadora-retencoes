declare module "pdf-parse" {
  const pdf: (buffer: Buffer, options?: Record<string, unknown>) => Promise<{ text: string }>;
  export default pdf;
}
