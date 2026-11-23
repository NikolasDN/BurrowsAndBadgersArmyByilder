import { AfterViewInit, Directive, ElementRef, Input, NgZone, OnDestroy, inject } from '@angular/core';

/**
 * Shrinks the font size of a fixed-size box until all of its content fits,
 * so print sheets never need scrollbars. The CSS font size is the maximum;
 * the text is only made smaller when it would overflow.
 */
@Directive({
  selector: '[appFitText]',
})
export class FitTextDirective implements AfterViewInit, OnDestroy {
  /** Smallest font size (px) the text may shrink to. */
  @Input() fitTextMin = 4;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private resizeObserver?: ResizeObserver;
  private mutationObserver?: MutationObserver;
  private printQuery?: MediaQueryList;
  private frame = 0;
  private lastWidth = -1;
  private lastHeight = -1;

  private readonly refit = () => this.fit();
  private readonly scheduleFit = () => {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(this.refit);
  };

  ngAfterViewInit(): void {
    const el = this.host.nativeElement;
    el.style.overflow = 'hidden';

    this.zone.runOutsideAngular(() => {
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          // Only react to real size changes, not to the ones caused by our own font tweaks.
          if (el.clientWidth !== this.lastWidth || el.clientHeight !== this.lastHeight) {
            this.scheduleFit();
          }
        });
        this.resizeObserver.observe(el);
      }
      if (typeof MutationObserver !== 'undefined') {
        this.mutationObserver = new MutationObserver(this.scheduleFit);
        this.mutationObserver.observe(el, { childList: true, subtree: true, characterData: true });
      }
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeprint', this.refit);
        window.addEventListener('afterprint', this.refit);
        this.printQuery = window.matchMedia?.('print');
        this.printQuery?.addEventListener('change', this.refit);
      }
      void document.fonts?.ready.then(this.scheduleFit);
      this.scheduleFit();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeprint', this.refit);
      window.removeEventListener('afterprint', this.refit);
    }
    this.printQuery?.removeEventListener('change', this.refit);
  }

  private fit(): void {
    const el = this.host.nativeElement;
    el.style.fontSize = '';
    el.style.overflow = 'hidden';
    this.lastWidth = el.clientWidth;
    this.lastHeight = el.clientHeight;

    if (!this.overflows(el)) {
      return;
    }

    const max = parseFloat(getComputedStyle(el).fontSize) || 12;
    let lo = this.fitTextMin;
    let hi = max;
    // Binary search for the largest font size that still fits.
    for (let i = 0; i < 12 && hi - lo > 0.1; i++) {
      const mid = (lo + hi) / 2;
      el.style.fontSize = `${mid}px`;
      if (this.overflows(el)) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    el.style.fontSize = `${lo}px`;

    // If even the minimum size does not fit, never hide text: let it spill over instead.
    if (this.overflows(el)) {
      el.style.overflow = 'visible';
    }
  }

  private overflows(el: HTMLElement): boolean {
    return el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
  }
}
