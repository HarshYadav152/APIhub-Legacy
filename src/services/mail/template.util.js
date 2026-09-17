import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "templates");

const cache = new Map();

/**
 * Deliberately minimal — a `{{TOKEN}}` replace, not a templating engine.
 * The email content here is simple enough that pulling in a dependency
 * (handlebars, ejs, etc.) for it would be more machinery than the problem
 * needs; this just gets the markup out of the JS file it used to be
 * inlined in.
 */
export const renderTemplate = async (templateName, variables = {}) => {
    let template = cache.get(templateName);

    if (!template) {
        template = await fs.readFile(path.join(TEMPLATES_DIR, templateName), "utf-8");
        cache.set(templateName, template);
    }

    return Object.entries(variables).reduce(
        (html, [key, value]) => html.replaceAll(`{{${key}}}`, String(value)),
        template
    );
};
