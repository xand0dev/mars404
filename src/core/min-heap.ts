/** Бінарна купа клітинок за (priority, g, index) — tie-break SPEC §7.3: менше g, потім менший індекс. */
export class MinHeap {
  private priorities: number[] = [];
  private costs: number[] = [];
  private cells: number[] = [];

  get size(): number {
    return this.cells.length;
  }

  push(priority: number, cost: number, cell: number): void {
    this.priorities.push(priority);
    this.costs.push(cost);
    this.cells.push(cell);
    this.siftUp(this.cells.length - 1);
  }

  /** Знімає вершину; купа має бути непорожньою. */
  pop(): { cost: number; cell: number } {
    const top = { cost: this.costs[0]!, cell: this.cells[0]! };
    const last = this.cells.length - 1;
    this.swap(0, last);
    this.priorities.pop();
    this.costs.pop();
    this.cells.pop();
    this.siftDown(0);
    return top;
  }

  private less(a: number, b: number): boolean {
    const pa = this.priorities[a]!;
    const pb = this.priorities[b]!;
    if (pa !== pb) return pa < pb;
    const ca = this.costs[a]!;
    const cb = this.costs[b]!;
    if (ca !== cb) return ca < cb;
    return this.cells[a]! < this.cells[b]!;
  }

  private swap(a: number, b: number): void {
    for (const arr of [this.priorities, this.costs, this.cells]) {
      const t = arr[a]!;
      arr[a] = arr[b]!;
      arr[b] = t;
    }
  }

  private siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(i, parent)) return;
      this.swap(i, parent);
      i = parent;
    }
  }

  private siftDown(i: number): void {
    const n = this.cells.length;
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let smallest = i;
      if (left < n && this.less(left, smallest)) smallest = left;
      if (right < n && this.less(right, smallest)) smallest = right;
      if (smallest === i) return;
      this.swap(i, smallest);
      i = smallest;
    }
  }
}
