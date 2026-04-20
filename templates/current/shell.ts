/**
 * Outer layout classes for the `current` template (page backdrop, letter article).
 * Paired with `--t-current-*` tokens in `app/globals.css`.
 */
export const currentTemplateShell = {
  mainClassName:
    "bg-(--t-current-backdrop) flex min-h-screen justify-center px-3 py-6 print:block print:bg-white print:p-0 sm:px-6 md:px-8",
  articleClassName:
    "bg-(--t-current-paper) text-body relative min-h-0 w-full max-w-[8.5in] rounded-lg pb-[0.3in] pt-[0.2in] font-sans text-[8.5pt] leading-[1.4] shadow-md [zoom:var(--t-current-scale)] print:min-h-[11in] print:w-[8.5in] print:max-w-[8.5in] print:rounded-none print:shadow-none print:[zoom:1] md:min-h-[11in] md:rounded-none md:pt-[0.35in]",
} as const;
