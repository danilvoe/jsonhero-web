import { Schema } from "@jsonhero/json-schema-fns";
import { inferSchema } from "@jsonhero/schema-infer";
import { createContext, ReactNode, useContext, useMemo } from "react";
import invariant from "tiny-invariant";
import { isLargeDocument } from "~/uploadLimits";
import { useJson } from "./useJson";
import { useJsonDoc } from "./useJsonDoc";

const JsonSchemaContext = createContext<Schema | undefined>(undefined);

const EMPTY_SCHEMA: Schema = {};

export function JsonSchemaProvider({ children }: { children: ReactNode }) {
  const [json] = useJson();
  const { doc } = useJsonDoc();

  const jsonSchema = useMemo(() => {
    if (isLargeDocument(doc)) {
      return EMPTY_SCHEMA;
    }

    return inferSchema(json).toJSONSchema({ includeSchema: true });
  }, [doc, json]);

  return (
    <JsonSchemaContext.Provider value={jsonSchema}>
      {children}
    </JsonSchemaContext.Provider>
  );
}

export function useJsonSchema(): Schema {
  const context = useContext(JsonSchemaContext);

  invariant(context, "useJsonSchema must be used within a JsonSchemaProvider");

  return context;
}
