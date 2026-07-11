import React from 'react';
import PollView from '../poll/PollView';
import SurveyView from '../survey/SurveyView';
import WordCloudView from '../wordcloud/WordCloudView';

// Given a presentation slide, render the right interactive component.
// This is the "strategy pattern" front-end factory from the spec: one place
// maps a slide `type` to its renderer, instead of branching everywhere.
function SlideRenderer({ slide }) {
  if (!slide) return null;

  switch (slide.type) {
    case 'info':
      return (
        <div className="py-10 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slateink sm:text-4xl">
            {slide.config?.heading}
          </h2>
          {slide.config?.body && (
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">{slide.config.body}</p>
          )}
        </div>
      );
    case 'poll':
      return <PollView embedId={slide.refId} embedded />;
    case 'word_cloud':
      return <WordCloudView embedId={slide.refId} embedded />;
    case 'survey':
      return <SurveyView embedId={slide.refId} embedded />;
    default:
      return <p className="py-10 text-center text-slate-400">Unknown slide type.</p>;
  }
}

export default SlideRenderer;
