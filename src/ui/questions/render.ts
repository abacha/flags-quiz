import type { Answer } from '../../engine/answer';
import type { Question } from '../../engine/question';
import { CONTINENT_FROM } from '../labels';
import { cropFigure, flagFigure, renderFlagChoices, renderNameChoices } from './choices';
import { renderPairs } from './pairs';
import { renderTrueFalse } from './trueFalse';
import { renderTypeName } from './typeName';
import { renderTypeSimilar } from './typeSimilar';

export type Submit = (answer: Answer) => void;

export function renderQuestion(question: Question, submit: Submit): HTMLElement {
  switch (question.format) {
    case 'nameToFlags':
      return renderFlagChoices(`Qual é a bandeira de ${question.target.name}?`, question.options, submit);
    case 'flagToNames':
    case 'flagToTwoNames':
      return renderNameChoices('De onde é esta bandeira?', flagFigure(question.target), question.options, submit);
    case 'crop':
      return renderNameChoices('De onde é este pedaço de bandeira?', cropFigure(question.target, question.crop), question.options, submit);
    case 'trueFalse':
      return renderTrueFalse(question.target, question.shown, submit);
    case 'typeName':
      return renderTypeName('Escreva o nome desta bandeira', flagFigure(question.target), submit);
    case 'typeSimilar':
      return renderTypeSimilar(question.countries, submit);
    case 'matchPairs':
      return renderPairs('Ligue cada nome à sua bandeira', question.countries, submit);
    case 'sortSimilar':
      return renderPairs('Bandeiras parecidas: ligue cada nome à sua bandeira', question.countries, submit);
    case 'sortSimilarNames':
      return renderPairs('Nomes parecidos: ligue cada nome à sua bandeira', question.countries, submit);
    case 'oddOneOut':
      return renderFlagChoices(`Qual destas bandeiras não é ${CONTINENT_FROM[question.target.continent]}?`, question.options, submit);
  }
}
