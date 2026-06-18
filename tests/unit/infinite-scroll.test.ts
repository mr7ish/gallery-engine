import { InfiniteScroll } from "@gallery-engine/core";
import type { ScrollMetrics } from "@gallery-engine/core";
import { describe, expect, it, vi } from "vitest";

const createItems = (count: number): readonly string[] =>
  Array.from({ length: count }, (_, index) => `item-${String(index + 1)}`);

const createMetrics = (overrides: Partial<ScrollMetrics> = {}): ScrollMetrics => ({
  scrollTop: 0,
  clientHeight: 400,
  scrollHeight: 1_000,
  ...overrides
});

describe("InfiniteScroll", () => {
  it("loads the initial batch from the full item list", () => {
    const infiniteScroll = new InfiniteScroll({
      items: createItems(50),
      batchSize: 10
    });

    expect(infiniteScroll.getState()).toEqual({
      items: createItems(50),
      visibleItems: createItems(10),
      loadedCount: 10,
      totalCount: 50,
      hasMore: true
    });
  });

  it("loads the next batch manually and emits onLoadMore", () => {
    const onLoadMore = vi.fn();
    const infiniteScroll = new InfiniteScroll({
      items: createItems(25),
      batchSize: 10,
      onLoadMore
    });

    const state = infiniteScroll.loadMore();

    expect(state.visibleItems).toEqual(createItems(20));
    expect(state.loadedCount).toBe(20);
    expect(state.hasMore).toBe(true);
    expect(onLoadMore).toHaveBeenCalledWith(state);
  });

  it("clamps loaded count to the total item count", () => {
    const onLoadMore = vi.fn();
    const infiniteScroll = new InfiniteScroll({
      items: createItems(12),
      batchSize: 10,
      onLoadMore
    });

    const state = infiniteScroll.loadMore();
    infiniteScroll.loadMore();

    expect(state.visibleItems).toEqual(createItems(12));
    expect(state.loadedCount).toBe(12);
    expect(state.hasMore).toBe(false);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("loads more when scroll metrics are within the bottom threshold", () => {
    const infiniteScroll = new InfiniteScroll({
      items: createItems(30),
      batchSize: 10,
      threshold: 120
    });

    const state = infiniteScroll.handleScroll(
      createMetrics({
        scrollTop: 500,
        clientHeight: 400,
        scrollHeight: 1_000
      })
    );

    expect(state.loadedCount).toBe(20);
    expect(state.visibleItems).toEqual(createItems(20));
  });

  it("does not load when scroll metrics are outside the bottom threshold", () => {
    const infiniteScroll = new InfiniteScroll({
      items: createItems(30),
      batchSize: 10,
      threshold: 50
    });

    const state = infiniteScroll.handleScroll(
      createMetrics({
        scrollTop: 300,
        clientHeight: 400,
        scrollHeight: 1_000
      })
    );

    expect(state.loadedCount).toBe(10);
    expect(state.visibleItems).toEqual(createItems(10));
  });

  it("normalizes batch size, threshold, and initial count", () => {
    const infiniteScroll = new InfiniteScroll({
      items: createItems(5),
      batchSize: 0,
      threshold: -10,
      initialCount: -4
    });

    expect(infiniteScroll.getState().loadedCount).toBe(1);

    const state = infiniteScroll.handleScroll(
      createMetrics({
        scrollTop: 599,
        clientHeight: 400,
        scrollHeight: 1_000
      })
    );

    expect(state.loadedCount).toBe(1);
  });

  it("updates item lists and resets loaded ranges", () => {
    const infiniteScroll = new InfiniteScroll({
      items: createItems(30),
      batchSize: 10
    });

    infiniteScroll.loadMore();

    expect(infiniteScroll.updateItems(createItems(12)).loadedCount).toBe(12);
    expect(infiniteScroll.updateItems([])).toEqual({
      items: [],
      visibleItems: [],
      loadedCount: 0,
      totalCount: 0,
      hasMore: false
    });
    expect(infiniteScroll.updateItems(createItems(5)).loadedCount).toBe(5);
    expect(infiniteScroll.reset(2).visibleItems).toEqual(["item-1", "item-2"]);
  });

  it("enforces scroll metric shape at compile time", () => {
    const infiniteScroll = new InfiniteScroll({
      items: createItems(5)
    });

    // @ts-expect-error Metrics must include scrollHeight.
    infiniteScroll.handleScroll({
      scrollTop: 0,
      clientHeight: 400
    });
  });
});
