import { LLMModelName } from '@ai/types/llm';
import { llm as gemini20flash } from '@ai/infra/llm/gemini-2.0-flash';
import { llm as gemini20flashlite } from '@ai/infra/llm/gemini-2.0-flash-lite';
import { LLMModel } from '@ai/enums/llm';

export const getLLM = (model: LLMModelName) => {
  switch (model) {
    case LLMModel.Gemini20Flash:
      return gemini20flash;
    case LLMModel.Gemini20FlashLite:
      return gemini20flashlite;
    default:
      return gemini20flash;
  }
};
