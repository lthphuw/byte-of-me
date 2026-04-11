export type NextIntlRawTranslator = {
  raw: (key: string) => string;
};

export type TranslatorFunc = (sourceText: string) => string;

export type ServerTranslator = Promise<TranslatorFunc>;
