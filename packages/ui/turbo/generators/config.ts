import type { PlopTypes } from "@turbo/gen";

/**
 * `turbo gen component` — scaffolds a new @repo/ui component in the atomic-design
 * structure: src/<layer>/<Name>/<Name>.tsx + index.ts, and registers it in the
 * layer barrel (src/<layer>/index.ts) at the // __INJECT_COMPONENT_EXPORT__ marker.
 *
 * Run from the package:  pnpm --filter @repo/ui gen        (then pick "component")
 * Or from anywhere:      turbo gen component
 */
export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator("component", {
    description: "New @repo/ui component (atoms / molecules / organisms)",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "Component name in PascalCase (e.g. Tooltip, SearchBar):",
        validate: (input: string) =>
          /^[A-Z][A-Za-z0-9]*$/.test(input) ||
          "Use PascalCase with no spaces, e.g. SearchBar",
      },
      {
        type: "list",
        name: "layer",
        message: "Atomic layer:",
        choices: [
          { name: "atom — indivisible primitive (Button, Input, Badge)", value: "atoms" },
          {
            name: "molecule — small combination of atoms (FormField, SearchBar)",
            value: "molecules",
          },
          {
            name: "organism — larger self-contained block (Header, DataTable)",
            value: "organisms",
          },
        ],
      },
    ],
    actions: [
      {
        type: "add",
        path: "src/{{layer}}/{{pascalCase name}}/{{pascalCase name}}.tsx",
        templateFile: "templates/component.tsx.hbs",
      },
      {
        type: "add",
        path: "src/{{layer}}/{{pascalCase name}}/index.ts",
        templateFile: "templates/index.ts.hbs",
      },
      {
        type: "append",
        path: "src/{{layer}}/index.ts",
        pattern: /\/\/ __INJECT_COMPONENT_EXPORT__.*\n/,
        template: 'export * from "./{{pascalCase name}}";\n',
        separator: "",
        unique: true,
      },
    ],
  });
}
