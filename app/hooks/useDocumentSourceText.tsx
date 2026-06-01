import { createContext, useContext } from "react";

const DocumentSourceTextContext = createContext<string | null>(null);

export function DocumentSourceTextProvider({
  sourceText,
  children,
}: {
  sourceText: string | null;
  children: React.ReactNode;
}) {
  return (
    <DocumentSourceTextContext.Provider value={sourceText}>
      {children}
    </DocumentSourceTextContext.Provider>
  );
}

export function useDocumentSourceText(): string | null {
  return useContext(DocumentSourceTextContext);
}
