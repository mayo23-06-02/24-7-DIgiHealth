import React, { useRef, useEffect } from "react";
import { BiChevronLeft, BiChevronRight } from "react-icons/bi";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { Carousel as ReactCarousel } from "react-responsive-carousel";

interface CarouselProps {
  children: React.ReactNode;
  showArrows?: boolean;
  showStatus?: boolean;
  showIndicators?: boolean;
  infiniteLoop?: boolean;
  centerMode?: boolean;
  centerSlidePercentage?: number;
  slideClassName?: string;
  selectedItem?: number;
  onChange?: (index: number) => void;
  className?: string;
}

const Carousel: React.FC<CarouselProps> = ({
  children,
  showArrows = false,
  showStatus = false,
  showIndicators = false,
  infiniteLoop = false,
  centerMode = false,
  centerSlidePercentage = 100,
  slideClassName,
  selectedItem,
  onChange,
  className = "",
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (centerMode && selectedItem !== undefined && scrollRef.current) {
      const container = scrollRef.current;
      const childrenArray = Array.from(container.children) as HTMLElement[];
      const child = childrenArray[selectedItem];
      if (child) {
        container.scrollTo({
          left: child.offsetLeft,
          behavior: "smooth",
        });
      }
    }
  }, [selectedItem, centerMode]);

  if (centerMode) {
    const childrenArray = React.Children.toArray(children);
    return (
      <div className={`relative group/carousel w-full ${className}`}>
        <div
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style
            dangerouslySetInnerHTML={{
              __html: `
            .group\\/carousel ::-webkit-scrollbar { display: none; }
          `,
            }}
          />
          {childrenArray.map((child, index) => (
            <div
              key={index}
              className={`snap-start shrink-0 h-full transition-all duration-300 ${slideClassName || ""}`}
              style={slideClassName ? undefined : { width: `${centerSlidePercentage}%` }}
            >
              {child}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative group/carousel h-full ${className}`}>
      <ReactCarousel
        showArrows={false}
        showStatus={showStatus}
        showIndicators={showIndicators}
        infiniteLoop={infiniteLoop}
        swipeable={true}
        emulateTouch={true}
        centerMode={false}
        selectedItem={selectedItem}
        onChange={onChange}
        className="h-full"
        renderArrowPrev={(onClickHandler, hasPrev) =>
          showArrows &&
          hasPrev && (
            <button
              onClick={onClickHandler}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-none border border-white flex items-center justify-center text-slate-500 hover:text-primary transition-all opacity-0 group-hover/carousel:opacity-100"
            >
              <BiChevronLeft size={24} />
            </button>
          )
        }
        renderArrowNext={(onClickHandler, hasNext) =>
          showArrows &&
          hasNext && (
            <button
              onClick={onClickHandler}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-none border border-white flex items-center justify-center text-slate-500 hover:text-primary transition-all opacity-0 group-hover/carousel:opacity-100"
            >
              <BiChevronRight size={24} />
            </button>
          )
        }
      >
        {children as any}
      </ReactCarousel>
    </div>
  );
};

export default Carousel;
