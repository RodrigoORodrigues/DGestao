import React, { useRef, useState, useEffect } from "react";

export default function DoubleScrollWrapper({ children, className = "", style = {} }) {
  const topScrollRef = useRef(null);
  const bottomScrollRef = useRef(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [verticalScrollbarWidth, setVerticalScrollbarWidth] = useState(0);
  const [needsScroll, setNeedsScroll] = useState(false);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const updateDimensions = () => {
      if (bottomScrollRef.current) {
        const sw = bottomScrollRef.current.scrollWidth;
        const cw = bottomScrollRef.current.clientWidth;
        const ow = bottomScrollRef.current.offsetWidth;
        const vSw = Math.max(0, ow - cw);

        setScrollWidth(sw);
        setVerticalScrollbarWidth(vSw);
        setNeedsScroll(sw > cw + 1);
      }
    };

    updateDimensions();

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined" && bottomScrollRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateDimensions();
      });
      resizeObserver.observe(bottomScrollRef.current);
      if (bottomScrollRef.current.firstElementChild) {
        resizeObserver.observe(bottomScrollRef.current.firstElementChild);
      }
    }

    window.addEventListener("resize", updateDimensions);
    return () => {
      window.removeEventListener("resize", updateDimensions);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [children]);

  const handleTopScroll = () => {
    if (isSyncingRef.current) return;
    if (topScrollRef.current && bottomScrollRef.current) {
      isSyncingRef.current = true;
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    }
  };

  const handleBottomScroll = () => {
    if (isSyncingRef.current) return;
    if (topScrollRef.current && bottomScrollRef.current) {
      isSyncingRef.current = true;
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    }
  };

  return (
    <div className="w-full flex flex-col min-w-0">
      {needsScroll && (
        <div
          ref={topScrollRef}
          onScroll={handleTopScroll}
          className="overflow-x-auto overflow-y-hidden w-full h-[14px] min-h-[14px] bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-700/80 transition-colors duration-200 shrink-0 rounded-t-lg"
          style={{ paddingRight: `${verticalScrollbarWidth}px` }}
        >
          <div style={{ width: `${scrollWidth}px`, height: "1px" }} />
        </div>
      )}
      <div
        ref={bottomScrollRef}
        onScroll={handleBottomScroll}
        className={`overflow-x-auto w-full ${className}`}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}
