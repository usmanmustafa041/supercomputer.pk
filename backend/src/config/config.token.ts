/**
 * Injection token for the parsed configuration.
 *
 * A symbol rather than a string so two modules cannot register the same name by
 * accident and silently shadow one another.
 */
export const APP_CONFIG = Symbol("APP_CONFIG");
