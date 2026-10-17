import { useState } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from './carousel';

afterEach(cleanup);

function Harness({ setApi }: { setApi: (api: CarouselApi) => void }) {
  const [renders, setRenders] = useState(0);

  return (
    <>
      <button onClick={() => setRenders((n) => n + 1)}>
        rerender {renders}
      </button>
      <Carousel setApi={(api) => setApi(api)}>
        <CarouselContent>
          <CarouselItem>one</CarouselItem>
          <CarouselItem>two</CarouselItem>
        </CarouselContent>
      </Carousel>
    </>
  );
}

describe('Carousel setApi', () => {
  it('is called once per api, so a listener added there does not stack across re-renders', async () => {
    let selects = 0;
    let carouselApi: CarouselApi;

    // The caller's `setApi` is a new function on every render, and subscribes.
    render(
      <Harness
        setApi={(api) => {
          carouselApi = api;
          api?.on('select', () => selects++);
        }}
      />
    );
    await waitFor(() => expect(carouselApi).toBeDefined());

    for (let i = 0; i < 3; i++) {
      act(() => screen.getByRole('button').click());
    }
    act(() => {
      carouselApi?.emit('select');
    });

    expect(selects).toBe(1);
  });
});

describe('Carousel arrow keys', () => {
  function withField() {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>
            <input aria-label="caption" />
            <video aria-label="clip" controls />
          </CarouselItem>
          <CarouselItem>two</CarouselItem>
        </CarouselContent>
      </Carousel>
    );
  }

  it('claims an arrow key pressed on the carousel itself', () => {
    withField();

    const claimed = !fireEvent.keyDown(screen.getByRole('region'), {
      key: 'ArrowRight',
    });

    expect(claimed).toBe(true);
  });

  it('leaves an arrow key to a text field inside a slide', () => {
    withField();

    const claimed = !fireEvent.keyDown(screen.getByLabelText('caption'), {
      key: 'ArrowRight',
    });

    expect(claimed).toBe(false);
  });

  it("leaves an arrow key to a video's own controls", () => {
    withField();

    const claimed = !fireEvent.keyDown(screen.getByLabelText('clip'), {
      key: 'ArrowLeft',
    });

    expect(claimed).toBe(false);
  });
});
